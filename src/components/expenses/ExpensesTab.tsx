'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Player, WhiskeyContribution, WhiskeyDrinker,
  FoodOrder, FoodType, ExpenseDebt, ExpenseResponse,
} from '@/types'
import PinModal from '@/components/ui/PinModal'
import { getStoredPin } from '@/hooks/usePin'

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
  return '₪' + Math.round(n).toLocaleString('he-IL')
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
      <div className="grid grid-cols-2 gap-2">
        {FOOD_OPTIONS.map((opt) => (
          <button key={opt.value} type="button" onClick={() => setFoodType(opt.value)}
            className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
              foodType === opt.value
                ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                : 'border-[#30363d] text-gray-400 hover:text-gray-200'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. 2 large + 1 small (optional)"
        className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none" />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₪</span>
        <input type="number" inputMode="decimal" value={totalCost} onChange={(e) => setTotalCost(e.target.value)}
          placeholder="Total cost"
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-[#30363d] py-2 text-sm text-gray-400">Cancel</button>
        <button onClick={submit} disabled={saving || !currentPlayer || !totalCost}
          className="flex-1 rounded-xl bg-orange-600 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50">
          {saving ? 'Saving…' : 'Add Order'}
        </button>
      </div>
    </div>
  )
}

// ── PlayerAnswerForm ──────────────────────────────────────────────────────────

function PlayerAnswerForm({
  sessionId,
  currentPlayer,
  foodOrders,
  alreadyAnswered,
  onAnswered,
}: {
  sessionId: string
  currentPlayer: Player | null
  foodOrders: FoodOrder[]
  alreadyAnswered: boolean
  onAnswered: () => void
}) {
  const [drankWhiskey, setDrankWhiskey] = useState(false)
  const [ate, setAte] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  if (!currentPlayer) return null
  if (alreadyAnswered) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
        ✓ You answered — thanks!
      </div>
    )
  }

  function toggleOrder(id: string) {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function submit() {
    setSaving(true)
    const res = await fetch(`/api/sessions/${sessionId}/expenses/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: currentPlayer!.id,
        drank_whiskey: drankWhiskey,
        food_order_ids: ate ? selectedOrderIds : [],
      }),
    })
    if (res.ok) onAnswered()
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
      <p className="text-sm font-bold text-blue-300">💬 Your turn to answer</p>

      {/* Whiskey */}
      <div>
        <p className="mb-2 text-xs text-gray-400 uppercase tracking-wide">Did you drink whiskey?</p>
        <div className="flex gap-2">
          <button onClick={() => setDrankWhiskey(true)}
            className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
              drankWhiskey ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-[#30363d] text-gray-400'
            }`}>
            🥃 Yes
          </button>
          <button onClick={() => setDrankWhiskey(false)}
            className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
              !drankWhiskey ? 'border-gray-500 bg-gray-500/15 text-gray-300' : 'border-[#30363d] text-gray-400'
            }`}>
            No
          </button>
        </div>
      </div>

      {/* Food */}
      <div>
        <p className="mb-2 text-xs text-gray-400 uppercase tracking-wide">Did you eat?</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setAte(true)}
            className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
              ate ? 'border-orange-500 bg-orange-500/15 text-orange-300' : 'border-[#30363d] text-gray-400'
            }`}>
            🍕 Yes
          </button>
          <button onClick={() => { setAte(false); setSelectedOrderIds([]) }}
            className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
              !ate ? 'border-gray-500 bg-gray-500/15 text-gray-300' : 'border-[#30363d] text-gray-400'
            }`}>
            No
          </button>
        </div>

        {ate && foodOrders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">What did you eat? (tap all that apply)</p>
            {foodOrders.map((order) => {
              const selected = selectedOrderIds.includes(order.id)
              return (
                <button key={order.id} onClick={() => toggleOrder(order.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                      : 'border-[#30363d] text-gray-400 hover:text-gray-200'
                  }`}>
                  <span className="font-medium">{FOOD_LABELS[order.food_type]}</span>
                  {order.description && <span className="ml-2 text-xs text-gray-500">{order.description}</span>}
                  <span className="ml-2 text-xs text-gray-500">{fmt(order.total_cost)}</span>
                  {selected && <span className="float-right text-orange-400">✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {ate && foodOrders.length === 0 && (
          <p className="text-xs text-gray-500">No food orders have been added yet. Someone needs to add them first.</p>
        )}
      </div>

      <button onClick={submit} disabled={saving || (ate && selectedOrderIds.length === 0 && foodOrders.length > 0)}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
        {saving ? 'Submitting…' : 'Submit My Answers'}
      </button>
    </div>
  )
}

