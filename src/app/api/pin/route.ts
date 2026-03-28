import { NextRequest, NextResponse } from 'next/server'
import { verifyPin } from '@/lib/pin'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  if (!pin || typeof pin !== 'string') {
    return NextResponse.json({ valid: false }, { status: 400 })
  }
  return NextResponse.json({ valid: verifyPin(pin) })
}
