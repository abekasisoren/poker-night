export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/pin'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'all'

  let query = supabase
    .from('sessions')
    .select('*, host:players!host_id(id, name)')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, start_time, location, host_id, notes, host_has_whiskey, pin } = body

  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }
  if (!date || !start_time || !location || !host_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      date,
      start_time,
      location,
      host_id,
      notes: notes || null,
      host_has_whiskey: host_has_whiskey ?? null,
    })
    .select('*, host:players!host_id(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
