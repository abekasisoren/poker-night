'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Player } from '@/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

// ── Shared 3-way toggle used in the host-supplies section ───────────────────
function SupplyToggle({
  value,
  onChange,
  yesColor,
}: {
  value: boolean | null
  onChange: (v: boolean | null) => void
  yesColor: 'amber' | 'purple'
}) {
  const opts: { v: boolean | null; label: string; icon: string }[] = [
    { v: null,  label: 'Not sure', icon: '❓' },
    { v: true,  label: 'Has it',   icon: '✓' },
    { v: false, label: 'Needs it', icon: '⚠' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map((opt) => (
        <button
          key={String(opt.v)}
          type="button"
          onClick={() => onChange(opt.v)}
          className={cn(
            'flex-1 rounded-xl border py-2 text-xs font-medium transition-colors',
            value === opt.v
              ? opt.v === true
                ? yesColor === 'amber'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-purple-500 bg-purple-500/10 text-purple-400'
                : opt.v === false
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-gray-500 bg-gray-500/10 text-gray-300'
              : 'border-[#30363d] text-gray-500 hover:text-gray-300'
          )}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  )
}

interface SessionFormProps {
  players: Player[]
  pin: string
  onCreated?: () => void
}

export default function SessionForm({ players, pin, onCreated }: SessionFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    date: '',
    start_time: '20:00',
    location: '',
    host_id: '',
    notes: '',
  })
  // null = unknown/not sure, true = host has it, false = needs it
  const [hostHasWhiskey, setHostHasWhiskey] = useState<boolean | null>(null)
  const [hostHasChips, setHostHasChips] = useState<boolean | null>(null)

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date || !form.start_time || !form.location || !form.host_id) {
      toast('Fill in all required fields', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, host_has_whiskey: hostHasWhiskey, host_has_chips: hostHasChips, pin }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast(error ?? 'Error creating session', 'error')
        return
      }
      const session = await res.json()
      toast('Session created!', 'success')
      if (onCreated) onCreated()
      router.push(`/sessions/${session.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-gray-400">Date *</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Start Time *</label>
        <input
          type="time"
          value={form.start_time}
          onChange={(e) => set('start_time', e.target.value)}
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Location *</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          placeholder="e.g. Oren's place"
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-400">Host *</label>
        <select
          value={form.host_id}
          onChange={(e) => set('host_id', e.target.value)}
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          required
        >
          <option value="">— Pick host —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {/* Host supplies */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-4">
        <p className="text-sm font-medium text-gray-300">What does the host have?</p>

        {/* Whiskey */}
        <div>
          <label className="mb-2 block text-xs text-gray-500">🥃 Whiskey</label>
          <SupplyToggle
            value={hostHasWhiskey}
            onChange={setHostHasWhiskey}
            yesColor="amber"
          />
        </div>

        {/* Poker chips & kit */}
        <div>
          <label className="mb-2 block text-xs text-gray-500">🃏 Poker Chips &amp; Kit</label>
          <SupplyToggle
            value={hostHasChips}
            onChange={setHostHasChips}
            yesColor="purple"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-400">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Any extra info…"
          rows={3}
          className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create Session'}
      </button>
    </form>
  )
}
