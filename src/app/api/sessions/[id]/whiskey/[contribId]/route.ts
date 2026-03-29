import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** DELETE /api/sessions/[id]/whiskey/[contribId] — remove a whiskey contribution */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; contribId: string } }
) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('whiskey_contributions')
    .delete()
    .eq('id', params.contribId)
    .eq('session_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
