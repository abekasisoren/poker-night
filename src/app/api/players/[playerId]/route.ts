export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_PIN = process.env.ADMIN_PIN ?? '1234'

/**
 * PATCH /api/players/[playerId]
 * Body: { pin, phone }
 * Admin-only: update a player's phone number (E.164 format).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const { pin, phone } = await req.json()

  if (pin !== VALID_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })
  }

  // Normalise: strip spaces/dashes, ensure starts with +
  const normalised = phone ? phone.replace(/[\s\-()]/g, '') : null

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('players')
    .update({ phone: normalised || null })
    .eq('id', params.playerId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