// ── DebtList ─────────────────────────────────────────────────────────────────

function DebtList({
  debts,
  sessionId,
  currentPlayer,
  onDebtUpdated,
}: {
  debts: ExpenseDebt[]
  sessionId: string
  currentPlayer: Player | null
  onDebtUpdated: (debt: ExpenseDebt) => void
}) {
  const [marking, setMarking] = useState<string | null>(null)

  async function togglePaid(debt: ExpenseDebt) {
    setMarking(debt.id)
    const res = await fetch(`/api/sessions/${sessionId}/expenses/debts/${debt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !debt.paid_at }),
    })
    if (res.ok) {
      const updated: ExpenseDebt = await res.json()
      onDebtUpdated(updated)
    }
    setMarking(null)
  }

  function shareAll() {
    const lines = debts
      .filter((d) => !d.paid_at)
      .map((d) => `${d.from_player?.name} → ${d.to_player?.name}: ${fmt(d.amount)}`)
    const text = `💰 Poker Night Settlement\n\n${lines.join('\n')}\n\nPay up! 🃏`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
      alert('Copied to clipboard!')
    }
  }

  const unpaid = debts.filter((d) => !d.paid_at)
  const paid   = debts.filter((d) => d.paid_at)

  return (
    <div className="space-y-2">
      {unpaid.map((debt) => {
        const isCreditor = currentPlayer?.id === debt.to_player_id
        return (
          <div key={debt.id} className="rounded-xl border border-[#30363d] bg-[#161b22] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-sm text-white font-semibold">{debt.from_player?.name}</span>
                <span className="mx-1.5 text-gray-500">→</span>
                <span className="text-sm text-white font-semibold">{debt.to_player?.name}</span>
              </div>
              <span className="text-sm font-black text-red-400">{fmt(debt.amount)}</span>
            </div>
            {/* Creditor can mark as received */}
            {isCreditor && (
              <button onClick={() => togglePaid(debt)} disabled={marking === debt.id}
                className="mt-2 w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50">
                {marking === debt.id ? '…' : '✓ Mark as Received'}
              </button>
            )}
          </div>
        )
      })}

      {paid.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600 uppercase tracking-wide mt-3">Settled</p>
          {paid.map((debt) => (
            <div key={debt.id} className="rounded-xl border border-[#21262d] bg-[#0d1117] p-3 opacity-50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-400 line-through">
                  {debt.from_player?.name} → {debt.to_player?.name}
                </span>
                <span className="text-sm text-gray-500 line-through">{fmt(debt.amount)}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-0.5">✓ Paid</p>
            </div>
          ))}
        </div>
      )}

      {unpaid.length > 0 && (
        <button onClick={shareAll}
          className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 py-3 text-sm font-bold text-blue-400 hover:bg-blue-500/20">
          📤 Share Payment Summary
        </button>
      )}
    </div>
  )
}

// ── Main ExpensesTab ─────────────────────────────────────────────────────────

interface ExpensesTabProps {
  sessionId: string
  expenseStatus: 'collecting' | 'settled' | null
  currentPlayer: Player | null
  allPlayers: Player[]
  onStatusChange: (status: 'collecting' | 'settled') => void
}

export default function ExpensesTab({
  sessionId,
  expenseStatus,
  currentPlayer,
  allPlayers,
  onStatusChange,
}: ExpensesTabProps) {
  const [whiskeyContribs, setWhiskeyContribs] = useState<WhiskeyContribution[]>([])
  const [whiskeyDrinkers, setWhiskeyDrinkers] = useState<WhiskeyDrinker[]>([])
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([])
  const [responses, setResponses] = useState<ExpenseResponse[]>([])
  const [debts, setDebts] = useState<ExpenseDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingWhiskey, setTogglingWhiskey] = useState<string | null>(null)
  const [showEndPin, setShowEndPin] = useState(false)
  const [showFinalizePin, setShowFinalizePin] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/expenses`)
    if (res.ok) {
      const data = await res.json()
      setWhiskeyContribs(data.whiskey_contributions ?? [])
      setWhiskeyDrinkers(data.whiskey_drinkers ?? [])
      setFoodOrders(data.food_orders ?? [])
      setResponses(data.responses ?? [])
      setDebts(data.debts ?? [])
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => { load() }, [load])

  async function endSession() {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${sessionId}/expenses/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, action: 'collect' }),
    })
    if (res.ok) onStatusChange('collecting')
  }

  async function finalize() {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${sessionId}/expenses/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, action: 'finalize' }),
    })
    if (res.ok) {
      onStatusChange('settled')
      await load()
    }
  }

  // Manual whiskey toggle (admin-style, shown in collecting mode alongside answer form)
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

  const drinkerIds = new Set(whiskeyDrinkers.map((d) => d.player_id))
  const respondedIds = new Set(responses.map((r) => r.player_id))
  const myAnswered = currentPlayer ? respondedIds.has(currentPlayer.id) : false
  const notAnswered = allPlayers.filter((p) => !respondedIds.has(p.id))

  if (loading) return <div className="py-10 text-center text-gray-500">Loading expenses…</div>

  // ── PRE-COLLECTION: not started yet ────────────────────────────────────────
  if (!expenseStatus) {
    return (
      <div className="space-y-4 pb-8">
        {/* Food orders — can be added any time */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-orange-400">🍕 Food Orders</p>
          {foodOrders.length === 0 && <p className="text-xs text-gray-500">No food orders yet.</p>}
          {foodOrders.map((order) => (
            <div key={order.id} className="rounded-xl border border-[#30363d] bg-[#161b22] p-3">
              <div className="flex justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{FOOD_LABELS[order.food_type]}</span>
                  {order.description && <p className="text-xs text-gray-400">{order.description}</p>}
                  <p className="text-xs text-gray-500">by {order.orderer?.name}</p>
                </div>
                <span className="text-sm font-black text-orange-400">{fmt(order.total_cost)}</span>
              </div>
            </div>
          ))}
          <AddFoodOrderForm sessionId={sessionId} currentPlayer={currentPlayer}
            onAdded={(o) => setFoodOrders((prev) => [...prev, o])} />
        </div>

        {/* Admin: End Session button */}
        <button onClick={() => setShowEndPin(true)}
          className="w-full rounded-xl border border-red-500/40 bg-red-500/10 py-4 text-sm font-bold text-red-400 hover:bg-red-500/20">
          🔴 End Session &amp; Request Expense Answers
        </button>
        <p className="text-center text-xs text-gray-600">
          Press when the game is over — players will be asked to answer expense questions
        </p>

        <PinModal isOpen={showEndPin} reason="End session and request expense answers"
          onSuccess={() => { setShowEndPin(false); endSession() }}
          onCancel={() => setShowEndPin(false)} />
      </div>
    )
  }

  // ── COLLECTING: answers being gathered ─────────────────────────────────────
  if (expenseStatus === 'collecting') {
    return (
      <div className="space-y-5 pb-8">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <p className="text-sm font-bold text-yellow-400">⏳ Collecting Answers</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {respondedIds.size}/{allPlayers.length} players answered
          </p>
          {notAnswered.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Waiting for: {notAnswered.map((p) => p.name).join(', ')}
            </p>
          )}
        </div>

        {/* Player's own answer form */}
        <PlayerAnswerForm
          sessionId={sessionId}
          currentPlayer={currentPlayer}
          foodOrders={foodOrders}
          alreadyAnswered={myAnswered}
          onAnswered={async () => {
            await load()
          }}
        />

        {/* Food orders (still addable during collection) */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-orange-400">🍕 Food Orders</p>
          {foodOrders.length === 0 && <p className="text-xs text-gray-500">No food orders yet.</p>}
          {foodOrders.map((order) => (
            <div key={order.id} className="rounded-xl border border-[#30363d] bg-[#161b22] p-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-bold text-white">{FOOD_LABELS[order.food_type]}</span>
                  {order.description && <p className="text-xs text-gray-400">{order.description}</p>}
                  <p className="text-xs text-gray-500">by {order.orderer?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.participants.length} ate · {fmt(order.total_cost / Math.max(order.participants.length, 1))}/person
                  </p>
                </div>
                <span className="text-sm font-black text-orange-400">{fmt(order.total_cost)}</span>
              </div>
              {/* Who ate summary */}
              {order.participants.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {order.participants.map((p) => (
                    <span key={p.id} className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-xs text-orange-300">
                      {p.player?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <AddFoodOrderForm sessionId={sessionId} currentPlayer={currentPlayer}
            onAdded={(o) => setFoodOrders((prev) => [...prev, o])} />
        </div>

        {/* Whiskey summary */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <p className="text-sm font-bold text-amber-400">🥃 Whiskey Drinkers</p>
          {drinkerIds.size === 0 ? (
            <p className="text-xs text-gray-500">No one marked yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allPlayers.filter((p) => drinkerIds.has(p.id)).map((p) => (
                <span key={p.id} className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
                  🥃 {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Admin: Finalize */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <p className="text-sm font-bold text-emerald-400">✅ Ready to Calculate?</p>
          <p className="text-xs text-gray-400">
            Once you finalize, the settlement is locked and players will see what they owe.
          </p>
          <button onClick={() => setShowFinalizePin(true)}
            className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-600">
            Calculate &amp; Lock Settlement
          </button>
        </div>

        <PinModal isOpen={showFinalizePin} reason="Finalize and lock the settlement"
          onSuccess={() => { setShowFinalizePin(false); finalize() }}
          onCancel={() => setShowFinalizePin(false)} />
      </div>
    )
  }

  // ── SETTLED ────────────────────────────────────────────────────────────────
  const allPaid = debts.length > 0 && debts.every((d) => d.paid_at)

  return (
    <div className="space-y-4 pb-8">
      <div className={`rounded-xl border px-4 py-3 ${
        allPaid
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-yellow-500/30 bg-yellow-500/5'
      }`}>
        <p className={`text-sm font-bold ${allPaid ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {allPaid ? '🎉 All Settled!' : '💰 Settlement'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {allPaid
            ? 'Everyone has paid up.'
            : `${debts.filter((d) => d.paid_at).length}/${debts.length} payments confirmed`}
        </p>
      </div>

      {debts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">All settled — nothing owed!</p>
      ) : (
        <DebtList
          debts={debts}
          sessionId={sessionId}
          currentPlayer={currentPlayer}
          onDebtUpdated={(updated) =>
            setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
          }
        />
      )}

      {/* Food + whiskey summary */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Breakdown</p>
        {whiskeyContribs.length > 0 && (
          <div>
            <p className="text-xs text-amber-400 mb-1">🥃 Whiskey</p>
            {whiskeyContribs.map((c) => (
              <div key={c.id} className="flex justify-between text-xs text-gray-400">
                <span>{c.player?.name} brought {c.bottles}×</span>
                {c.price_per_bottle != null && <span>{fmt(c.bottles * c.price_per_bottle)}</span>}
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-0.5">
              Drank: {whiskeyDrinkers.map((d) => d.player?.name).join(', ') || 'nobody'}
            </p>
          </div>
        )}
        {foodOrders.length > 0 && (
          <div>
            <p className="text-xs text-orange-400 mb-1">🍕 Food</p>
            {foodOrders.map((o) => (
              <div key={o.id} className="flex justify-between text-xs text-gray-400">
                <span>{FOOD_LABELS[o.food_type]} ({o.participants.length} ate)</span>
                <span>{fmt(o.total_cost)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
