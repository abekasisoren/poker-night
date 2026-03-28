'use client'

import { useState, useEffect, useCallback } from 'react'
import { BringItem, BringCategory, Player } from '@/types'
import { cn } from '@/lib/utils'
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
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newCat, setNewCat] = useState<BringCategory>('food')
  const [adding, setAdding] = useState(false)
  const { toast } = useToast()
  const { requirePin, showModal, onPinSuccess, onPinCancel } = usePin()

  const load = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/bring`)
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { load() }, [load])

  async function addItem() {
    if (!newItem.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/bring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: newItem.trim(),
          category: newCat,
          player_id: currentPlayer?.id || null,
        }),
      })
      if (!res.ok) { toast('Failed to add item', 'error'); return }
      const created = await res.json()
      setItems((prev) => [...prev, created])
      setNewItem('')
      toast('Item added', 'success')
    } finally {
      setAdding(false)
    }
  }

  async function toggleClaim(item: BringItem) {
    const isMine = item.player_id === currentPlayer?.id
    const isUnclaimed = !item.player_id

    if (!isUnclaimed && !isMine) {
      toast(`Already claimed by ${item.player?.name}`, 'info')
      return
    }

    const newPlayerId = item.is_claimed ? null : (currentPlayer?.id ?? null)
    const newClaimed = !item.is_claimed

    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_claimed: newClaimed, player_id: newPlayerId } : i))

    const res = await fetch(`/api/sessions/${sessionId}/bring/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_claimed: newClaimed, player_id: newPlayerId }),
    })
    if (!res.ok) {
      setItems((prev) => prev.map((i) => i.id === item.id ? item : i))
      toast('Failed to update', 'error')
    }
  }

  function deleteItem(item: BringItem) {
    requirePin(async () => {
      const pin = getStoredPin()
      const res = await fetch(`/api/sessions/${sessionId}/bring/${item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) { toast('Failed to delete item', 'error'); return }
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast('Item removed', 'success')
    })
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Loading…</div>

  return (
    <div>
      {/* Add item */}
      <div className="mb-6 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
        <p className="mb-3 text-sm font-medium text-gray-300">Add an item</p>
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
            placeholder={`Add ${newCat}…`}
            className="flex-1 rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-2 text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={addItem}
            disabled={adding || !newItem.trim()}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {/* Items by category */}
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.key)
        if (!catItems.length) return null
        return (
          <div key={cat.key} className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-400">
              {cat.icon} {cat.label}
            </h3>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleClaim(item)}
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-colors',
                        item.is_claimed
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-500 bg-transparent'
                      )}
                    >
                      {item.is_claimed && <span className="flex items-center justify-center text-xs text-white">✓</span>}
                    </button>
                    <div>
                      <p className={cn('font-medium text-white', item.is_claimed && 'line-through text-gray-500')}>
                        {item.item}
                      </p>
                      {item.player && (
                        <p className="text-xs text-gray-400">{item.player.name}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {items.length === 0 && (
        <p className="py-8 text-center text-gray-500">No items yet. Add the first one!</p>
      )}

      <PinModal
        isOpen={showModal}
        reason="Delete item"
        onSuccess={onPinSuccess}
        onCancel={onPinCancel}
      />
    </div>
  )
}
