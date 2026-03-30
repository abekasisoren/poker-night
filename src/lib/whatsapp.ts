/**
 * WhatsApp messaging via Twilio REST API.
 * No SDK needed — just fetch.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM   e.g. whatsapp:+14155238886  (sandbox)
 *                          or   whatsapp:+972XXXXXXXXX (production number)
 *   NEXT_PUBLIC_APP_URL    e.g. https://poker-night-manager-six.vercel.app
 */

const SID  = process.env.TWILIO_ACCOUNT_SID
const AUTH = process.env.TWILIO_AUTH_TOKEN
const FROM = process.env.TWILIO_WHATSAPP_FROM
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://poker-night-manager-six.vercel.app'

/** Send a single WhatsApp message. Returns true on success, false if skipped/failed. */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!SID || !AUTH || !FROM) {
    console.log('[WA] Skipped (env vars not set):', to, body.slice(0, 60))
    return false
  }
  if (!to) return false

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${SID}:${AUTH}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: FROM, To: toFormatted, Body: body }).toString(),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[WA] Failed:', to, err)
      return false
    }
    console.log('[WA] Sent to', to)
    return true
  } catch (e) {
    console.error('[WA] Error:', e)
    return false
  }
}

/** Send to multiple recipients. Fires in parallel, ignores failures. */
export async function sendWhatsAppBulk(
  recipients: Array<{ phone: string | null; name?: string }>,
  body: string
): Promise<void> {
  await Promise.all(
    recipients
      .filter((r) => r.phone)
      .map((r) => sendWhatsApp(r.phone!, body))
  )
}

// ── Message templates ────────────────────────────────────────────────────────

export function msgSessionCreated(opts: {
  date: string; time: string; location: string; host: string; sessionId: string
}) {
  return (
    `🃏 *Poker Night!*\n` +
    `📅 ${opts.date} at ${opts.time}\n` +
    `📍 ${opts.location}\n` +
    `🏠 Host: ${opts.host}\n\n` +
    `Can you make it? RSVP here:\n${APP_URL}/sessions/${opts.sessionId}`
  )
}

export function msgWhiskeyNeeded(opts: { date: string; host: string; sessionId: string }) {
  return (
    `🥃 *Whiskey needed!*\n` +
    `${opts.host} doesn't have whiskey for poker on ${opts.date}.\n` +
    `Can you bring some? Tap to volunteer:\n${APP_URL}/sessions/${opts.sessionId}`
  )
}

export function msgChipsNeeded(opts: { date: string; host: string; sessionId: string }) {
  return (
    `🃏 *Poker chips & kit needed!*\n` +
    `${opts.host} doesn't have chips for poker on ${opts.date}.\n` +
    `Can you bring them? Tap to volunteer:\n${APP_URL}/sessions/${opts.sessionId}`
  )
}

export function msgBringList(opts: {
  date: string; time: string; location: string; items: string[]
}) {
  const list = opts.items.map((i) => `• ${i}`).join('\n')
  return (
    `🃏 *Poker night reminder!*\n` +
    `${opts.date} at ${opts.time}, ${opts.location}\n\n` +
    `Your bring list:\n${list}`
  )
}

export function msgExpenseRequest(opts: { date: string; sessionId: string }) {
  return (
    `🃏 *Game over! Time to settle up 💰*\n` +
    `Please answer 2 quick questions about poker on ${opts.date}:\n` +
    `• Did you drink whiskey?\n` +
    `• Did you eat? (and what?)\n\n` +
    `Open the app:\n${APP_URL}/sessions/${opts.sessionId}`
  )
}

export function msgDebtNotification(opts: {
  fromName: string; toName: string; amount: number; sessionId: string
}) {
  return (
    `💸 *Poker night settlement*\n` +
    `${opts.fromName}, you owe *${opts.toName}* ₪${opts.amount}.\n\n` +
    `Pay them and they'll confirm receipt in the app:\n${APP_URL}/sessions/${opts.sessionId}`
  )
}

export function msgDebtReceived(opts: {
  fromName: string; toName: string; amount: number
}) {
  return (
    `✅ *Payment confirmed*\n` +
    `${opts.fromName} paid you ₪${opts.amount} — all settled! 🎉`
  )
}
