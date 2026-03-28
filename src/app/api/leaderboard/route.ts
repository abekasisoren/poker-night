export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'all'

  if (scope === 'all') {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Last N sessions scope
  const limit = parseInt(scope) || 10
  const { data: sessions, error: sErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(limit)

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const sessionIds = (sessions ?? []).map((s) => s.id)
  if (sessionIds.length === 0) return NextResponse.json([])

  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id, name')
    .order('name')

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { data: results, error: rErr } = await supabase
    .from('results')
    .select('player_id, amount')
    .in('session_id', sessionIds)

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const stats = (players ?? []).map((p) => {
    const playerResults = (results ?? []).filter((r) => r.player_id === p.id)
    const amounts = playerResults.map((r) => Number(r.amount))
    const total = amounts.reduce((a, b) => a + b, 0)
    return {
      player_id: p.id,
      player_name: p.name,
      sessions_played: amounts.length,
      total_net: total,
      best_night: amounts.length ? Math.max(...amounts) : 0,
      worst_night: amounts.length ? Math.min(...amounts) : 0,
      avg_per_session: amounts.length ? total / amounts.length : 0,
      winning_sessions: amounts.filter((a) => a > 0).length,
      losing_sessions: amounts.filter((a) => a < 0).length,
    }
  })

  stats.sort((a, b) => b.total_net - a.total_net)
  return NextResponse.json(stats)
}
