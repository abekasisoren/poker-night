'use client'

import { useState, useEffect, useCallback } from 'react'
import { BringItem, BringCategory, Player } from '@/types'
import { cn, getInitials, getPlayerColor } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import PinModal from '@/components/ui/PinModal'
import { usePin, getStoredPin } from '@/hooks/usePin'

const CATEGORIES: { key: BringCategory; label: string; icon: string }[] = [
  { key: 'food', label: 'Food', icon: '🍕' },
  { key: 'drinks', label: 'Drinks', icon: '🍺' },
  { key: 'equipment', label: 'Equipment', icon: '🎲' },
  { key: 'other', label: 'Other', icon: '📦' },
]

interface BringListProps {
  sessionId: string
  currentPlayer?: Player | null
}

export default function BringList({ sessionId, currentPlayer }: BringListProps) {
  const [items, setItems] = useState<BringItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newCat, setNewCat] = useState<BringCategory>('food')
  const [newPlayerId, setNewPlayerId] = useState('')
  const [adding, setAdding] = useState(false)
  const { toast } = useToast()
  const { requirePin, showModal, onPinSuccess, onPinCancel } = usePin()

  const load = useCallback(() => {
    Promise.all([
      fetch(`/api/sessions/${sessionId}/bring`).then((r) => r.json()),
      fetch('/api/players').then((r) => r.json()),
    ]).then(([bringData, playersData]) => {
      setItems(bringData)
      setPlayers(playersData)
    }).finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    load()
    try { localStorage.setItem(`seen_bring_${sessionId}`, Date.now().toString()) } catch {}
  }, [load, sessionId])

  async function addItem() {
    if (!newItem.trim() || !newPlayerId) {
      toast('Select a player and enter an item', 'error')
      return
    }
    setAdding(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/bring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newItem.trim(), category: newCat, player_id: newPlayerId }),
      })
      if (!res.ok) { toast('Failed to add item', 'error'); return }
      const created = await res.json()
      setItems((prev) => [...prev, created])
      setNewItem('')
      setNewPlayerId('')
      toast('Item assigned!', 'success')
      // Update notification timestamp so others see the badge
      try { localStorage.setItem(`bring_updated_${sessionId}`, Date.now().toString()) } catch {}
    } finally {
      setAdding(false)
    }
  }

  async function deleteItem(item: BringItem) {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${sessionId}/bring/${item.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (!res.ok) { toast('Failed to delete', 'error'); return }
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    toast('Removed', 'success')
  }

  async function toggleConfirm(item: BringItem) {
    if (item.player_id !== currentPlayer?.id) return
    const res = await fetch(`/api/sessions/${sessionId}/bring/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_claimed: !item.is_claimed }),
    })
    if (!res.ok) return
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_claimed: !i.is_claimed } : i))
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Loading…</div>

  const byPlayer = players
    .map((p) => ({ player: p, items: items.filter((i) => i.player_id === p.id) }))
    .filter((g) => g.items.length > 0)

  return (
    <div>
      {/* Admin assign button */}
      <button
        onClick={() => requirePin(() => setShowAdminForm((v) => !v))}
        className="mb-4 w-full rounded-xl border border-dashed border-[#30363d] py-2.5 text-sm font-medium text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
      >
        {showAdminForm ? '✕ Close' : '🔒 Assign item to player'}
      </button>

      {/* Admin form */}
      {showAdminForm && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="mb-3 text-sm font-semibold text-emerald-400">Assign item to player</p>

          <div className="mb-3">
            <p className="mb-2 text-xs text-gray-400">Who brings it?</p>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setNewPlayerId(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    newPlayerId === p.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#21262d] text-gray-300 hover:text-white'
                  )}
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: getPlayerColor(p.name) }}
                  >
                    {getInitials(p.name)[0]}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setNewCat(c.key)}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors',
                  newCat === c.key ? 'bg-emerald-600 text-white' : 'bg-[#21262d] text-gray-400'
                )}
              >
                {c.icon}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="e.g. Beer, Poker chips…"
              className="flex-1 rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={addItem}
              disabled={adding || !newItem.trim() || !newPlayerId}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by player */}
      {byPlayer.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-2xl">🛒</p>
          <p className="mt-2 text-gray-500">Nothing assigned yet</p>
          <p className="text-sm text-gray-600">Admin will assign what each player brings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {byPlayer.map(({ player, items: playerItems }) => {
            const isMe = player.id === currentPlayer?.id
            return (
              <div
                key={player.id}
                className={cn(
                  'rounded-xl border p-4',
                  isMe ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[#30363d] bg-[#161b22]'
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: getPlayerColor(player.name) }}
                  >
                    {getInitials(player.name)}
                  </div>
                  <span className="font-semibold text-white">
                    {player.name}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-emerald-400">(you)</span>}
                  </span>
                </div>

                <div className="space-y-2">
                  {playerItems.map((item) => {
                    const catIcon = CATEGORIES.find((c) => c.key === item.category)?.icon ?? '📦'
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        {isMe ? (
                          <button
                            onClick={() => toggleConfirm(item)}
                            className={cn(
                              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                              item.is_claimed ? 'border-emerald-500 bg-emerald-500' : 'border-gray-500'
                            )}
                          >
                            {item.is_claimed && <span className="text-xs text-white">✓</span>}
                          </button>
                        ) : (
                          <div className={cn(
                            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2',
                            item.is_claimed ? 'border-emerald-500 bg-emerald-500' : 'border-gray-700'
                          )}>
                            {item.is_claimed && <span className="text-xs text-white">✓</span>}
                          </div>
                        )}
                        <span className={cn(
                          'flex-1 text-sm',
                          item.is_claimed ? 'text-gray-500 line-through' : 'text-gray-200'
                        )}>
                          {catIcon} {item.item}
                        </span>
                        {showAdminForm && (
                          <button
                            onClick={() => deleteItem(item)}
                            className="text-gray-600 hover:text-red-400 text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
