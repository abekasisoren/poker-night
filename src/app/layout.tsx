import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PlayerProvider } from '@/context/PlayerContext'
import { ToastProvider } from '@/components/ui/Toast'
import BottomNav from '@/components/layout/BottomNav'

export const metadata: Metadata = {
  title: 'Poker Night',
  description: 'Manage your weekly poker game',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Poker Night',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d1117',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#0d1117] text-white">
        <PlayerProvider>
          <ToastProvider>
            <main className="mx-auto min-h-screen max-w-md pb-safe">
              {children}
            </main>
            <BottomNav />
          </ToastProvider>
        </PlayerProvider>
      </body>
    </html>
  )
}
