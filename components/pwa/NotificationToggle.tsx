'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { cn } from '@/lib/utils'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function NotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    })
  }, [])

  if (!supported) return null

  async function enable() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setSubscribed(true)
    } catch (err) {
      console.error('[Push] Subscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function disable() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={subscribed ? disable : enable}
      disabled={loading}
      className={cn(
        'flex w-full items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600',
        'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] disabled:opacity-50',
      )}
    >
      {subscribed
        ? <BellOff className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
        : <Bell    className="h-4 w-4 shrink-0 text-zinc-500"   aria-hidden="true" />
      }
      {subscribed ? 'Notifications on' : 'Enable notifications'}
    </button>
  )
}
