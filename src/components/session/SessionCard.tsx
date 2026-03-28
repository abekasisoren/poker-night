import Link from 'next/link'
import { Session } from '@/types'
import { formatDate, formatTime, cn } from '@/lib/utils'

interface SessionCardProps {
  session: Session
  currentPlayerId?: string
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  active: 'Live',
  completed: 'Done',
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-gray-500/20 text-gray-400',
}

export default function SessionCard({ session }: SessionCardProps) {
  return (
    <Link href={`/sessions/${session.id}`}>
      <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 transition-colors hover:border-[#444d56] active:scale-[0.98]">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-white">{formatDate(session.date)}</p>
            <p className="text-sm text-gray-400">
              {formatTime(session.start_time)} · {session.location}
            </p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', STATUS_COLORS[session.status])}>
            {STATUS_LABELS[session.status]}
          </span>
        </div>

        {session.host && (
          <p className="text-sm text-gray-400">
            Host: <span className="font-medium text-gray-200">{session.host.name}</span>
          </p>
        )}

        {(session.rsvp_yes_count !== undefined) && (
          <p className="mt-1 text-sm text-gray-400">
            <span className="font-medium text-emerald-400">{session.rsvp_yes_count}</span> coming
            {session.rsvp_maybe_count ? ` · ${session.rsvp_maybe_count} maybe` : ''}
          </p>
        )}
      </div>
    </Link>
  )
}
