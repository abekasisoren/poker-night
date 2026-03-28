'use client'

import { LeaderboardEntry } from '@/types'
import { getInitials, getPlayerColor, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

export default function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (!entries.length) {
    return <p className="py-12 text-center text-gray-500">No results yet. Play some poker!</p>
  }

  return (
    <div className="space-y-2">
      {entries.map((e, i) => {
        const net = Number(e.total_net)
        const winRate = e.sessions_played > 0
          ? Math.round((e.winning_sessions / e.sessions_played) * 100)
          : 0

        return (
          <div
            key={e.player_id}
            className={cn(
              'rounded-xl border p-4',
              i === 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-[#30363d] bg-[#161b22]'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-center text-xl">
                {RANK_ICONS[i] ?? <span className="text-sm font-bold text-gray-500">#{i + 1}</span>}
              </span>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: getPlayerColor(e.player_name) }}
              >
                {getInitials(e.player_name)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{e.player_name}</p>
                <p className="text-xs text-gray-400">
                  {e.sessions_played} games · {winRate}% win rate
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-lg font-black', net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(net)}
                </p>
                <p className="text-xs text-gray-500">
                  avg {formatCurrency(Number(e.avg_per_session))}
                </p>
              </div>
            </div>
            {e.sessions_played > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#30363d] pt-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Best night</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(Number(e.best_night))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Worst night</p>
                  <p className="text-sm font-semibold text-red-400">
                    {formatCurrency(Number(e.worst_night))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
