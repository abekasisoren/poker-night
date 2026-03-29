'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, getInitials, getPlayerColor } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { usePin, getStoredPin } from '@/hooks/usePin'
import PinModal from '@/components/ui/PinModal'
import { Player } from '@/types'

interface ChipsVolunteer {
  id: string
  session_id: string
  player_id: string
  player?: Player
  created_at: string
}

interface ChipsSectionProps {
  sessionId: string
  hostHasChips: boolean | null
  currentPlayer?: Player | null
  onStatusChange: (value: boolean) => void
}

export default function ChipsSection({
  sessionId,
  hostHasChips,
  currentPlayer,
  onStatusChange,
}: ChipsSectionProps) {
  const [volunteers, setVolunteers] = useState<ChipsVolunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { requirePin, showModal, onPinSuccess, onPinCancel } = usePin()

  const loadVolunteers = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/chips`)
      .then((r) => r.json())
      .then(setVolunteers)
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { loadVolunteers() }, [loadVolunteers])

  async function updateStatus(value: boolean) {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_has_chips: value, pin }),
    })
    if (!res.ok) { toast('Failed to update', 'error'); return }
    onStatusChange(value)
    toast(value ? '🃏 Chips covered!' : '🃏 Chips needed — who\'s bringing them?', 'success')
  }

  async function volunteer() {
    if (!currentPlayer) {
      toast('Select your name first (tap the ☰ menu)', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/chips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: currentPlayer.id }),
      })
      if (!res.ok) { toast('Failed to add', 'error'); return }
      const vol = await res.json()
      setVolunteers((prev) => [...prev, vol])
      toast('🃏 Thanks for bringing the chips & kit!', 'success')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeVolunteer(id: string) {
    const res = await fetch(`/api/sessions/${sessionId}/chips/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) { toast('Failed to remove', 'error'); return }
    setVolunteers((prev) => prev.filter((v) => v.id !== id))
    toast('Removed', 'success')
  }

  const myVolunteer = volunteers.find((v) => v.player_id === currentPlayer?.id)
  const isKnown = hostHasChips !== null
  const isCovered = hostHasChips === true
  const isNeeded = hostHasChips === false

  const volunteerName = volunteers.length === 1 ? volunteers[0].player?.name : null

  return (
    <div
      className={cn(
        'mb-5 rounded-xl border p-4',
        isCovered ? 'border-purple-600/30 bg-purple-600/5' :
        isNeeded  ? 'border-purple-500/50 bg-purple-500/10' :
                    'border-[#30363d] bg-[#161b22]'
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🃏</span>
          <span className="font-semibold text-white">Poker Chips &amp; Kit</span>

          {isCovered && (
            <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              ✓ host has it
            </span>
          )}
          {isNeeded && volunteers.length > 0 && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              ✓ {volunteerName ?? `${volunteers.length} players`}
            </span>
          )}
          {isNeeded && volunteers.length === 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
              ⚠ needed
            </span>
          )}
          {!isKnown && (
            <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400">
              status unknown
            </span>
          )}
        </div>

        <button
          onClick={() => requirePin(() => updateStatus(!hostHasChips))}
          className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
          title="Admin: change chips status"
        >
          🔒 {isKnown ? 'change' : 'set status'}
        </button>
      </div>

      {/* ── Unknown: set-status buttons ── */}
      {!isKnown && (
        <div className="mb-1 flex gap-2">
          <button
            onClick={() => requirePin(() => updateStatus(true))}
            className="flex-1 rounded-xl border border-[#30363d] py-2.5 text-sm font-medium text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
          >
            ✓ Host has chips
          </button>
          <button
            onClick={() => requirePin(() => updateStatus(false))}
            className="flex-1 rounded-xl border border-[#30363d] py-2.5 text-sm font-medium text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors"
          >
            ✗ Need chips
          </button>
        </div>
      )}

      {/* ── Covered ── */}
      {isCovered && (
        <p className="text-xs text-gray-500">Chips &amp; kit sorted — host is bringing them 🎲</p>
      )}

      {/* ── Needed: volunteer list + button ── */}
      {isNeeded && !loading && (
        <div>
          {/* Volunteer list */}
          {volunteers.length > 0 && (
            <div className="mb-3 space-y-2">
              {volunteers.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-lg bg-[#0d1117] px-3 py-2">
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: getPlayerColor(v.player?.name ?? '') }}
                  >
                    {v.player?.name ? getInitials(v.player.name)[0] : '?'}
                  </div>
                  <span className="flex-1 text-sm text-gray-200">{v.player?.name ?? '—'}</span>
                  <span className="text-xs font-medium text-purple-400">bringing chips</span>
                  {v.player_id === currentPlayer?.id && (
                    <button
                      onClick={() => removeVolunteer(v.id)}
                      className="ml-1 text-gray-600 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* "I'll bring it" button — shown until the player has already volunteered */}
          {!myVolunteer ? (
            <button
              onClick={volunteer}
              disabled={submitting}
              className="w-full rounded-xl border border-dashed border-purple-500/40 py-2.5 text-sm font-medium text-purple-400 hover:border-purple-500 hover:bg-purple-500/5 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : '🃏 I\'ll bring the chips & kit'}
            </button>
          ) : (
            <p className="text-center text-xs text-purple-400">
              ✓ You&apos;re bringing the chips &amp; kit!
            </p>
          )}
        </div>
      )}

      <PinModal
        isOpen={showModal}
        reason="Admin access"
        onSuccess={onPinSuccess}
        onCancel={onPinCancel}
      />
    </div>
  )
}
