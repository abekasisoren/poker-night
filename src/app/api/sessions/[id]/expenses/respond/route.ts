export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/sessions/[id]/expenses/respond
 * Body: { player_id, drank_whiskey: boolean, food_order_ids: string[] }
 *
 * Player submits their answers. Idempotent — safe to call multiple times.
 * - Upserts a record in expense_responses (marks them as answered)
 * - Syncs whiskey_drinkers row
 * - Syncs food_participants rows for the provided order IDs
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { player_id, drank_whiskey, food_order_ids = [] } = await req.json()

  if (!player_id || drank_whiskey === undefined) {
    return NextResponse.json({ error: 'player_id and drank_whiskey required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const sessionId = params.id

  // 1. Upsert expense_responses
  const { error: respErr } = await supabase
    .from('expense_responses')
    .upsert(
      { session_id: sessionId, player_id, answered_at: new Date().toISOString() },
      { onConflict: 'session_id,player_id' }
    )
  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  // 2. Sync whiskey_drinkers
  if (drank_whiskey) {
    await supabase
      .from('whiskey_drinkers')
      .upsert({ session_id: sessionId, player_id }, { onConflict: 'session_id,player_id' })
  } else {
    await supabase
      .from('whiskey_drinkers')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', player_id)
  }

  // 3. Sync food_participants:
  //    Remove all existing participations for this player in this session's orders
  const { data: sessionOrders } = await supabase
    .from('food_orders')
    .select('id')
    .eq('session_id', sessionId)

  const sessionOrderIds = (sessionOrders ?? []).map((o: { id: string }) => o.id)

  if (sessionOrderIds.length > 0) {
    await supabase
      .from('food_participants')
      .delete()
      .in('food_order_id', sessionOrderIds)
      .eq('player_id', player_id)
  }

  // Insert new participations
  if (food_order_ids.length > 0) {
    const toInsert = food_order_ids
      .filter((id: string) => sessionOrderIds.includes(id))
      .map((food_order_id: string) => ({ food_order_id, player_id }))

    if (toInsert.length > 0) {
      await supabase.from('food_participants').insert(toInsert)
    }
  }

  return NextResponse.json({ ok: true })
}
