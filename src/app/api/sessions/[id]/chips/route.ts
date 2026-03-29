import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** GET /api/sessions/[id]/chips — list who's bringing the chips */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('chips_volunteers')
    .select('*, player:players(id, name)')
    .eq('session_id', params.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/** POST /api/sessions/[id]/chips — volunteer to bring chips & kit */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { player_id } = await req.json()

  if (!player_id) {
    return NextResponse.json({ error: 'Missing player_id' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('chips_volunteers')
    .insert({
      session_id: params.id,
      player_id,
    })
    .select('*, player:players(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
