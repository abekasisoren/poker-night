'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Player, Result } from '@/types'
import { getInitials, getPlayerColor, formatCurrency } from '@/lib/utils'
import AmountInput from '@/components/ui/AmountInput'
import { useToast } from '@/components/ui/Toast'

interface ResultsFormProps {
  sessionId: string
  attendingPlayers: Player[]
  pin: string
}

export default function ResultsForm({ sessionId, attendingPlayers, pin }: ResultsFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(attendingPlayers.map((p) => [p.id, 0]))
  )
  const [existingResults, setExistingResults] = useState<Result[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/results`)
      .then((r) => r.json())
      .then((data: Result[]) => {
        if (data.length > 0) {
          setExistingResults(data)
          setSubmitted(true)
        }
      })
  }, [sessionId])

  const sum = Object.values(amounts).reduce((a, b) => a + b, 0)
  const filledCount = Object.values(amounts).filter((v) => v !== 0).length

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const results = Object.entries(amounts)
        .filter(([, amt]) => amt !== 0)
        .map(([player_id, amount]) => ({ player_id, amount }))

      if (results.length === 0) {
        toast('Enter at least one result', 'error')
        return
      }

      const res = await fetch(`/api/sessions/${sessionId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, pin }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast(error ?? 'Failed to save results', 'error')
        return
      }
      toast('Results saved! 🎉', 'success')
      router.push(`/sessions/${sessionId}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Read-only view after results are saved
  if (submitted && existingResults.length > 0) {
    const sorted = [...existingResults].sort((a, b) => Number(b.amount) - Number(a.amount))
    const total = sorted.reduce((s, r) => s + Number(r.amount), 0)
    return (
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Final Results</h2>
        <div className="space-y-2">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: getPlayerColor(r.player?.name ?? '') }}
                >
                  {getInitials(r.player?.name ?? '?')}
                </div>
                <span className="font-medium text-white">{r.player?.name}</span>
              </div>
              <span className={Number(r.amount) >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>
                {formatCurrency(Number(r.amount))}
              </span>
            </div>
          ))}
        </div>
        {Math.abs(total) > 0.01 && (
          <p className="mt-3 text-center text-xs text-gray-500">
            Net table: {formatCurrency(total)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Running total display — informational only, no enforcement */}
      <div className="mb-4 rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-center">
        <p className="mb-1 text-xs text-gray-400">{filledCount}/{attendingPlayers.length} entered · running total</p>
        <p className={`text-3xl font-black ${sum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {sum >= 0 ? '+' : ''}{sum.toFixed(2)}
        </p>
      </div>

      <div className="space-y-3">
        {attendingPlayers.map((p) => (
          <div key={p.id} className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: getPlayerColor(p.name) }}
              >
                {getInitials(p.name)}
              </div>
              <span className="font-medium text-white">{p.name}</span>
            </div>
            <AmountInput value={amounts[p.id] ?? 0} onChange={(val) => setAmounts((a) => ({ ...a, [p.id]: val }))} />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
      >
        {submitting ? 'Saving…' : 'Save Results'}
      </button>
    </div>
  )
}
