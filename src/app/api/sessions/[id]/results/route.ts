import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/pin'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('results')
    .select('*, player:players(id, name)')
    .eq('session_id', params.id)
    .order('amount', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { results, pin } = body

  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'No results provided' }, { status: 400 })
  }

  // Zero-sum validation
  const total = results.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
  if (Math.abs(total) > 0.02) {
    return NextResponse.json(
      { error: `Results don't balance. Off by ${total.toFixed(2)}` },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  // Upsert all results
  const rows = results.map((r: { player_id: string; amount: number }) => ({
    session_id: params.id,
    player_id: r.player_id,
    amount: r.amount,
    entered_at: new Date().toISOString(),
  }))

  const { error: rErr } = await supabase
    .from('results')
    .upsert(rows, { onConflict: 'session_id,player_id' })

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  // Mark session as completed
  await supabase.from('sessions').update({ status: 'completed' }).eq('id', params.id)

  return NextResponse.json({ ok: true })
}
