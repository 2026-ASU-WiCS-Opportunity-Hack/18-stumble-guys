'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((err) => console.error('[SW] Registration failed:', err))

    // Poll every 5 minutes for upcoming appointment reminders
    const interval = setInterval(() => {
      fetch('/api/push/reminders').catch(() => {})
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}
