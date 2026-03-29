export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/sessions/[id]/expenses
 * Returns all expense data for a session:
 *   - whiskey contributions (who brought + cost)
 *   - whiskey drinkers (who drank)
 *   - food orders (what was ordered, by whom, cost, who ate)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const sessionId = params.id

  const [whiskeyContribs, whiskeyDrinkers, foodOrders] = await Promise.all([
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
  ])

  if (whiskeyContribs.error)
    return NextResponse.json({ error: whiskeyContribs.error.message }, { status: 500 })
  if (whiskeyDrinkers.error)
    return NextResponse.json({ error: whiskeyDrinkers.error.message }, { status: 500 })
  if (foodOrders.error)
    return NextResponse.json({ error: foodOrders.error.message }, { status: 500 })

  return NextResponse.json({
    whiskey_contributions: whiskeyContribs.data ?? [],
    whiskey_drinkers: whiskeyDrinkers.data ?? [],
    food_orders: foodOrders.data ?? [],
  })
}
