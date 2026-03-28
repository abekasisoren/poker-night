import { createHash } from 'crypto'

export function hashPin(pin: string): string {
  return createHash('sha256')
    .update(pin + (process.env.PIN_SALT ?? ''))
    .digest('hex')
}

export function verifyPin(pin: string): boolean {
  if (!process.env.ADMIN_PIN_HASH) return false
  return hashPin(pin) === process.env.ADMIN_PIN_HASH
}
