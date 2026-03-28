'use client'

import { useEffect, useState } from 'react'
import { Player } from '@/types'
import { getInitials, getPlayerColor } from '@/lib/utils'
import { usePlayer } from '@/hooks/usePlayer'

interface PlayerPickerProps {
  isOpen: boolean
  onClose: () => void
}

export default function PlayerPicker({ isOpen, onClose }: PlayerPickerProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const { setPlayer } = usePlayer()

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/players')
      .then((r) => r.json())
      .then(setPlayers)
      .catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  function select(p: Player) {
    setPlayer(p)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#1c2128] p-6 pb-10">
        <div className="mb-5 text-center">
          <div className="mb-1 text-2xl">🃏</div>
          <h2 className="text-xl font-bold text-white">Who are you?</h2>
          <p className="mt-1 text-sm text-gray-400">Pick your name to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => select(p)}
              className="flex items-center gap-3 rounded-xl bg-[#0d1117] px-4 py-3 text-left transition-colors hover:bg-[#21262d] active:scale-95"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: getPlayerColor(p.name) }}
              >
                {getInitials(p.name)}
              </div>
              <span className="font-medium text-white">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
