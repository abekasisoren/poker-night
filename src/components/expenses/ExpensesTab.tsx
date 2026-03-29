'use client'

import { useEffect, useState, useCallback } from 'react'
import { Player, WhiskeyContribution, WhiskeyDrinker, FoodOrder, FoodType, ExpensePayment } from '@/types'

// ── helpers ─────────────────────────────────────────────────────────────────

const FOOD_LABELS: Record<FoodType, string> = {
  pizza: '🍕 Pizza',
  sushi: '🍣 Sushi',
  hamburger: '🍔 Hamburger',
  fried_chicken: '🍗 Fried Chicken',
}

const FOOD_OPTIONS: { value: FoodType; label: string }[] = [
  { value: 'pizza',         label: '🍕 Pizza' },
  { value: 'sushi',         label: '🍣 Sushi' },
  { value: 'hamburger',     label: '🍔 Hamburger' },
  { value: 'fried_chicken', label: '🍗 Fried Chicken' },
]

function fmt(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

/** Compute greedy settlement from balance map */
function computeSettlement(
  balances: Map<string, { name: string; balance: number }>
): ExpensePayment[] {
  const creditors: { id: string; name: string; amount: number }[] = []
  const debtors:   { id: string; name: string; amount: number }[] = []

  for (const [id, { name, balance }] of Array.from(balances.entries())) {
    if (balance > 0.01) creditors.push({ id, name, amount: balance })
    if (balance < -0.01) debtors.push({ id, name, amount: -balance })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const payments: ExpensePayment[] = []
  let ci = 0, di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    const amount = Math.min(c.amount, d.amount)
    if (amount > 0.01) {
      payments.push({
        from_player_id: d.id,
        from_name: d.name,
        to_player_id: c.id,
        to_name: c.name,
        amount: Math.round(amount),
      })
    }
    c.amount -= amount
    d.amount -= amount
    if (c.amount < 0.01) ci++
    if (d.amount < 0.01) di++
  }
  return payments
}

// ── AddFoodOrderForm ─────────────────────────────────────────────────────────

function AddFoodOrderForm({
  sessionId,
  currentPlayer,
  onAdded,
}: {
  sessionId: string
  currentPlayer: Player | null
  onAdded: (order: FoodOrder) => void
}) {
  const [open, setOpen] = useState(false)
  const [foodType, setFoodType] = useState<FoodType>('pizza')
  const [description, setDescription] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!currentPlayer) return
    const cost = parseFloat(totalCost)
    if (!cost || cost <= 0) return
    setSaving(true)
    const res = await fetch(`/api/sessions/${sessionId}/expenses/food`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ordered_by: currentPlayer.id,
        food_type: foodType,
        description: description.trim() || null,
        total_cost: cost,
      }),
    })
    if (res.ok) {
      const order: FoodOrder = await res.json()
      onAdded(order)
      setOpen(false)
      setDescription('')
      setTotalCost('')
      setFoodType('pizza')
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-orange-500/40 py-3 text-sm text-orange-400 hover:border-orange-500/70 hover:text-orange-300"
      >
        + Add Food Order
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
      <p className="text-sm font-medium text-orange-300">New Food Order</p>

      {/* Food type */}
      <div className="grid grid-cols-2 gap-2">
        {FOOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFoodType(opt.value)}
            className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
              foodType === opt.value
                ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                : 'border-[#30363d] text-gray-400 hover:text-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. 2 large + 1 small (optional)"
        className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
      />

      {/* Total cost */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₪</span>
        <input
          type="number"
          inputMode="decimal"
          value={totalCost}
          onChange={(e) => setTotalCost(e.target.value)}
          placeholder="Total cost"
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-[#30363d] py-2 text-sm text-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !currentPlayer || !totalCost}
          className="flex-1 rounded-xl bg-orange-600 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add Order'}
        </button>
      </div>
    </div>
  )
}

// ── FoodOrderCard ─────────────────────────────────────────────────────────────

function FoodOrderCard({
  order,
  sessionId,
  currentPlayer,
  allPlayers,
  onUpdated,
  onDeleted,
}: {
  order: FoodOrder
  sessionId: string
  currentPlayer: Player | null
  allPlayers: Player[]
  onUpdated: (order: FoodOrder) => void
  onDeleted: (orderId: string) => void
}) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [editingCost, setEditingCost] = useState(false)
  const [costInput, setCostInput] = useState(String(order.total_cost))

  const participantIds = new Set(order.participants.map((p) => p.player_id))
  const isOrderer = currentPlayer?.id === order.ordered_by

  async function toggleEat(playerId: string) {
    setToggling(playerId)
    const res = await fetch(`/api/sessions/${sessionId}/expenses/food/${order.id}/eat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    })
    if (res.ok) {
      // Refetch the order with updated participants
      const refreshed = await fetch(`/api/sessions/${sessionId}/expenses/food`)
      if (refreshed.ok) {
        const orders: FoodOrder[] = await refreshed.json()
        const updated = orders.find((o) => o.id === order.id)
        if (updated) onUpdated(updated)
      }
    }
    setToggling(null)
  }

  async function saveCost() {
    const cost = parseFloat(costInput)
    if (!cost || cost <= 0) return
    const res = await fetch(`/api/sessions/${sessionId}/expenses/food/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_cost: cost }),
    })
    if (res.ok) {
      const updated: FoodOrder = await res.json()
      onUpdated(updated)
    }
    setEditingCost(false)
  }

  async function deleteOrder() {
    const res = await fetch(`/api/sessions/${sessionId}/expenses/food/${order.id}`, {
      method: 'DELETE',
    })
    if (res.ok) onDeleted(order.id)
  }

  const perPerson = order.participants.length > 0
    ? order.total_cost / order.participants.length
    : 0

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-base font-bold text-white">{FOOD_LABELS[order.food_type]}</span>
          {order.description && (
            <p className="text-xs text-gray-400 mt-0.5">{order.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            Ordered by <span className="text-gray-300">{order.orderer?.name ?? '?'}</span>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {editingCost ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400">₪</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                onBlur={saveCost}
                onKeyDown={(e) => e.key === 'Enter' && saveCost()}
                className="w-20 rounded border border-orange-500 bg-[#0d1117] px-2 py-1 text-sm text-white focus:outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => isOrderer && setEditingCost(true)}
              className={`text-lg font-black text-orange-400 ${isOrderer ? 'cursor-pointer' : 'cursor-default'}`}
              title={isOrderer ? 'Tap to edit cost' : undefined}
            >
              {fmt(order.total_cost)}
            </button>
          )}
          {order.participants.length > 0 && (
            <p className="text-xs text-gray-500">{fmt(perPerson)}/person</p>
          )}
        </div>
      </div>

      {/* Who ate — ALL players can tap */}
      <div>
        <p className="mb-2 text-xs text-gray-500 uppercase tracking-wide">Who ate?</p>
        <div className="flex flex-wrap gap-2">
          {allPlayers.map((p) => {
            const ate = participantIds.has(p.id)
            const isMe = currentPlayer?.id === p.id
            return (
              <button
                key={p.id}
                disabled={toggling === p.id}
                onClick={() => toggleEat(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  ate
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-[#30363d] text-gray-500 hover:border-gray-400 hover:text-gray-300'
                } ${isMe ? 'ring-1 ring-white/20' : ''}`}
              >
                {ate ? '✓ ' : ''}{p.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Delete (orderer only) */}
      {isOrderer && (
        <button
          onClick={deleteOrder}
          className="text-xs text-red-400/70 hover:text-red-400"
        >
          🗑 Remove order
        </button>
      )}
    </div>
  )
}

// ── Settlement ────────────────────────────────────────────────────────────────

function SettlementSection({ payments }: { payments: ExpensePayment[] }) {
  const text = payments
    .map((p) => `${p.from_name} → ${p.to_name}: ${fmt(p.amount)}`)
    .join('\n')

  function shareOrCopy() {
    const message = `💰 Poker Night Expenses\n\n${text}\n\nSent via Poker Night Manager`
    if (navigator.share) {
      navigator.share({ text: message }).catch(() => {})
    } else {
      navigator.clipboard.writeText(message).catch(() => {})
      alert('Copied to clipboard!')
    }
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <p className="text-sm font-bold text-emerald-400">💰 Settlement</p>
      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">All settled — nothing owed!</p>
      ) : (
        <>
          <div className="space-y-2">
            {payments.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-[#0d1117] px-3 py-2"
              >
                <span className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{p.from_name}</span>
                  <span className="mx-1 text-gray-500">→</span>
                  <span className="font-semibold text-white">{p.to_name}</span>
                </span>
                <span className="text-sm font-bold text-emerald-400">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={shareOrCopy}
            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20"
          >
            📤 Share Payment Summary
          </button>
        </>
      )}
    </div>
  )
}

// ── Main ExpensesTab ─────────────────────────────────────────────────────────

interface ExpensesTabProps {
  sessionId: string
  currentPlayer: Player | null
  allPlayers: Player[]
}

export default function ExpensesTab({ sessionId, currentPlayer, allPlayers }: ExpensesTabProps) {
  const [whiskeyContribs, setWhiskeyContribs] = useState<WhiskeyContribution[]>([])
  const [whiskeyDrinkers, setWhiskeyDrinkers] = useState<WhiskeyDrinker[]>([])
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingWhiskey, setTogglingWhiskey] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/expenses`)
    if (res.ok) {
      const data = await res.json()
      setWhiskeyContribs(data.whiskey_contributions ?? [])
      setWhiskeyDrinkers(data.whiskey_drinkers ?? [])
      setFoodOrders(data.food_orders ?? [])
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // ── Whiskey toggle ──────────────────────────────────────────────────────────
  async function toggleWhiskeyDrinker(playerId: string) {
    setTogglingWhiskey(playerId)
    const res = await fetch(`/api/sessions/${sessionId}/expenses/whiskey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.action === 'removed') {
        setWhiskeyDrinkers((prev) => prev.filter((d) => d.player_id !== playerId))
      } else if (data.action === 'added') {
        setWhiskeyDrinkers((prev) => [...prev, data.drinker])
      }
    }
    setTogglingWhiskey(null)
  }

  // ── Settlement computation ──────────────────────────────────────────────────
  const settlement = computeExpenseSettlement(whiskeyContribs, whiskeyDrinkers, foodOrders)

  if (loading) return <div className="py-10 text-center text-gray-500">Loading expenses…</div>

  const drinkerIds = new Set(whiskeyDrinkers.map((d) => d.player_id))

  return (
    <div className="space-y-5 pb-8">

      {/* ── Whiskey drinkers ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🥃</span>
          <p className="text-sm font-bold text-amber-400">Who drank whiskey?</p>
        </div>

        {whiskeyContribs.length === 0 ? (
          <p className="text-xs text-gray-500">No whiskey was brought to this session.</p>
        ) : (
          <>
            {/* Contribution summary */}
            <div className="rounded-lg bg-[#0d1117] px-3 py-2 space-y-1">
              {whiskeyContribs.map((c) => (
                <div key={c.id} className="flex justify-between text-xs">
                  <span className="text-gray-300">{c.player?.name ?? '?'}</span>
                  <span className="text-amber-400">
                    {c.bottles}× bottle{c.bottles !== 1 ? 's' : ''}
                    {c.price_per_bottle != null ? ` · ${fmt(c.price_per_bottle)}/ea` : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* All players toggle */}
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tap to mark drinkers</p>
            <div className="flex flex-wrap gap-2">
              {allPlayers.map((p) => {
                const drank = drinkerIds.has(p.id)
                const isMe = currentPlayer?.id === p.id
                return (
                  <button
                    key={p.id}
                    disabled={togglingWhiskey === p.id}
                    onClick={() => toggleWhiskeyDrinker(p.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      drank
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-[#30363d] text-gray-500 hover:border-gray-400 hover:text-gray-300'
                    } ${isMe ? 'ring-1 ring-white/20' : ''}`}
                  >
                    {drank ? '🥃 ' : ''}{p.name}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Food orders ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-orange-400">🍕 Food Orders</p>

        {foodOrders.length === 0 && (
          <p className="text-xs text-gray-500">No food orders yet.</p>
        )}

        {foodOrders.map((order) => (
          <FoodOrderCard
            key={order.id}
            order={order}
            sessionId={sessionId}
            currentPlayer={currentPlayer}
            allPlayers={allPlayers}
            onUpdated={(updated) =>
              setFoodOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
            onDeleted={(id) =>
              setFoodOrders((prev) => prev.filter((o) => o.id !== id))
            }
          />
        ))}

        <AddFoodOrderForm
          sessionId={sessionId}
          currentPlayer={currentPlayer}
          onAdded={(order) => setFoodOrders((prev) => [...prev, order])}
        />
      </div>

      {/* ── Settlement ───────────────────────────────────────────────── */}
      <SettlementSection payments={settlement} />
    </div>
  )
}

// ── Settlement engine ─────────────────────────────────────────────────────────

function computeExpenseSettlement(
  whiskeyContribs: WhiskeyContribution[],
  whiskeyDrinkers: WhiskeyDrinker[],
  foodOrders: FoodOrder[]
): ExpensePayment[] {
  const balances = new Map<string, { name: string; balance: number }>()

  function ensure(id: string, name: string) {
    if (!balances.has(id)) balances.set(id, { name, balance: 0 })
  }
  function add(id: string, amount: number) {
    const b = balances.get(id)!
    b.balance += amount
  }

  // ── Whiskey ───────────────────────────────────────────────────────────────
  // Total whiskey cost = sum of (bottles × price_per_bottle) for contribs with price
  const totalWhiskeyCost = whiskeyContribs.reduce((sum, c) => {
    if (c.price_per_bottle == null) return sum
    return sum + c.bottles * c.price_per_bottle
  }, 0)

  if (totalWhiskeyCost > 0 && whiskeyDrinkers.length > 0) {
    const perDrinker = totalWhiskeyCost / whiskeyDrinkers.length

    // Buyers are owed proportionally (by their cost share)
    const totalBottles = whiskeyContribs.reduce((s, c) => s + (c.price_per_bottle != null ? c.bottles : 0), 0)
    for (const c of whiskeyContribs) {
      if (c.price_per_bottle == null || !c.player) continue
      const share = (c.bottles / totalBottles) * totalWhiskeyCost
      ensure(c.player_id, c.player.name)
      add(c.player_id, share) // creditor
    }

    // Drinkers owe
    for (const d of whiskeyDrinkers) {
      if (!d.player) continue
      ensure(d.player_id, d.player.name)
      add(d.player_id, -perDrinker) // debtor
    }
  }

  // ── Food ─────────────────────────────────────────────────────────────────
  for (const order of foodOrders) {
    if (!order.orderer || order.participants.length === 0) continue
    const perPerson = order.total_cost / order.participants.length

    // Orderer is owed the full amount
    ensure(order.ordered_by, order.orderer.name)
    add(order.ordered_by, order.total_cost)

    // Each participant owes their share
    for (const p of order.participants) {
      if (!p.player) continue
      ensure(p.player_id, p.player.name)
      add(p.player_id, -perPerson)
    }
  }

  return computeSettlement(balances)
}
