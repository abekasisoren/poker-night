'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Player } from '@/types'
import SessionForm from '@/components/session/SessionForm'
import { getStoredPin, storePin } from '@/hooks/usePin'

export default function NewSessionPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [pinReady, setPinReady] = useState(false)
  const [pin, setPin] = useState('')

  useEffect(() => {
    fetch('/api/players').then((r) => r.json()).then(setPlayers)
    const stored = getStoredPin()
    if (stored) {
      setPin(stored)
      setPinReady(true)
    }
  }, [])

  return (
    <div className="px-4 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/sessions" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-2xl font-black text-white">New Session</h1>
      </div>

      {pinReady ? (
        <SessionForm players={players} pin={pin} />
      ) : (
        <PinGate onVerified={(p) => { setPin(p); setPinReady(true) }} />
      )}
    </div>
  )
}

function PinGate({ onVerified }: { onVerified: (pin: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleChange(i: number, val: string) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    setError('')
    if (v && i < 3) refs[i + 1].current?.focus()
    if (v && i === 3) {
      const pin = next.join('')
      if (pin.length === 4) verify(pin)
    }
  }

  async function verify(pin: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const { valid } = await res.json()
      if (valid) {
        storePin(pin)
        onVerified(pin)
      } else {
        setError('Wrong PIN. Try again.')
        setDigits(['', '', '', ''])
        refs[0].current?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-2 text-4xl">🔒</div>
      <h2 className="mb-1 text-xl font-bold text-white">Admin PIN</h2>
      <p className="mb-8 text-sm text-gray-400">Required to create a session</p>
      <div className="flex gap-4">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus()
            }}
            className="h-14 w-14 rounded-xl border border-[#30363d] bg-[#161b22] text-center text-2xl font-bold text-white focus:border-emerald-500 focus:outline-none"
            autoFocus={i === 0}
          />
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="mt-4 text-sm text-gray-400">Checking…</p>}
    </div>
  )
}
