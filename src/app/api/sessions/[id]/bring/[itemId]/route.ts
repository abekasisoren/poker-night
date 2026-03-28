import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/pin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const body = await req.json()
  const { pin, ...fields } = body

  // PIN only required for reassigning/editing, not for claiming
  const isClaimOnly = Object.keys(fields).length === 1 && 'is_claimed' in fields
  if (!isClaimOnly && pin && !verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('bring_items')
    .update(fields)
    .eq('id', params.itemId)
    .eq('session_id', params.id)
    .select('*, player:players(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const { pin } = await req.json()
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('bring_items')
    .delete()
    .eq('id', params.itemId)
    .eq('session_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
