'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { storePin } from '@/hooks/usePin'

interface PinModalProps {
  isOpen: boolean
  reason?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PinModal({ isOpen, reason, onSuccess, onCancel }: PinModalProps) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  if (!isOpen) return null

  function handleChange(index: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = v
    setDigits(next)
    setError('')
    if (v && index < 3) refs[index + 1].current?.focus()
    if (v && index === 3) {
      const pin = next.join('')
      if (pin.length === 4) submitPin(pin)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  async function submitPin(pin: string) {
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
        onSuccess()
        setDigits(['', '', '', ''])
      } else {
        setError('Wrong PIN. Try again.')
        setDigits(['', '', '', ''])
        refs[0].current?.focus()
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-[#1c2128] p-8 pb-12">
        <div className="mb-2 text-center text-2xl">🔒</div>
        <h2 className="mb-1 text-center text-xl font-bold text-white">Enter PIN</h2>
        {reason && <p className="mb-6 text-center text-sm text-gray-400">{reason}</p>}

        <div className="mb-6 flex justify-center gap-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-14 w-14 rounded-xl border border-[#30363d] bg-[#0d1117] text-center text-2xl font-bold text-white focus:border-emerald-500 focus:outline-none"
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}
        {loading && <p className="mb-4 text-center text-sm text-gray-400">Verifying…</p>}

        <button
          onClick={onCancel}
          className="w-full rounded-xl py-3 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
