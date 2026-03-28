'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Session } from '@/types'
import SessionCard from '@/components/session/SessionCard'
import { usePlayer } from '@/hooks/usePlayer'

type Filter = 'all' | 'upcoming' | 'completed'

export default function SessionsPage() {
  const { player } = usePlayer()
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try { localStorage.setItem('lastViewedSessionsAt', Date.now().toString()) } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sessions?status=${filter}`)
      .then((r) => r.json())
      .then((data: Session[]) => {
        setSessions(data)
        if (data.length > 0) {
          try {
            const latest = Math.max(...data.map((s) => new Date(s.created_at).getTime()))
            localStorage.setItem('latestSessionCreatedAt', latest.toString())
          } catch {}
        }
      })
      .finally(() => setLoading(false))
  }, [filter])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div className="px-4 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Sessions</h1>
        <Link
          href="/sessions/new"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
        >
          + New
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-emerald-600 text-white'
                : 'bg-[#21262d] text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-gray-400">No sessions found</p>
          <Link
            href="/sessions/new"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white"
          >
            Create one
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} currentPlayerId={player?.id} />
          ))}
        </div>
      )}
    </div>
  )
}
