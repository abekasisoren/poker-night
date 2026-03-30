import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/pin'
import { sendWhatsAppBulk, msgWhiskeyNeeded, msgChipsNeeded } from '@/lib/whatsapp'
import { formatDate } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*, host:players!host_id(id, name)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { pin, ...fields } = body

  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Fetch current session to detect supply-status changes
  const { data: before } = await supabase
    .from('sessions')
    .select('date, host_id, host_has_whiskey, host_has_chips, host:players!host_id(id, name)')
    .eq('id', params.id)
    .single()

  const { data, error } = await supabase
    .from('sessions')
    .update(fields)
    .eq('id', params.id)
    .select('*, host:players!host_id(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── WhatsApp: notify confirmed players if supply just turned to "needed" ──
  try {
    const wasWhiskey = (before as { host_has_whiskey?: boolean | null } | null)?.host_has_whiskey
    const isWhiskey  = fields.host_has_whiskey
    const wasChips   = (before as { host_has_chips?: boolean | null } | null)?.host_has_chips
    const isChips    = fields.host_has_chips
    const hostName   = (data.host as { name: string } | null)?.name ?? 'Host'
    const dateStr    = formatDate(before?.date ?? data.date)

    // Only fire WA when admin explicitly sets to false (just switched to "needed")
    if (isWhiskey === false && wasWhiskey !== false) {
      const { data: confirmed } = await supabase
        .from('rsvps')
        .select('player:players!player_id(id, name, phone)')
        .eq('session_id', params.id)
        .eq('response', 'yes')
      const players = (confirmed ?? [])
        .map((r: { player: unknown }) => r.player as { id: string; name: string; phone: string | null })
        .filter((p) => p.id !== before?.host_id)
      sendWhatsAppBulk(players, msgWhiskeyNeeded({ date: dateStr, host: hostName, sessionId: params.id }))
    }
    if (isChips === false && wasChips !== false) {
      const { data: confirmed } = await supabase
        .from('rsvps')
        .select('player:players!player_id(id, name, phone)')
        .eq('session_id', params.id)
        .eq('response', 'yes')
      const players = (confirmed ?? [])
        .map((r: { player: unknown }) => r.player as { id: string; name: string; phone: string | null })
        .filter((p) => p.id !== before?.host_id)
      sendWhatsAppBulk(players, msgChipsNeeded({ date: dateStr, host: hostName, sessionId: params.id }))
    }
  } catch (e) {
    console.error('WA supply-needed error:', e)
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { pin } = await req.json()

  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('sessions').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
