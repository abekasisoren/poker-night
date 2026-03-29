import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns how many times each player has brought each item across all sessions.
// Used by the auto-assign feature to rotate items fairly.
// GET /api/bring/fairness?players=id1,id2,...
export async function GET(req: NextRequest) {
  const playerIdsParam = req.nextUrl.searchParams.get('players')
  if (!playerIdsParam) return NextResponse.json({})

  const playerIds = playerIdsParam.split(',').filter(Boolean)
  if (playerIds.length === 0) return NextResponse.json({})

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('bring_items')
    .select('player_id, item')
    .in('player_id', playerIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build count map: { playerId: { itemName: count } }
  const counts: Record<string, Record<string, number>> = {}
  for (const row of (data ?? [])) {
    if (!counts[row.player_id]) counts[row.player_id] = {}
    counts[row.player_id][row.item] = (counts[row.player_id][row.item] ?? 0) + 1
  }

  return NextResponse.json(counts)
}
