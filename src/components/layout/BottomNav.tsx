'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function BottomNav() {
  const pathname = usePathname()
  const [hasSessionBadge, setHasSessionBadge] = useState(false)

  useEffect(() => {
    if (pathname === '/sessions') {
      try { localStorage.setItem('lastViewedSessionsAt', Date.now().toString()) } catch {}
      setHasSessionBadge(false)
      return
    }
    try {
      const latestStr = localStorage.getItem('latestSessionCreatedAt')
      const seenStr = localStorage.getItem('lastViewedSessionsAt')
      if (latestStr) {
        const latest = parseInt(latestStr)
        const seen = seenStr ? parseInt(seenStr) : 0
        setHasSessionBadge(latest > seen)
      }
    } catch {}
  }, [pathname])

  const LINKS = [
    { href: '/', label: 'Home', icon: '🏠', badge: false },
    { href: '/sessions', label: 'Sessions', icon: '🃏', badge: hasSessionBadge },
    { href: '/leaderboard', label: 'Standings', icon: '🏆', badge: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#30363d] bg-[#0d1117]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md justify-around">
        {LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-6 py-3 text-xs font-medium transition-colors',
                active ? 'text-emerald-400' : 'text-gray-500'
              )}
            >
              <span className="relative text-xl">
                {link.icon}
                {link.badge && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0d1117]" />
                )}
              </span>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
