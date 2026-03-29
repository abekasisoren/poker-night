export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PATCH /api/sessions/[id]/expenses/food/[orderId]
 * Body: { description?, total_cost? }
 * Update a food order (orderer can edit their own)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.description !== undefined) updates.description = body.description || null
  if (body.total_cost !== undefined) updates.total_cost = Number(body.total_cost)

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('food_orders')
    .update(updates)
    .eq('id', params.orderId)
    .eq('session_id', params.id)
    .select(`
      *,
      orderer:players!ordered_by(id, name),
      participants:food_participants(
        id, food_order_id, player_id, created_at,
        player:players!player_id(id, name)
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/sessions/[id]/expenses/food/[orderId]
 * Delete a food order (cascades participants)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('food_orders')
    .delete()
    .eq('id', params.orderId)
    .eq('session_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
