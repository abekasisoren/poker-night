'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, getInitials, getPlayerColor } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface RsvpEntry {
  player_id: string
  player: { id: string; name: string }
  response: 'yes' | 'no' | 'maybe' | 'pending'
  session_id: string
}

interface RsvpListProps {
  sessionId: string
  currentPlayerId?: string
}

const RESPONSES = [
  { value: 'yes', label: 'In', color: 'bg-emerald-600', dim: 'bg-emerald-600/20 text-emerald-400' },
  { value: 'maybe', label: '?', color: 'bg-yellow-500', dim: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'no', label: 'Out', color: 'bg-red-600', dim: 'bg-red-600/20 text-red-400' },
]

export default function RsvpList({ sessionId, currentPlayerId }: RsvpListProps) {
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  const load = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/rsvps`)
      .then((r) => r.json())
      .then(setRsvps)
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { load() }, [load])

  async function updateRsvp(playerId: string, response: string) {
    setUpdating(playerId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rsvps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, response }),
      })
      if (!res.ok) { toast('Failed to update RSVP', 'error'); return }
      setRsvps((prev) => prev.map((r) => r.player_id === playerId ? { ...r, response: response as RsvpEntry['response'] } : r))
    } catch {
      toast('Failed to update RSVP', 'error')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Loading…</div>

  const yesCount = rsvps.filter((r) => r.response === 'yes').length
  const maybeCount = rsvps.filter((r) => r.response === 'maybe').length

  return (
    <div>
      <div className="mb-4 flex gap-4 text-sm">
        <span><span className="font-bold text-emerald-400">{yesCount}</span> <span className="text-gray-400">coming</span></span>
        <span><span className="font-bold text-yellow-400">{maybeCount}</span> <span className="text-gray-400">maybe</span></span>
        <span><span className="font-bold text-gray-400">{14 - yesCount - maybeCount}</span> <span className="text-gray-400">pending/out</span></span>
      </div>

      <div className="space-y-2">
        {rsvps.map((r) => (
          <div
            key={r.player_id}
            className={cn(
              'flex items-center justify-between rounded-xl border p-3',
              r.player_id === currentPlayerId
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-[#30363d] bg-[#161b22]'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: getPlayerColor(r.player.name) }}
              >
                {getInitials(r.player.name)}
              </div>
              <span className="font-medium text-white">
                {r.player.name}
                {r.player_id === currentPlayerId && (
                  <span className="ml-1 text-xs text-emerald-400">(you)</span>
                )}
              </span>
            </div>
            <div className="flex gap-1">
              {RESPONSES.map((resp) => (
                <button
                  key={resp.value}
                  onClick={() => updateRsvp(r.player_id, resp.value)}
                  disabled={updating === r.player_id}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    r.response === resp.value
                      ? `${resp.color} text-white`
                      : 'bg-[#21262d] text-gray-400 hover:text-white'
                  )}
                >
                  {resp.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
