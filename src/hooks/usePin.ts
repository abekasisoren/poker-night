'use client'

import { useState, useCallback } from 'react'

const PIN_TS_KEY = 'poker_pin_ts'
const PIN_VAL_KEY = 'poker_pin_val'
const PIN_CACHE_MINUTES = 30

export function getStoredPin(): string {
  try {
    const ts = sessionStorage.getItem(PIN_TS_KEY)
    if (!ts) return ''
    const age = (Date.now() - parseInt(ts)) / 1000 / 60
    if (age >= PIN_CACHE_MINUTES) return ''
    return sessionStorage.getItem(PIN_VAL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function storePin(pin: string) {
  try {
    sessionStorage.setItem(PIN_TS_KEY, Date.now().toString())
    sessionStorage.setItem(PIN_VAL_KEY, pin)
  } catch {}
}

export function usePin() {
  const [showModal, setShowModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  function isPinVerified(): boolean {
    return getStoredPin() !== ''
  }

  const requirePin = useCallback((action: () => void) => {
    if (getStoredPin()) {
      action()
    } else {
      setPendingAction(() => action)
      setShowModal(true)
    }
  }, [])

  function onPinSuccess() {
    setShowModal(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  function onPinCancel() {
    setShowModal(false)
    setPendingAction(null)
  }

  return { requirePin, showModal, onPinSuccess, onPinCancel, isPinVerified }
}
