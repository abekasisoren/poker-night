'use client'

import { useEffect, useState } from 'react'
import { Player } from '@/types'
import PinModal from '@/components/ui/PinModal'
import { getStoredPin } from '@/hooks/usePin'
import Link from 'next/link'

export default function AdminPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [unlocked, setUnlocked] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/players')
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data ?? [])
        // Pre-fill editing state with existing phones
        const phones: Record<string, string> = {}
        for (const p of data ?? []) {
          phones[p.id] = p.phone ?? ''
        }
        setEditing(phones)
      })
      .finally(() => setLoading(false))
  }, [])

  async function savePhone(playerId: string) {
    const pin = getStoredPin()
    setSaving(playerId)
    const res = await fetch(`/api/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, phone: editing[playerId] }),
    })
    if (res.ok) {
      const updated: Player = await res.json()
      setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setSaved(playerId)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  if (loading) return <div className="py-20 text-center text-gray-500">Loading…</div>

  if (!unlocked) {
    return (
      <div className="px-4 pt-16 flex flex-col items-center gap-6">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        <p className="text-sm text-gray-400 text-center">PIN required to manage player phone numbers</p>
        <button
          onClick={() => setShowPin(true)}
          className="w-full max-w-xs rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-600"
        >
          Enter PIN
        </button>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">← Back</Link>
        <PinModal
          isOpen={showPin}
          reason="Admin access"
          onSuccess={() => { setShowPin(false); setUnlocked(true) }}
          onCancel={() => setShowPin(false)}
        />
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-16">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold text-white">Player Phone Numbers</h1>
      </div>

      <p className="mb-5 text-xs text-gray-500">
        Enter numbers in international format: <span className="text-gray-300">+972501234567</span>
      </p>

      <div className="space-y-3">
        {players.map((player) => {
          const isSaving = saving === player.id
          const isSaved  = saved  === player.id
          const hasPhone = !!player.phone
          return (
            <div key={player.id} className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white">{player.name}</span>
                </div>
                {hasPhone && (
                  <span className="text-xs text-emerald-400">✓ Set</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={editing[player.id] ?? ''}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, [player.id]: e.target.value }))
                  }
                  placeholder="+972501234567"
                  className="flex-1 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={() => savePhone(player.id)}
                  disabled={isSaving}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                    isSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#30363d] text-gray-200 hover:bg-[#3d444d]'
                  } disabled:opacity-50`}
                >
                  {isSaving ? '…' : isSaved ? '✓' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
        <p className="text-xs font-bold text-gray-400 mb-1">Coverage</p>
        <p className="text-2xl font-black text-white">
          {players.filter((p) => p.phone).length}
          <span className="text-sm text-gray-400 font-normal"> / {players.length} players</span>
        </p>
      </div>
    </div>
  )
}
