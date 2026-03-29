export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/sessions/[id]/expenses/food
 * All food orders for this session with participants
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('food_orders')
    .select(`
      *,
      orderer:players!ordered_by(id, name),
      participants:food_participants(
        id, food_order_id, player_id, created_at,
        player:players!player_id(id, name)
      )
    `)
    .eq('session_id', params.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * POST /api/sessions/[id]/expenses/food
 * Body: { ordered_by, food_type, description?, total_cost }
 * Create a food order (no PIN — the person who ordered enters it)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { ordered_by, food_type, description, total_cost } = body

  if (!ordered_by || !food_type || total_cost == null) {
    return NextResponse.json({ error: 'ordered_by, food_type, total_cost required' }, { status: 400 })
  }

  const validTypes = ['pizza', 'sushi', 'hamburger', 'fried_chicken']
  if (!validTypes.includes(food_type)) {
    return NextResponse.json({ error: 'Invalid food_type' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('food_orders')
    .insert({
      session_id: params.id,
      ordered_by,
      food_type,
      description: description || null,
      total_cost: Number(total_cost),
    })
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
  return NextResponse.json(data, { status: 201 })
}
