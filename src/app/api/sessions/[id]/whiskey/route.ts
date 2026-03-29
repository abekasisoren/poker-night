import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** GET /api/sessions/[id]/whiskey — list who's bringing whiskey */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('whiskey_contributions')
    .select('*, player:players(id, name)')
    .eq('session_id', params.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/** POST /api/sessions/[id]/whiskey — volunteer to bring whiskey */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { player_id, bottles, price_per_bottle } = await req.json()

  if (!player_id || !bottles) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('whiskey_contributions')
    .insert({
      session_id: params.id,
      player_id,
      bottles: Number(bottles),
      price_per_bottle: price_per_bottle ? Number(price_per_bottle) : null,
    })
    .select('*, player:players(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
