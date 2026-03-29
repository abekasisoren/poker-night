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
  host_has_whiskey: boolean | null
  host_has_chips: boolean | null
  expense_status: 'collecting' | 'settled' | null
  created_at: string
  rsvp_yes_count?: number
  rsvp_maybe_count?: number
}

export interface WhiskeyContribution {
  id: string
  session_id: string
  player_id: string
  player?: Player
  bottles: number
  price_per_bottle: number | null
  created_at: string
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

// ── Post-game expenses ───────────────────────────────────────────────────────

export interface WhiskeyDrinker {
  id: string
  session_id: string
  player_id: string
  player?: Player
  created_at: string
}

export type FoodType = 'pizza' | 'sushi' | 'hamburger' | 'fried_chicken'

export interface FoodParticipant {
  id: string
  food_order_id: string
  player_id: string
  player?: Player
  created_at: string
}

export interface FoodOrder {
  id: string
  session_id: string
  ordered_by: string
  orderer?: Player
  food_type: FoodType
  description: string | null
  total_cost: number
  participants: FoodParticipant[]
  created_at: string
}

/** Computed settlement: from_player owes amount to to_player */
export interface ExpensePayment {
  from_player_id: string
  from_name: string
  to_player_id: string
  to_name: string
  amount: number
}

/** Tracks whether a player has submitted their expense answers */
export interface ExpenseResponse {
  id: string
  session_id: string
  player_id: string
  player?: Player
  answered_at: string
}

/** A locked debt record created when admin finalises settlement */
export interface ExpenseDebt {
  id: string
  session_id: string
  from_player_id: string
  from_player?: Player
  to_player_id: string
  to_player?: Player
  amount: number
  paid_at: string | null
  created_at: string
}
