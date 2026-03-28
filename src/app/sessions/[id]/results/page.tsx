'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Player } from '@/types'
import { getStoredPin } from '@/hooks/usePin'
import PinModal from '@/components/ui/PinModal'
import ResultsForm from '@/components/results/ResultsForm'

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [pinReady, setPinReady] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')

  useEffect(() => {
    const stored = getStoredPin()
    if (stored) {
      setPin(stored)
      setPinReady(true)
    } else {
      setShowPin(true)
    }

    // Load players who RSVPed yes
    fetch(`/api/sessions/${id}/rsvps`)
      .then((r) => r.json())
      .then((rsvps: { response: string; player: Player }[]) => {
        const attending = rsvps
          .filter((r) => r.response === 'yes')
          .map((r) => r.player)
        // If nobody RSVPed yes, fall back to all players
        if (attending.length === 0) {
          return fetch('/api/players').then((r) => r.json()).then(setPlayers)
        }
        setPlayers(attending)
      })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="px-4 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/sessions/${id}`} className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-2xl font-black text-white">Results</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading…</div>
      ) : pinReady ? (
        <ResultsForm sessionId={id} attendingPlayers={players} pin={pin} />
      ) : (
        <div className="py-16 text-center text-gray-500">Verifying PIN…</div>
      )}

      <PinModal
        isOpen={showPin}
        reason="Enter results for this session"
        onSuccess={() => {
          const stored = getStoredPin()
          setPin(stored)
          setPinReady(true)
          setShowPin(false)
        }}
        onCancel={() => setShowPin(false)}
      />
    </div>
  )
}
