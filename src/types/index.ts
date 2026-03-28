export interface Player {
  id: string
  name: string
  created_at: string
}

export interface Session {
  id: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM
  location: string
  host_id: string
  host?: Player
  notes: string | null
  status: 'upcoming' | 'active' | 'completed'
  created_at: string
  rsvp_yes_count?: number
  rsvp_maybe_count?: number
}

export interface Rsvp {
  id: string
  session_id: string
  player_id: string
  player?: Player
  response: 'yes' | 'no' | 'maybe' | 'pending'
  updated_at: string
}

export type BringCategory = 'food' | 'drinks' | 'equipment' | 'other'

export interface BringItem {
  id: string
  session_id: string
  player_id: string | null
  player?: Player
  item: string
  category: BringCategory
  is_claimed: boolean
  created_at: string
}

export interface Result {
  id: string
  session_id: string
  player_id: string
  player?: Player
  amount: number
  entered_at: string
}

export interface LeaderboardEntry {
  player_id: string
  player_name: string
  sessions_played: number
  total_net: number
  best_night: number
  worst_night: number
  avg_per_session: number
  winning_sessions: number
  losing_sessions: number
}
