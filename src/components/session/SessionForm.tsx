'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Player } from '@/types'
import { useToast } from '@/components/ui/Toast'

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
        body: JSON.stringify({ ...form, pin }),
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
