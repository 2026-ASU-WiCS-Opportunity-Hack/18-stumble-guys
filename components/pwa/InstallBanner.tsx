'use client'

import { useState, useEffect } from 'react'
import { Download, Share, X } from 'lucide-react'

type Platform = 'android' | 'ios' | null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // Chrome on iOS reports CriOS, not Safari
  const isIosSafari = isIos && /safari/i.test(ua) && !/crios|fxios|opios/i.test(ua)
  const isAndroid = /android/i.test(ua)
  if (isIosSafari) return 'ios'
  if (isAndroid) return 'android'
  return null
}

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts) return false
    return Date.now() - Number(ts) < DISMISS_TTL
  } catch {
    return false
  }
}

export function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isInstalled() || wasDismissedRecently()) return

    const p = detectPlatform()
    if (!p) return
    setPlatform(p)

    if (p === 'android') {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    // iOS — no beforeinstallprompt, just show the instructions banner
    if (p === 'ios') {
      // Small delay so it doesn't flash on initial load
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* noop */ }
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    } else {
      dismiss()
    }
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Install CaseTrack app"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl px-4 py-3.5 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sm font-bold text-white">C</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-snug">Install CaseTrack</p>

        {platform === 'android' && (
          <>
            <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
              Add to your home screen for quick access — works offline too.
            </p>
            <button
              onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Install app
            </button>
          </>
        )}

        {platform === 'ios' && (
          <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
            Tap{' '}
            <Share className="inline h-3 w-3 mb-0.5 text-zinc-300" aria-label="Share" />
            {' '}then{' '}
            <span className="text-zinc-200 font-medium">"Add to Home Screen"</span>
            {' '}to install.
          </p>
        )}
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
