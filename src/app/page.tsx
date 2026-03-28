'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Session } from '@/types'
import { formatDate, formatTime } from '@/lib/utils'
import { usePlayer } from '@/hooks/usePlayer'
import PlayerPicker from '@/components/player/PlayerPicker'
import SessionCard from '@/components/session/SessionCard'

export default function HomePage() {
  const { player, isLoaded } = usePlayer()
  const [showPicker, setShowPicker] = useState(false)
  const [upcoming, setUpcoming] = useState<Session | null>(null)
  const [recent, setRecent] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!player) { setShowPicker(true) }
  }, [player, isLoaded])

  useEffect(() => {
    async function load() {
      const [upcomingRes, completedRes] = await Promise.all([
        fetch('/api/sessions?status=upcoming'),
        fetch('/api/sessions?status=completed'),
      ])
      const upcomingSessions: Session[] = await upcomingRes.json()
      const completedSessions: Session[] = await completedRes.json()

      // Sort upcoming by date ascending to get the next one
      const sorted = upcomingSessions.sort((a, b) => a.date.localeCompare(b.date))
      setUpcoming(sorted[0] ?? null)
      setRecent(completedSessions.slice(0, 3))
      setLoading(false)

      // Update latest session timestamp for notification badge
      const allSessions = [...upcomingSessions, ...completedSessions]
      if (allSessions.length > 0) {
        try {
          const latest = Math.max(...allSessions.map((s) => new Date(s.created_at).getTime()))
          localStorage.setItem('latestSessionCreatedAt', latest.toString())
        } catch {}
      }
    }
    load()
  }, [])

  return (
    <div className="px-4 pt-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">🃏 Poker Night</h1>
          {player && (
            <p className="text-sm text-gray-400">
              Hey <span className="text-white font-medium">{player.name}</span>!
            </p>
          )}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="rounded-full bg-[#21262d] px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
        >
          {player ? '↩ Switch' : 'Who am I?'}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading…</div>
      ) : (
        <>
          {/* Upcoming session */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Next Game</h2>
              <Link href="/sessions/new" className="text-sm text-emerald-400 hover:text-emerald-300">
                + New
              </Link>
            </div>
            {upcoming ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="mb-1 text-xl font-black text-white">{formatDate(upcoming.date)}</div>
                <div className="mb-1 text-gray-300">
                  {formatTime(upcoming.start_time)} · {upcoming.location}
                </div>
                {upcoming.host && (
                  <div className="mb-4 text-sm text-gray-400">
                    Host: <span className="text-gray-200">{upcoming.host.name}</span>
                  </div>
                )}
                <Link
                  href={`/sessions/${upcoming.id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  View Session →
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#30363d] p-8 text-center">
                <p className="mb-3 text-gray-400">No game scheduled yet</p>
                <Link
                  href="/sessions/new"
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  Schedule One
                </Link>
              </div>
            )}
          </section>

          {/* Recent sessions */}
          {recent.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Recent</h2>
                <Link href="/sessions" className="text-sm text-gray-400 hover:text-white">
                  All →
                </Link>
              </div>
              <div className="space-y-2">
                {recent.map((s) => (
                  <SessionCard key={s.id} session={s} currentPlayerId={player?.id} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <PlayerPicker isOpen={showPicker} onClose={() => setShowPicker(false)} />
    </div>
  )
}
