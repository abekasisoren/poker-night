'use client'

import { useEffect, useState } from 'react'
import { LeaderboardEntry } from '@/types'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'

type Scope = 'all' | '10' | '5'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<Scope>('all')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?scope=${scope}`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [scope])

  const SCOPES: { key: Scope; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: '10', label: 'Last 10' },
    { key: '5', label: 'Last 5' },
  ]

  return (
    <div className="px-4 pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">🏆 Standings</h1>
        <p className="mt-1 text-sm text-gray-400">All-time win/loss records</p>
      </div>

      <div className="mb-5 flex gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              scope === s.key
                ? 'bg-emerald-600 text-white'
                : 'bg-[#21262d] text-gray-400 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading…</div>
      ) : (
        <LeaderboardTable entries={entries} />
      )}
    </div>
  )
}
