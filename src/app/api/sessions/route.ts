export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/pin'
import { sendWhatsAppBulk, msgSessionCreated } from '@/lib/whatsapp'
import { formatDate, formatTime } from '@/lib/utils'

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
  const { date, start_time, location, host_id, notes, host_has_whiskey, host_has_chips, pin } = body

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
      host_has_chips: host_has_chips ?? null,
    })
    .select('*, host:players!host_id(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── WhatsApp: notify all players a game has been created ──────────────────
  try {
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name, phone')
    if (allPlayers?.length) {
      const hostName = (data.host as { name: string } | null)?.name ?? 'TBD'
      const msg = msgSessionCreated({
        date: formatDate(date),
        time: formatTime(start_time),
        location,
        host: hostName,
        sessionId: data.id,
      })
      // Don't await — fire and forget so response isn't delayed
      sendWhatsAppBulk(allPlayers, msg)
    }
  } catch (e) {
    console.error('WA session-created error:', e)
  }

  return NextResponse.json(data, { status: 201 })
}
