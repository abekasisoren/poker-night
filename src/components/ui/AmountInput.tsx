'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AmountInputProps {
  value: number
  onChange: (val: number) => void
  placeholder?: string
}

export default function AmountInput({ value, onChange, placeholder = '0' }: AmountInputProps) {
  const [sign, setSign] = useState<'+' | '-'>(value >= 0 ? '+' : '-')
  const [raw, setRaw] = useState(value !== 0 ? Math.abs(value).toString() : '')

  useEffect(() => {
    setSign(value >= 0 ? '+' : '-')
    setRaw(value !== 0 ? Math.abs(value).toString() : '')
  }, [value])

  function handleRawChange(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, '')
    setRaw(cleaned)
    const num = parseFloat(cleaned) || 0
    onChange(sign === '+' ? num : -num)
  }

  function toggleSign() {
    const next = sign === '+' ? '-' : '+'
    setSign(next)
    const num = parseFloat(raw) || 0
    onChange(next === '+' ? num : -num)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleSign}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold transition-colors',
          sign === '+' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}
      >
        {sign}
      </button>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₪</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={raw}
          placeholder={placeholder}
          onChange={(e) => handleRawChange(e.target.value)}
          className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] py-2 pl-8 pr-3 text-right text-white focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  )
}
