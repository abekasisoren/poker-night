export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/sessions/[id]/expenses/whiskey
 * Body: { player_id: string }
 * Toggle a player as a whiskey drinker for this session.
 * If they already exist → remove. If not → add.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { player_id } = await req.json()
  if (!player_id) {
    return NextResponse.json({ error: 'player_id required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const sessionId = params.id

  // Check if already marked
  const { data: existing } = await supabase
    .from('whiskey_drinkers')
    .select('id')
    .eq('session_id', sessionId)
    .eq('player_id', player_id)
    .maybeSingle()

  if (existing) {
    // Remove
    const { error } = await supabase
      .from('whiskey_drinkers')
      .delete()
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action: 'removed' })
  } else {
    // Add
    const { data, error } = await supabase
      .from('whiskey_drinkers')
      .insert({ session_id: sessionId, player_id })
      .select('*, player:players!player_id(id, name)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action: 'added', drinker: data })
  }
}
