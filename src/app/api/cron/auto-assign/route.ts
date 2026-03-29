import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Constants (must match BringList.tsx) ────────────────────────────────────
type BringCategory = 'food' | 'drinks' | 'equipment' | 'other'

const PREMIUM_SLOTS: { item: string; category: BringCategory }[] = [
  { item: 'Nuts', category: 'food' },
  { item: 'Nuts', category: 'food' },
  { item: 'Fruit', category: 'food' },
  { item: 'Coke (6-pack)', category: 'drinks' },
]
const ICE_SLOT = { item: 'Ice (bag)', category: 'other' as BringCategory }
const BEER_SLOT = { item: 'Beer (6-pack)', category: 'drinks' as BringCategory }
const ICE_MACHINE_HOST = 'Oren'
const AUTO_ASSIGN_AFTER_HOURS = 72

// ── Fair assignment (mirrors BringList.tsx fairAssign) ───────────────────────
interface Player { id: string; name: string }

function fairAssign(
  players: Player[],
  history: Record<string, Record<string, number>>,
  includeIce: boolean,
  seed: number
): { player_id: string; item: string; category: BringCategory }[] {
  const result: { player_id: string; item: string; category: BringCategory }[] = []
  const assigned = new Set<string>()

  const slots = includeIce
    ? [...PREMIUM_SLOTS, ICE_SLOT, ICE_SLOT]
    : [...PREMIUM_SLOTS]

  for (const slot of slots) {
    const available = players.filter((p) => !assigned.has(p.id))
    if (available.length === 0) break

    const sorted = [...available].sort((a, b) => {
      const ca = history[a.id]?.[slot.item] ?? 0
      const cb = history[b.id]?.[slot.item] ?? 0
      if (ca !== cb) return ca - cb
      return ((a.id.charCodeAt(0) + seed) % 100) - ((b.id.charCodeAt(0) + seed) % 100)
    })

    const winner = sorted[0]
    assigned.add(winner.id)
    result.push({ player_id: winner.id, item: slot.item, category: slot.category })
  }

  for (const p of players) {
    if (!assigned.has(p.id)) {
      result.push({ player_id: p.id, item: BEER_SLOT.item, category: BEER_SLOT.category })
    }
  }

  return result
}

// ── Cron handler ─────────────────────────────────────────────────────────────
/**
 * GET /api/cron/auto-assign
 *
 * Runs on a schedule (see vercel.json).
 * For every upcoming session created ≥ 72 hours ago that has no bring items,
 * auto-assigns items to all confirmed players using fair rotation.
 *
 * Secured by the CRON_SECRET env var (Vercel injects Authorization header).
 */
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (env var CRON_SECRET set in Vercel dashboard)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServerClient()
  const cutoffMs = AUTO_ASSIGN_AFTER_HOURS * 60 * 60 * 1000
  const cutoffTime = new Date(Date.now() - cutoffMs).toISOString()

  // Fetch all upcoming sessions old enough to trigger auto-assign
  const { data: sessions, error: sessError } = await supabase
    .from('sessions')
    .select('*, host:players!host_id(id, name)')
    .eq('status', 'upcoming')
    .lt('created_at', cutoffTime) // created more than 72h ago

  if (sessError) return NextResponse.json({ error: sessError.message }, { status: 500 })

  const results: Record<string, unknown>[] = []

  for (const session of sessions ?? []) {
    // Skip if bring items already exist
    const { data: existingItems } = await supabase
      .from('bring_items')
      .select('id')
      .eq('session_id', session.id)
      .limit(1)

    if (existingItems && existingItems.length > 0) {
      results.push({ session_id: session.id, skipped: 'already_assigned' })
      continue
    }

    // Fetch confirmed RSVPs for this session
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('player_id, player:players(id, name), response')
      .eq('session_id', session.id)
      .eq('response', 'yes')

    // Deduplicate confirmed players
    const seen = new Set<string>()
    const confirmed: Player[] = []
    for (const r of rsvps ?? []) {
      const p = (Array.isArray(r.player) ? r.player[0] : r.player) as Player | null
      if (p && !seen.has(p.id)) {
        seen.add(p.id)
        confirmed.push(p)
      }
    }

    if (confirmed.length === 0) {
      results.push({ session_id: session.id, skipped: 'no_confirmed_players' })
      continue
    }

    // Fetch bring history for fair rotation
    const ids = confirmed.map((p) => p.id)
    const { data: histData } = await supabase
      .from('bring_items')
      .select('player_id, item')
      .in('player_id', ids)

    const history: Record<string, Record<string, number>> = {}
    for (const row of histData ?? []) {
      if (!history[row.player_id]) history[row.player_id] = {}
      history[row.player_id][row.item] = (history[row.player_id][row.item] ?? 0) + 1
    }

    // Determine whether ice is needed (Oren has a machine — no bags needed)
    const hostName = (session.host as Player | null)?.name ?? ''
    const includeIce = hostName !== ICE_MACHINE_HOST
    const seed = Math.floor(Math.random() * 10000)

    const assignments = fairAssign(confirmed, history, includeIce, seed)

    // Insert assignments
    const { data: inserted, error: insertError } = await supabase
      .from('bring_items')
      .insert(
        assignments.map((a) => ({
          session_id: session.id,
          player_id: a.player_id,
          item: a.item,
          category: a.category,
        }))
      )
      .select()

    if (insertError) {
      results.push({ session_id: session.id, error: insertError.message })
      continue
    }

    results.push({
      session_id: session.id,
      assigned: inserted?.length ?? 0,
      ice: includeIce,
      players: confirmed.length,
    })
  }

  return NextResponse.json({ ok: true, processed: results })
}
