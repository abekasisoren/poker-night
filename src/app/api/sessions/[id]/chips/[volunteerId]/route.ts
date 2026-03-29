import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** DELETE /api/sessions/[id]/chips/[volunteerId] — remove a chips volunteer */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; volunteerId: string } }
) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('chips_volunteers')
    .delete()
    .eq('id', params.volunteerId)
    .eq('session_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
