'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BringItem, BringCategory, Player, Rsvp } from '@/types'
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

// Premium items assigned in priority order (everyone else gets beer)
const PREMIUM_SLOTS = [
  { item: 'Nuts', category: 'food' as BringCategory, icon: '🥜' },
  { item: 'Nuts', category: 'food' as BringCategory, icon: '🥜' },
  { item: 'Fruit', category: 'food' as BringCategory, icon: '🍎' },
  { item: 'Coke (6-pack)', category: 'drinks' as BringCategory, icon: '🥤' },
]
// 2 ice bags when someone other than Oren is hosting
const ICE_SLOT = { item: 'Ice (bag)', category: 'other' as BringCategory, icon: '🧊' }
const BEER_SLOT = { item: 'Beer (6-pack)', category: 'drinks' as BringCategory, icon: '🍺' }

// Oren is the only player with an ice machine
const ICE_MACHINE_HOST = 'Oren'

interface AssignmentPreview {
  player: Player
  item: string
  category: BringCategory
  icon: string
}

interface BringListProps {
  sessionId: string
  currentPlayer?: Player | null
  sessionHost?: Player | null
}

/**
 * Fair assignment algorithm.
 * For each "premium" item slot, picks the confirmed player who has brought
 * that item the FEWEST times historically (ties broken randomly).
 * Remaining players get beer.
 */
function fairAssign(
  players: Player[],
  history: Record<string, Record<string, number>>,
  includeIce: boolean,
  seed: number // changes on reshuffle to randomise tie-breaking
): AssignmentPreview[] {
  const result: AssignmentPreview[] = []
  const assigned = new Set<string>()

  // When ice is needed, assign 2 bags to 2 different players
  const slots = includeIce
    ? [...PREMIUM_SLOTS, ICE_SLOT, ICE_SLOT]
    : [...PREMIUM_SLOTS]

  for (const slot of slots) {
    const available = players.filter((p) => !assigned.has(p.id))
    if (available.length === 0) break

    // Sort by fewest times having THIS item; random (seeded) tiebreak
    const sorted = [...available].sort((a, b) => {
      const ca = history[a.id]?.[slot.item] ?? 0
      const cb = history[b.id]?.[slot.item] ?? 0
      if (ca !== cb) return ca - cb
      // Stable-ish tiebreak using player id hash + seed
      const ha = (a.id.charCodeAt(0) + seed) % 100
      const hb = (b.id.charCodeAt(0) + seed) % 100
      return ha - hb
    })

    const winner = sorted[0]
    assigned.add(winner.id)
    result.push({ player: winner, item: slot.item, category: slot.category, icon: slot.icon })
  }

  // Everyone else brings beer
  for (const p of players) {
    if (!assigned.has(p.id)) {
      result.push({ player: p, item: BEER_SLOT.item, category: BEER_SLOT.category, icon: BEER_SLOT.icon })
    }
  }

  return result
}

