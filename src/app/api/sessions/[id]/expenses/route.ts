export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/sessions/[id]/expenses
 * Returns all expense data for a session.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const sessionId = params.id

  const [whiskeyContribs, whiskeyDrinkers, foodOrders, responses, debts] = await Promise.all([
    supabase
      .from('whiskey_contributions')
      .select('*, player:players!player_id(id, name)')
      .eq('session_id', sessionId)
      .order('created_at'),

    supabase
      .from('whiskey_drinkers')
      .select('*, player:players!player_id(id, name)')
      .eq('session_id', sessionId)
      .order('created_at'),

    supabase
      .from('food_orders')
      .select(`
        *,
        orderer:players!ordered_by(id, name),
        participants:food_participants(
          id, food_order_id, player_id, created_at,
          player:players!player_id(id, name)
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at'),

    supabase
      .from('expense_responses')
      .select('*, player:players!player_id(id, name)')
      .eq('session_id', sessionId)
      .order('answered_at'),

    supabase
      .from('expense_debts')
      .select(`
        *,
        from_player:players!from_player_id(id, name),
        to_player:players!to_player_id(id, name)
      `)
      .eq('session_id', sessionId)
      .order('created_at'),
  ])

  for (const q of [whiskeyContribs, whiskeyDrinkers, foodOrders, responses, debts]) {
    if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 })
  }

  return NextResponse.json({
    whiskey_contributions: whiskeyContribs.data ?? [],
    whiskey_drinkers: whiskeyDrinkers.data ?? [],
    food_orders: foodOrders.data ?? [],
    responses: responses.data ?? [],
    debts: debts.data ?? [],
  })
}
