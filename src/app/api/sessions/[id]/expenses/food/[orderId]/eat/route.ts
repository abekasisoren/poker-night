export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/sessions/[id]/expenses/food/[orderId]/eat
 * Body: { player_id }
 * Toggle a player as having eaten from this food order.
 * If already a participant → remove. Otherwise → add.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  const { player_id } = await req.json()
  if (!player_id) {
    return NextResponse.json({ error: 'player_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verify food order belongs to this session
  const { data: order } = await supabase
    .from('food_orders')
    .select('id')
    .eq('id', params.orderId)
    .eq('session_id', params.id)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Check existing participation
  const { data: existing } = await supabase
    .from('food_participants')
    .select('id')
    .eq('food_order_id', params.orderId)
    .eq('player_id', player_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('food_participants')
      .delete()
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action: 'removed' })
  } else {
    const { data, error } = await supabase
      .from('food_participants')
      .insert({ food_order_id: params.orderId, player_id })
      .select('*, player:players!player_id(id, name)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action: 'added', participant: data })
  }
}
