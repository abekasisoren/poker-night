'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/sessions', label: 'Sessions', icon: '🃏' },
  { href: '/leaderboard', label: 'Standings', icon: '🏆' },
]

export default function BottomNav() {
  const pathname = usePathname()

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
                'flex flex-col items-center gap-1 px-6 py-3 text-xs font-medium transition-colors',
                active ? 'text-emerald-400' : 'text-gray-500'
              )}
            >
              <span className="text-xl">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
