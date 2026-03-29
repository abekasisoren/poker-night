'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, getInitials, getPlayerColor } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { usePin, getStoredPin } from '@/hooks/usePin'
import PinModal from '@/components/ui/PinModal'
import { Player, WhiskeyContribution } from '@/types'

interface WhiskeySectionProps {
  sessionId: string
  sessionHost?: Player | null
  hostHasWhiskey: boolean | null
  currentPlayer?: Player | null
  onStatusChange: (value: boolean) => void
}

export default function WhiskeySection({
  sessionId,
  hostHasWhiskey,
  currentPlayer,
  onStatusChange,
}: WhiskeySectionProps) {
  const [contributions, setContributions] = useState<WhiskeyContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [showVolunteerForm, setShowVolunteerForm] = useState(false)
  const [bottles, setBottles] = useState(2)
  const [pricePerBottle, setPricePerBottle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { requirePin, showModal, onPinSuccess, onPinCancel } = usePin()

  const loadContributions = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/whiskey`)
      .then((r) => r.json())
      .then(setContributions)
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { loadContributions() }, [loadContributions])

  async function updateStatus(value: boolean) {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_has_whiskey: value, pin }),
    })
    if (!res.ok) { toast('Failed to update', 'error'); return }
    onStatusChange(value)
    toast(value ? '🥃 Whiskey covered!' : '🥃 Whiskey needed — volunteers welcome', 'success')
  }

  async function addContribution() {
    if (!currentPlayer) {
      toast('Select your name first (tap the ☰ menu)', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/whiskey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: currentPlayer.id,
          bottles,
          price_per_bottle: pricePerBottle ? parseFloat(pricePerBottle) : null,
        }),
      })
      if (!res.ok) { toast('Failed to add', 'error'); return }
      const contrib = await res.json()
      setContributions((prev) => [...prev, contrib])
      setShowVolunteerForm(false)
      setBottles(2)
      setPricePerBottle('')
      toast('🥃 Thanks! Whiskey is on you 🙌', 'success')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeContribution(id: string) {
    const res = await fetch(`/api/sessions/${sessionId}/whiskey/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) { toast('Failed to remove', 'error'); return }
    setContributions((prev) => prev.filter((c) => c.id !== id))
    toast('Removed', 'success')
  }

  const totalBottles = contributions.reduce((sum, c) => sum + c.bottles, 0)
  const myContribution = contributions.find((c) => c.player_id === currentPlayer?.id)

  const isKnown = hostHasWhiskey !== null
  const isCovered = hostHasWhiskey === true
  const isNeeded = hostHasWhiskey === false

  return (
    <div
      className={cn(
        'mb-5 rounded-xl border p-4',
        isCovered ? 'border-amber-600/30 bg-amber-600/5' :
        isNeeded  ? 'border-amber-500/50 bg-amber-500/10' :
                    'border-[#30363d] bg-[#161b22]'
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥃</span>
          <span className="font-semibold text-white">Whiskey</span>
          {isCovered && (
            <span className="rounded-full bg-amber-600/20 px-2 py-0.5 text-xs font-medium text-amber-400">
              ✓ covered by host
            </span>
          )}
          {isNeeded && totalBottles > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
              {totalBottles} bottle{totalBottles !== 1 ? 's' : ''} coming
            </span>
          )}
          {isNeeded && totalBottles === 0 && (
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

        {/* Admin status toggle */}
        <button
          onClick={() => requirePin(() => updateStatus(!hostHasWhiskey))}
          className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
          title="Admin: change whiskey status"
        >
          🔒 {isKnown ? 'change' : 'set status'}
        </button>
      </div>

      {/* ── Unknown: show set-status buttons ── */}
      {!isKnown && (
        <div className="mb-1 flex gap-2">
          <button
            onClick={() => requirePin(() => updateStatus(true))}
            className="flex-1 rounded-xl border border-[#30363d] py-2.5 text-sm font-medium text-gray-400 hover:border-amber-500 hover:text-amber-400 transition-colors"
          >
            ✓ Host has whiskey
          </button>
          <button
            onClick={() => requirePin(() => updateStatus(false))}
            className="flex-1 rounded-xl border border-[#30363d] py-2.5 text-sm font-medium text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors"
          >
            ✗ Whiskey needed
          </button>
        </div>
      )}

      {/* ── Covered: nothing more to show ── */}
      {isCovered && (
        <p className="text-xs text-gray-500">No need to bring — host has it covered 👍</p>
      )}

      {/* ── Needed: volunteer list + form ── */}
      {isNeeded && !loading && (
        <div>
          {/* Volunteer list */}
          {contributions.length > 0 && (
            <div className="mb-3 space-y-2">
              {contributions.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-[#0d1117] px-3 py-2">
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: getPlayerColor(c.player?.name ?? '') }}
                  >
                    {c.player?.name ? getInitials(c.player.name)[0] : '?'}
                  </div>
                  <span className="flex-1 text-sm text-gray-200">{c.player?.name ?? '—'}</span>
                  <span className="text-sm font-medium text-amber-400">
                    {c.bottles} bottle{c.bottles !== 1 ? 's' : ''}
                  </span>
                  {c.price_per_bottle != null && (
                    <span className="text-xs text-gray-500">₪{c.price_per_bottle}/btl</span>
                  )}
                  {c.player_id === currentPlayer?.id && (
                    <button
                      onClick={() => removeContribution(c.id)}
                      className="ml-1 text-gray-600 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Volunteer button */}
          {!myContribution && !showVolunteerForm && (
            <button
              onClick={() => {
                if (!currentPlayer) {
                  toast('Select your name first (tap the ☰ menu)', 'error')
                  return
                }
                setShowVolunteerForm(true)
              }}
              className="w-full rounded-xl border border-dashed border-amber-500/40 py-2.5 text-sm font-medium text-amber-400 hover:border-amber-500 hover:bg-amber-500/5 transition-colors"
            >
              🥃 I&apos;ll bring whiskey
            </button>
          )}

          {/* Volunteer form */}
          {showVolunteerForm && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-3 text-sm font-semibold text-amber-400">How many bottles?</p>

              {/* Bottle stepper */}
              <div className="mb-3 flex items-center gap-3">
                <button
                  onClick={() => setBottles((b) => Math.max(1, b - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#21262d] text-lg font-bold text-white hover:bg-[#30363d] transition-colors"
                >
                  −
                </button>
                <span className="flex-1 text-center text-2xl font-black text-white">{bottles}</span>
                <button
                  onClick={() => setBottles((b) => Math.min(6, b + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#21262d] text-lg font-bold text-white hover:bg-[#30363d] transition-colors"
                >
                  +
                </button>
              </div>

              {/* Price input */}
              <input
                type="number"
                value={pricePerBottle}
                onChange={(e) => setPricePerBottle(e.target.value)}
                placeholder="Price per bottle ₪ (optional)"
                className="mb-3 w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowVolunteerForm(false); setBottles(2); setPricePerBottle('') }}
                  className="rounded-xl border border-[#30363d] px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addContribution}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving…' : `Confirm — ${bottles} bottle${bottles !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
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
