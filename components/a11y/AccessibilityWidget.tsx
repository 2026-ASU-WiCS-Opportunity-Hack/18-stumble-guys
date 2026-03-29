'use client'

import { useState, useEffect, useRef } from 'react'
import { Eye, ZoomIn, Palette, X, Wind } from 'lucide-react'
import { cn } from '@/lib/utils'

type A11yMode = 'high-contrast' | 'color-blind' | 'large-text' | 'reduce-motion'

const MODES: { id: A11yMode; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'high-contrast',
    label: 'High Contrast',
    icon: Eye,
    description: 'Black & white, yellow focus rings',
  },
  {
    id: 'color-blind',
    label: 'Color Blind Safe',
    icon: Palette,
    description: 'Replaces red/green with blue/orange',
  },
  {
    id: 'large-text',
    label: 'Large Text',
    icon: ZoomIn,
    description: '125% larger text & UI',
  },
  {
    id: 'reduce-motion',
    label: 'Reduce Motion',
    icon: Wind,
    description: 'Stops chart & UI animations',
  },
]

// CSS injected at runtime — appended to <head> so they always win over static styles
const MODE_CSS: Record<A11yMode, string> = {
  'high-contrast': `
    *, *::before, *::after { transition: none !important; }
    html, body { background: #000 !important; color: #fff !important; }
    .bg-zinc-50, .bg-zinc-100 { background-color: #111 !important; }
    .bg-zinc-200 { background-color: #1a1a1a !important; }
    .bg-zinc-800, .bg-zinc-700 { background-color: #000 !important; }
    .bg-zinc-900 { background-color: #000 !important; }
    .bg-white { background-color: #0a0a0a !important; }
    .text-zinc-400, .text-zinc-500 { color: #a1a1aa !important; }
    .text-zinc-600 { color: #d4d4d8 !important; }
    .text-zinc-700, .text-zinc-800, .text-zinc-900 { color: #ffffff !important; }
    .text-white { color: #ffffff !important; }
    .border-zinc-100, .border-zinc-200 { border-color: #3f3f46 !important; }
    .border-zinc-700, .border-zinc-800 { border-color: #52525b !important; }
    .bg-indigo-50, .bg-violet-50, .bg-emerald-50, .bg-amber-50, .bg-rose-50, .bg-sky-50 { background-color: #111 !important; }
    .border-indigo-100, .border-violet-100, .border-emerald-100, .border-amber-100, .border-rose-100, .border-sky-100 { border-color: #3f3f46 !important; }
    .text-indigo-500, .text-indigo-600 { color: #a5b4fc !important; }
    .text-violet-500, .text-violet-600 { color: #c4b5fd !important; }
    .text-emerald-500, .text-emerald-600 { color: #6ee7b7 !important; }
    .text-amber-500, .text-amber-600 { color: #fcd34d !important; }
    .text-rose-500, .text-rose-600 { color: #fca5a5 !important; }
    .bg-indigo-600 { background-color: #4338ca !important; }
    .bg-violet-600 { background-color: #7c3aed !important; }
    .divide-zinc-50 > * + * { border-color: #27272a !important; }
    *:focus-visible { outline: 3px solid #fde047 !important; outline-offset: 2px !important; box-shadow: none !important; }
  `,

  // Colorblind-safe palette (Okabe-Ito based)
  // Replaces red/green confusion with blue/orange — safe for deuteranopia & protanopia
  'color-blind': `
    /* UI status colours — emerald (green) → blue */
    .bg-emerald-50  { background-color: #eff6ff !important; }
    .bg-emerald-100 { background-color: #dbeafe !important; }
    .text-emerald-600, .text-emerald-700 { color: #1d4ed8 !important; }
    .border-emerald-200 { border-color: #bfdbfe !important; }

    /* UI status colours — rose/red → orange */
    .bg-rose-50  { background-color: #fff7ed !important; }
    .bg-rose-100 { background-color: #ffedd5 !important; }
    .text-rose-600, .text-rose-700 { color: #c2410c !important; }
    .border-rose-200 { border-color: #fed7aa !important; }

    /* Badge colours */
    .bg-red-100  { background-color: #ffedd5 !important; }
    .text-red-800 { color: #9a3412 !important; }
    .bg-green-100 { background-color: #dbeafe !important; }
    .text-green-800 { color: #1e40af !important; }

    /* ── SVG fill colours (Recharts + StaticDonut) ── */
    /* green (low risk, completed) → blue */
    [fill="#10b981"] { fill: #2563eb !important; }
    [stroke="#10b981"] { stroke: #2563eb !important; }
    [fill="#22c55e"] { fill: #2563eb !important; }
    [stroke="#22c55e"] { stroke: #2563eb !important; }

    /* red / rose (high risk, error states) → orange */
    [fill="#f43f5e"] { fill: #ea580c !important; }
    [fill="#dc2626"] { fill: #c2410c !important; }
    [fill="#ef4444"] { fill: #ea580c !important; }
    [stroke="#f43f5e"] { stroke: #ea580c !important; }
    [stroke="#ef4444"] { stroke: #ea580c !important; }

    /* violet / purple in pie charts → teal (still distinct) */
    [fill="#8b5cf6"] { fill: #0891b2 !important; }

    /* Keep indigo (#6366f1) and amber (#f59e0b) — both fine for all types */

    /* Urgency dots */
    .bg-red-500  { background-color: #ea580c !important; }
    .bg-green-500 { background-color: #2563eb !important; }

    /* Legend swatches (inline style won't be caught — handled via JS) */
  `,

  'large-text': `
    html { zoom: 1.25; }
  `,

  'reduce-motion': `
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  `,
}

