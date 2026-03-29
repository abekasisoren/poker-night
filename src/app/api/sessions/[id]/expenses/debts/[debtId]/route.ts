export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PATCH /api/sessions/[id]/expenses/debts/[debtId]
 * Body: { paid: true }  — creditor confirms they received payment
 * Marks the debt as paid (sets paid_at = now()).
 * No PIN required — the recipient confirming payment is self-service.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; debtId: string } }
) {
  const { paid } = await req.json()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('expense_debts')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', params.debtId)
    .eq('session_id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