export default function BringList({ sessionId, currentPlayer, sessionHost }: BringListProps) {
  // Ice is needed when the host doesn't have an ice machine
  const hostHasIceMachine = sessionHost?.name === ICE_MACHINE_HOST
  const [items, setItems] = useState<BringItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newCat, setNewCat] = useState<BringCategory>('food')
  const [newPlayerId, setNewPlayerId] = useState('')
  const [adding, setAdding] = useState(false)

  // Auto-assign state
  const [showAutoAssign, setShowAutoAssign] = useState(false)
  const [includeIce, setIncludeIce] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  // Store confirmed players + history as refs so they're always current in callbacks
  const confirmedRef = useRef<Player[]>([])
  const historyRef = useRef<Record<string, Record<string, number>>>({})
  const seedRef = useRef(0)
  const [autoPreview, setAutoPreview] = useState<AssignmentPreview[]>([])

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

  async function openAutoAssign() {
    const rsvpRes = await fetch(`/api/sessions/${sessionId}/rsvps`)
    const rsvps: Rsvp[] = await rsvpRes.json()

    // Deduplicate confirmed players by id (guards against duplicate RSVP rows)
    const seen = new Set<string>()
    const confirmed: Player[] = []
    for (const r of rsvps) {
      if (r.response === 'yes' && r.player && !seen.has(r.player.id)) {
        seen.add(r.player.id)
        confirmed.push(r.player)
      }
    }

    if (confirmed.length === 0) {
      toast('No confirmed players yet — wait for RSVPs first', 'error')
      return
    }

    // Fetch fairness history for these players
    const ids = confirmed.map((p) => p.id).join(',')
    const histRes = await fetch(`/api/bring/fairness?players=${ids}`)
    const history: Record<string, Record<string, number>> = await histRes.json()

    // Store in refs so toggle/reshuffle always have current values
    confirmedRef.current = confirmed
    historyRef.current = history
    seedRef.current = Date.now() % 10000

    // Default ice: on when host doesn't have an ice machine
    const iceDefault = !hostHasIceMachine
    setIncludeIce(iceDefault)
    // Build preview synchronously using local variables (not stale state)
    setAutoPreview(fairAssign(confirmed, history, iceDefault, seedRef.current))
    setShowAutoAssign(true)
  }

  function handleIceToggle() {
    const newIce = !includeIce
    setIncludeIce(newIce)
    // Rebuild preview immediately with current refs — no stale state possible
    setAutoPreview(fairAssign(confirmedRef.current, historyRef.current, newIce, seedRef.current))
  }

  function reshufflePreview() {
    seedRef.current = Math.floor(Math.random() * 10000)
    setAutoPreview(fairAssign(confirmedRef.current, historyRef.current, includeIce, seedRef.current))
  }

  async function executeAutoAssign() {
    setAutoAssigning(true)
    const pin = getStoredPin()
    try {
      // Delete all existing items first
      if (items.length > 0) {
        await Promise.all(
          items.map((item) =>
            fetch(`/api/sessions/${sessionId}/bring/${item.id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin }),
            })
          )
        )
      }

      // Post all assignments in parallel
      const results = await Promise.all(
        autoPreview.map((a) =>
          fetch(`/api/sessions/${sessionId}/bring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: a.item, category: a.category, player_id: a.player.id }),
          }).then((r) => r.json())
        )
      )

      setItems(results)
      setShowAutoAssign(false)
      setShowAdminForm(false)
      toast(`✓ ${results.length} items assigned to ${confirmedRef.current.length} players!`, 'success')
      try { localStorage.setItem(`bring_updated_${sessionId}`, Date.now().toString()) } catch {}
    } catch {
      toast('Failed to auto-assign', 'error')
    } finally {
      setAutoAssigning(false)
    }
  }

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

  const beerCount = autoPreview.filter((a) => a.item === BEER_SLOT.item).length

  // Build fairness tooltip: "last brought X N games ago"
  function itemHistory(playerId: string, itemName: string): string {
    const count = historyRef.current[playerId]?.[itemName] ?? 0
    if (count === 0) return 'never'
    return `${count}×`
  }

  return (
    <div>
      {/* Admin buttons row */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => requirePin(() => { setShowAdminForm((v) => !v); setShowAutoAssign(false) })}
          className="flex-1 rounded-xl border border-dashed border-[#30363d] py-2.5 text-sm font-medium text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
        >
          {showAdminForm && !showAutoAssign ? '✕ Close' : '🔒 Assign item'}
        </button>
        <button
          onClick={() => requirePin(() => { setShowAdminForm(true); openAutoAssign() })}
          className="rounded-xl border border-dashed border-[#30363d] px-4 py-2.5 text-sm font-medium text-purple-400 hover:border-purple-500 hover:text-purple-300 transition-colors"
          title="Auto-assign based on fair rotation history"
        >
          ⚡ Auto
        </button>
      </div>

      {/* Auto-assign panel */}
      {showAdminForm && showAutoAssign && (
        <div className="mb-5 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-400">⚡ Auto-assign</p>
              <p className="text-xs text-gray-500">Fair rotation based on history</p>
            </div>
            <button onClick={() => setShowAutoAssign(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
          </div>

          <p className="mb-3 text-xs text-gray-400">
            {confirmedRef.current.length} confirmed player{confirmedRef.current.length !== 1 ? 's' : ''} · {autoPreview.length} items
          </p>

          {/* Ice toggle */}
          <button
            onClick={handleIceToggle}
            className={cn(
              'mb-4 flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors text-left',
              includeIce ? 'border-blue-500/40 bg-blue-500/10' : 'border-[#30363d] bg-[#0d1117]'
            )}
          >
            <div className={cn('relative h-5 w-9 flex-shrink-0 rounded-full transition-colors', includeIce ? 'bg-blue-500' : 'bg-gray-700')}>
              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', includeIce ? 'translate-x-4' : 'translate-x-0.5')} />
            </div>
            <div className="flex-1">
              <span className="text-sm text-gray-200">🧊 Ice needed </span>
              {includeIce && <span className="text-xs text-blue-400">(2 bags, 2 players)</span>}
            </div>
            <span className="text-xs text-gray-500">
              {hostHasIceMachine ? '🏠 Oren has a machine' : 'no freezer at venue'}
            </span>
          </button>

          {/* Assignment preview with fairness hints */}
          <div className="mb-3 space-y-1.5">
            {autoPreview.map((a, i) => {
              const histCount = itemHistory(a.player.id, a.item)
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[#0d1117] px-3 py-2">
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: getPlayerColor(a.player.name) }}
                  >
                    {getInitials(a.player.name)[0]}
                  </div>
                  <span className="flex-1 text-sm text-gray-200">{a.player.name}</span>
                  <span className="text-sm">{a.icon} {a.item}</span>
                  <span className="text-xs text-gray-600 w-10 text-right" title={`Has brought ${a.item} ${histCount} time(s)`}>
                    {histCount === 'never' ? '🆕' : histCount}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <p className="mb-3 text-center text-xs text-gray-500">
            🥜×2 · 🍎×1 · 🥤×1{includeIce ? ' · 🧊×2' : ''} · 🍺×{beerCount}
          </p>

          <div className="flex gap-2">
            <button
              onClick={reshufflePreview}
              className="rounded-xl border border-[#30363d] px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
              title="Re-roll tie-breakers"
            >
              🔀
            </button>
            <button
              onClick={executeAutoAssign}
              disabled={autoAssigning}
              className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
            >
              {autoAssigning ? 'Assigning…' : items.length > 0 ? '⚡ Replace & assign' : '⚡ Assign now'}
            </button>
          </div>

          {items.length > 0 && (
            <p className="mt-2 text-center text-xs text-yellow-600">
              ⚠ Replaces {items.length} existing assignment{items.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Manual admin form */}
      {showAdminForm && !showAutoAssign && (
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