const STORAGE_KEY = 'casetrack-a11y-modes'

function injectStyle(id: string, css: string) {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = css
}

function removeStyle(id: string) {
  document.getElementById(id)?.remove()
}

function applyModes(modes: Set<A11yMode>) {
  for (const { id } of MODES) {
    if (modes.has(id)) {
      injectStyle(`a11y-${id}`, MODE_CSS[id])
    } else {
      removeStyle(`a11y-${id}`)
    }
  }
  // Sync data-reduce-motion attribute so useReduceMotion() hook can react
  if (modes.has('reduce-motion')) {
    document.documentElement.dataset.reduceMotion = 'true'
  } else {
    delete document.documentElement.dataset.reduceMotion
  }
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Set<A11yMode>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  // Restore persisted modes on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as A11yMode[]
      const set = new Set<A11yMode>(saved.filter(m => MODES.some(x => x.id === m)))
      setActive(set)
      applyModes(set)
    } catch {
      // ignore malformed storage
    }
  }, [])

  // Close on Escape, return focus to FAB
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        fabRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Move focus into panel when it opens
  useEffect(() => {
    if (open) {
      const first = panelRef.current?.querySelector<HTMLElement>('button')
      first?.focus()
    }
  }, [open])

  function toggle(mode: A11yMode) {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(mode)) next.delete(mode)
      else next.add(mode)
      applyModes(next)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  function reset() {
    const empty = new Set<A11yMode>()
    setActive(empty)
    applyModes(empty)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Accessibility display options"
          aria-modal="false"
          className="fixed bottom-20 right-4 z-50 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-4 w-64 animate-scale-in"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-zinc-900">Display Options</p>
            <button
              onClick={() => { setOpen(false); fabRef.current?.focus() }}
              aria-label="Close display options"
              className="text-zinc-500 hover:text-zinc-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 p-0.5"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            {MODES.map(mode => {
              const Icon = mode.icon
              const on = active.has(mode.id)
              return (
                <button
                  key={mode.id}
                  onClick={() => toggle(mode.id)}
                  aria-pressed={on}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                    on
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-none">{mode.label}</p>
                    <p className={cn('text-[11px] mt-0.5 leading-snug', on ? 'text-zinc-400' : 'text-zinc-500')}>
                      {mode.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'ml-auto text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded',
                      on ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-500'
                    )}
                    aria-hidden="true"
                  >
                    {on ? 'ON' : 'OFF'}
                  </span>
                </button>
              )
            })}
          </div>

          {active.size > 0 && (
            <button
              onClick={reset}
              className="mt-3 w-full text-[12px] text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded py-1 transition-colors"
            >
              Reset all to default
            </button>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        ref={fabRef}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close display options' : 'Open display options'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Accessibility display options"
        className={cn(
          'fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg',
          'flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2',
          active.size > 0
            ? 'bg-zinc-900 text-white ring-2 ring-amber-400 ring-offset-2'
            : 'bg-zinc-800 text-white hover:bg-zinc-700'
        )}
      >
        <Eye className="h-5 w-5" aria-hidden="true" />
        {active.size > 0 && (
          <span
            aria-label={`${active.size} display option${active.size > 1 ? 's' : ''} active`}
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 text-zinc-900 text-[9px] font-bold flex items-center justify-center"
          >
            {active.size}
          </span>
        )}
      </button>
    </>
  )
}
