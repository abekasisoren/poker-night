'use client'

import { cn } from '@/lib/utils'

interface ZeroSumIndicatorProps {
  amounts: Record<string, number>
  playerCount: number
}

export default function ZeroSumIndicator({ amounts, playerCount }: ZeroSumIndicatorProps) {
  const values = Object.values(amounts)
  const sum = values.reduce((a, b) => a + b, 0)
  const filled = values.filter((v) => v !== 0).length
  const isBalanced = Math.abs(sum) < 0.02
  const isComplete = filled === playerCount

  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-center transition-colors',
        isBalanced && isComplete
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : isBalanced
          ? 'border-yellow-500/50 bg-yellow-500/10'
          : 'border-red-500/50 bg-red-500/10'
      )}
    >
      <p className="mb-1 text-xs text-gray-400">
        {filled}/{playerCount} entered · running total
      </p>
      <p
        className={cn(
          'text-3xl font-black',
          isBalanced ? 'text-emerald-400' : 'text-red-400'
        )}
      >
        {sum >= 0 ? '+' : ''}
        {sum.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {isBalanced && isComplete
          ? '✓ Balanced — ready to save'
          : isBalanced
          ? 'Balanced so far'
          : `Off by ₪${Math.abs(sum).toFixed(2)}`}
      </p>
    </div>
  )
}
