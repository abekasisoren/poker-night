export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_PIN = process.env.ADMIN_PIN ?? '1234'

/**
 * POST /api/sessions/[id]/expenses/settle
 * Body: { pin, action: 'collect' | 'finalize' }
 *
 * 'collect'  → sets expense_status = 'collecting' (End Session pressed)
 * 'finalize' → computes settlement, writes expense_debts, sets status = 'settled'
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { pin, action } = await req.json()

  if (pin !== VALID_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })
  }
  if (action !== 'collect' && action !== 'finalize') {
    return NextResponse.json({ error: 'action must be collect or finalize' }, { status: 400 })
  }

  const supabase = createServerClient()
  const sessionId = params.id

  if (action === 'collect') {
    const { error } = await supabase
      .from('sessions')
      .update({ expense_status: 'collecting' })
      .eq('id', sessionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, expense_status: 'collecting' })
  }

  // action === 'finalize' — compute settlement and lock it
  const [whiskeyContribs, whiskeyDrinkers, foodOrders] = await Promise.all([
    supabase
      .from('whiskey_contributions')
      .select('*, player:players!player_id(id, name)')
      .eq('session_id', sessionId),
    supabase
      .from('whiskey_drinkers')
      .select('*, player:players!player_id(id, name)')
      .eq('session_id', sessionId),
    supabase
      .from('food_orders')
      .select(`*, orderer:players!ordered_by(id, name),
        participants:food_participants(id, food_order_id, player_id, created_at,
          player:players!player_id(id, name))`)
      .eq('session_id', sessionId),
  ])

  const debts = computeDebts(
    whiskeyContribs.data ?? [],
    whiskeyDrinkers.data ?? [],
    foodOrders.data ?? []
  )

  // Delete any previous debt records for this session
  await supabase.from('expense_debts').delete().eq('session_id', sessionId)

  // Insert new ones (only non-zero)
  if (debts.length > 0) {
    const { error: insertErr } = await supabase.from('expense_debts').insert(
      debts.map((d) => ({
        session_id: sessionId,
        from_player_id: d.from_player_id,
        to_player_id: d.to_player_id,
        amount: d.amount,
      }))
    )
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const { error } = await supabase
    .from('sessions')
    .update({ expense_status: 'settled' })
    .eq('id', sessionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, expense_status: 'settled', debts })
}

// ── Settlement engine (same logic as ExpensesTab) ────────────────────────────

interface WC { player_id: string; player?: { name: string } | null; bottles: number; price_per_bottle: number | null }
interface WD { player_id: string; player?: { name: string } | null }
interface FP { player_id: string; player?: { name: string } | null }
interface FO { ordered_by: string; orderer?: { name: string } | null; total_cost: number; participants: FP[] }

function computeDebts(wcs: WC[], wds: WD[], fos: FO[]) {
  const balances = new Map<string, { name: string; balance: number }>()
  function ensure(id: string, name: string) {
    if (!balances.has(id)) balances.set(id, { name, balance: 0 })
  }
  function add(id: string, amount: number) { balances.get(id)!.balance += amount }

  // Whiskey
  const totalWhiskeyCost = wcs.reduce((s, c) => s + (c.price_per_bottle != null ? c.bottles * c.price_per_bottle : 0), 0)
  if (totalWhiskeyCost > 0 && wds.length > 0) {
    const perDrinker = totalWhiskeyCost / wds.length
    const pricedBottles = wcs.filter((c) => c.price_per_bottle != null).reduce((s, c) => s + c.bottles, 0)
    for (const c of wcs) {
      if (c.price_per_bottle == null || !c.player) continue
      ensure(c.player_id, c.player.name)
      add(c.player_id, (c.bottles / pricedBottles) * totalWhiskeyCost)
    }
    for (const d of wds) {
      if (!d.player) continue
      ensure(d.player_id, d.player.name)
      add(d.player_id, -perDrinker)
    }
  }

  // Food
  for (const fo of fos) {
    if (!fo.orderer || fo.participants.length === 0) continue
    const per = fo.total_cost / fo.participants.length
    ensure(fo.ordered_by, fo.orderer.name)
    add(fo.ordered_by, fo.total_cost)
    for (const p of fo.participants) {
      if (!p.player) continue
      ensure(p.player_id, p.player.name)
      add(p.player_id, -per)
    }
  }

  // Greedy settle
  const creditors: { id: string; name: string; amount: number }[] = []
  const debtors:   { id: string; name: string; amount: number }[] = []
  for (const [id, { name, balance }] of Array.from(balances.entries())) {
    if (balance > 0.01) creditors.push({ id, name, amount: balance })
    if (balance < -0.01) debtors.push({ id, name, amount: -balance })
  }
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const payments: { from_player_id: string; to_player_id: string; amount: number }[] = []
  let ci = 0, di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci], d = debtors[di]
    const amt = Math.min(c.amount, d.amount)
    if (amt > 0.01) payments.push({ from_player_id: d.id, to_player_id: c.id, amount: Math.round(amt) })
    c.amount -= amt; d.amount -= amt
    if (c.amount < 0.01) ci++
    if (d.amount < 0.01) di++
  }
  return payments
}
