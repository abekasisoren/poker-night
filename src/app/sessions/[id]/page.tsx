'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Session, BringItem, Player } from '@/types'
import { formatDate, formatTime } from '@/lib/utils'
import { usePlayer } from '@/hooks/usePlayer'
import { getStoredPin } from '@/hooks/usePin'
import RsvpList from '@/components/rsvp/RsvpList'
import BringList from '@/components/bring/BringList'
import WhiskeySection from '@/components/bring/WhiskeySection'
import ChipsSection from '@/components/bring/ChipsSection'
import ExpensesTab from '@/components/expenses/ExpensesTab'
import PinModal from '@/components/ui/PinModal'
import { useToast } from '@/components/ui/Toast'

type Tab = 'rsvp' | 'bring' | 'expenses' | 'info'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { player } = usePlayer()
  const { toast } = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('rsvp')
  const [showStartPin, setShowStartPin] = useState(false)
  const [showDeletePin, setShowDeletePin] = useState(false)
  const [hasBringBadge, setHasBringBadge] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/sessions/${id}`).then((r) => r.json()),
      fetch('/api/players').then((r) => r.json()),
    ]).then(([sess, players]) => {
      setSession(sess)
      setAllPlayers(players ?? [])
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetch(`/api/sessions/${id}/bring`)
      .then((r) => r.json())
      .then((items: BringItem[]) => {
        if (items.length === 0) return
        const latestCreatedAt = Math.max(...items.map((i) => new Date(i.created_at).getTime()))
        try {
          const seenStr = localStorage.getItem(`seen_bring_${id}`)
          const seen = seenStr ? parseInt(seenStr) : 0
          setHasBringBadge(latestCreatedAt > seen)
        } catch {}
      })
  }, [id])

  async function patchStatus(status: string) {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, pin }),
    })
    if (res.ok) {
      setSession((s) => s ? { ...s, status: status as Session['status'] } : s)
      toast(status === 'active' ? 'Session is live! 🎲' : 'Session updated', 'success')
    } else {
      toast('Failed to update', 'error')
    }
  }

  async function deleteSession() {
    const pin = getStoredPin()
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (res.ok) {
      router.push('/sessions')
    } else {
      toast('Failed to delete', 'error')
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-500">Loading…</div>
  if (!session) return <div className="py-20 text-center text-red-400">Session not found</div>

  const STATUS_COLORS: Record<string, string> = {
    upcoming: 'bg-blue-500/20 text-blue-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-gray-500/20 text-gray-400',
  }

  const TABS: { key: Tab; label: string; icon: string; badge?: boolean }[] = [
    { key: 'rsvp', label: 'RSVP', icon: '✋' },
    { key: 'bring', label: 'Bring', icon: '🛒', badge: hasBringBadge },
    { key: 'expenses', label: 'Expenses', icon: '💰' },
    { key: 'info', label: 'Info', icon: 'ℹ️' },
  ]

  return (
    <div className="px-4 pt-8">
      <div className="mb-1 flex items-center gap-3">
        <Link href="/sessions" className="text-gray-400 hover:text-white">←</Link>
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_COLORS[session.status]}`}>
          {session.status === 'upcoming' ? 'Upcoming' : session.status === 'active' ? 'Live' : 'Done'}
        </span>
      </div>
      <h1 className="mb-1 text-2xl font-black text-white">{formatDate(session.date)}</h1>
      <p className="mb-1 text-gray-300">{formatTime(session.start_time)} · {session.location}</p>
      {session.host && (
        <p className="mb-4 text-sm text-gray-400">
          Host: <span className="text-gray-200">{session.host.name}</span>
        </p>
      )}

      {(session.status === 'active' || session.status === 'completed') && (
        <Link
          href={`/sessions/${id}/results`}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-3 text-sm font-bold text-yellow-400 hover:bg-yellow-500/20"
        >
          🏆 {session.status === 'completed' ? 'View Results' : 'Enter Results'}
        </Link>
      )}

      {session.status === 'upcoming' && (
        <button
          onClick={() => setShowStartPin(true)}
          className="mb-3 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20"
        >
          ▶ Start Session
        </button>
      )}

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-[#161b22] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              if (t.key === 'bring') {
                setHasBringBadge(false)
                try { localStorage.setItem(`seen_bring_${id}`, Date.now().toString()) } catch {}
              }
            }}
            className={`relative flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-[#0d1117] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.badge && (
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'rsvp' && <RsvpList sessionId={id} currentPlayerId={player?.id} />}
      {tab === 'bring' && (
        <>
          <WhiskeySection
            sessionId={id}
            sessionHost={session.host}
            hostHasWhiskey={session.host_has_whiskey ?? null}
            currentPlayer={player}
            onStatusChange={(value) =>
              setSession((s) => s ? { ...s, host_has_whiskey: value } : s)
            }
          />
          <ChipsSection
            sessionId={id}
            hostHasChips={session.host_has_chips ?? null}
            currentPlayer={player}
            onStatusChange={(value) =>
              setSession((s) => s ? { ...s, host_has_chips: value } : s)
            }
          />
          <BringList sessionId={id} currentPlayer={player} sessionHost={session.host} />
        </>
      )}
      {tab === 'expenses' && (
        <ExpensesTab
          sessionId={id}
          currentPlayer={player}
          allPlayers={allPlayers}
        />
      )}
      {tab === 'info' && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
            <InfoRow label="Date" value={formatDate(session.date)} />
            <InfoRow label="Time" value={formatTime(session.start_time)} />
            <InfoRow label="Location" value={session.location} />
            {session.host && <InfoRow label="Host" value={session.host.name} />}
            {session.notes && <InfoRow label="Notes" value={session.notes} />}
          </div>
          <button
            onClick={() => setShowDeletePin(true)}
            className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-medium text-red-400 hover:bg-red-500/20"
          >
            🗑 Delete Session
          </button>
        </div>
      )}

      <PinModal
        isOpen={showStartPin}
        reason="Start this session"
        onSuccess={() => { setShowStartPin(false); patchStatus('active') }}
        onCancel={() => setShowStartPin(false)}
      />
      <PinModal
        isOpen={showDeletePin}
        reason="Delete this session permanently"
        onSuccess={() => { setShowDeletePin(false); deleteSession() }}
        onCancel={() => setShowDeletePin(false)}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-right text-gray-200">{value}</span>
    </div>
  )
}
