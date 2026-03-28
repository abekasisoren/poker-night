import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  // Get all players
  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('*')
    .order('name')

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // Get existing RSVPs for this session
  const { data: rsvps, error: rErr } = await supabase
    .from('rsvps')
    .select('*')
    .eq('session_id', params.id)

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const rsvpMap = new Map((rsvps ?? []).map((r) => [r.player_id, r]))

  // Merge: every player gets a response (default 'pending')
  const merged = (players ?? []).map((p) => ({
    player_id: p.id,
    player: p,
    session_id: params.id,
    response: rsvpMap.get(p.id)?.response ?? 'pending',
    id: rsvpMap.get(p.id)?.id ?? null,
    updated_at: rsvpMap.get(p.id)?.updated_at ?? null,
  }))

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { player_id, response } = await req.json()

  if (!player_id || !response) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('rsvps')
    .upsert(
      { session_id: params.id, player_id, response, updated_at: new Date().toISOString() },
      { onConflict: 'session_id,player_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
