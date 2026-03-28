'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Player } from '@/types'

const STORAGE_KEY = 'poker_player'

interface PlayerContextValue {
  player: Player | null
  setPlayer: (p: Player) => void
  clearPlayer: () => void
  isLoaded: boolean
}

const PlayerContext = createContext<PlayerContextValue>({
  player: null,
  setPlayer: () => {},
  clearPlayer: () => {},
  isLoaded: false,
})

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayerState] = useState<Player | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setPlayerState(JSON.parse(stored))
    } catch {}
    setIsLoaded(true)
  }, [])

  function setPlayer(p: Player) {
    setPlayerState(p)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  }

  function clearPlayer() {
    setPlayerState(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <PlayerContext.Provider value={{ player, setPlayer, clearPlayer, isLoaded }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayerContext() {
  return useContext(PlayerContext)
}
