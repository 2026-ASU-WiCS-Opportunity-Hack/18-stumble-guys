'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RotateCcw, Save, ChevronDown, ChevronUp, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'

interface PromptEntry {
  action: string
  label: string
  description: string
  defaultText: string
  currentText: string | null
  currentVersion: number | null
  updatedAt: string | null
  isCustomized: boolean
  history: { version: number; created_at: string }[]
}

export default function PromptsPage() {
  const { lang } = useLanguage()
  const [prompts, setPrompts] = useState<PromptEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    fetch('/api/admin/prompts')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setPrompts(data)
        // Pre-populate drafts with current custom text (or empty = default)
        const initial: Record<string, string> = {}
        for (const p of data) initial[p.action] = p.currentText ?? ''
        setDrafts(initial)
        setLoading(false)
      })
  }, [])

  async function saveToSupabase(action: string, text: string) {
    const res = await fetch('/api/admin/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, prompt_template: text }),
    })
    return res.ok ? res.json() : null
  }

  async function seedAllDefaults() {
    setSeeding(true)
    try {
      await Promise.all(
        prompts.filter(p => !p.isCustomized).map(p =>
          saveToSupabase(p.action, p.defaultText)
        )
      )
      // Re-fetch to get updated state with versions
      const data = await fetch('/api/admin/prompts').then(r => r.json())
      setPrompts(data)
      const updated: Record<string, string> = {}
      for (const p of data) updated[p.action] = p.currentText ?? ''
      setDrafts(updated)
    } finally {
      setSeeding(false)
    }
  }

  async function save(action: string) {
    const text = drafts[action]?.trim()
    if (!text) return
    setSaving(action)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, prompt_template: text }),
      })
      if (res.ok) {
        const { version } = await res.json()
        setPrompts(prev => prev.map(p =>
          p.action === action
            ? { ...p, currentText: text, currentVersion: version, isCustomized: true, updatedAt: new Date().toISOString() }
            : p
        ))
        setSaved(action)
        setTimeout(() => setSaved(null), 2500)
      }
    } finally {
      setSaving(null)
    }
  }

  async function reset(action: string) {
    setResetting(action)
    try {
      await fetch('/api/admin/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      setPrompts(prev => prev.map(p =>
        p.action === action
          ? { ...p, currentText: null, currentVersion: null, isCustomized: false, updatedAt: null, history: [] }
          : p
      ))
      setDrafts(prev => ({ ...prev, [action]: '' }))
    } finally {
      setResetting(null)
    }
  }

  const isES = lang === 'es'

  if (loading) return (
    <main id="main-content" className="p-6 flex items-center gap-2 text-[13px] text-zinc-400" aria-busy="true">
      <Loader2 className="h-4 w-4 animate-spin" />
      {isES ? 'Cargando prompts…' : 'Loading prompts…'}
    </main>
  )

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h1 className="text-[18px] font-semibold text-zinc-900">
            {isES ? 'Registro de Prompts de IA' : 'AI Prompt Registry'}
          </h1>
          <p className="text-[13px] text-zinc-400 mt-0.5 max-w-lg">
            {isES
              ? 'Personaliza cómo la IA interpreta los datos de tu organización. Los cambios se aplican inmediatamente — no se requieren cambios de código.'
              : 'Customize how AI interprets your org\'s data. Changes apply immediately — no code changes required.'}
          </p>
        </div>
      </div>

      {/* Seed banner — shown when no prompts are saved yet */}
      {prompts.length > 0 && prompts.every(p => !p.isCustomized) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-amber-800">
              {isES ? 'No hay prompts guardados aún' : 'No prompts saved yet'}
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              {isES
                ? 'Los prompts actuales son los predeterminados del sistema. Guárdalos en Supabase para poder editarlos.'
                : 'The current prompts are system defaults running in-code. Save them to Supabase to make them editable.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={seedAllDefaults}
            disabled={seeding}
            className="shrink-0 bg-amber-700 hover:bg-amber-800 text-white h-8 text-[12px]"
          >
            {seeding
              ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />{isES ? 'Guardando…' : 'Saving…'}</>
              : isES ? 'Guardar todos los predeterminados' : 'Save all defaults to Supabase'}
          </Button>
        </div>
      )}

      {/* Prompt cards */}
      <div className="space-y-3">
        {prompts.map(p => {
          const isOpen = expanded === p.action
          const draft = drafts[p.action] ?? ''
          const effectiveText = draft || p.defaultText
          const isDirty = draft !== (p.currentText ?? '')
          const isSaving = saving === p.action
          const isResetting = resetting === p.action
          const justSaved = saved === p.action

          return (
            <div
              key={p.action}
              className={cn(
                'bg-zinc-50 border rounded-xl overflow-hidden transition-colors',
                isOpen ? 'border-zinc-300' : 'border-zinc-200'
              )}
            >
              {/* Card header — always visible */}
              <button
                onClick={() => setExpanded(isOpen ? null : p.action)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-100/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-zinc-800">{p.label}</span>
                      {p.isCustomized ? (
                        <span className="text-[10px] font-semibold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {isES ? 'Personalizado' : 'Customized'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {isES ? 'Por defecto' : 'Default'}
                        </span>
                      )}
                      {p.currentVersion && (
                        <span className="text-[11px] text-zinc-400">v{p.currentVersion}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5 line-clamp-1 pr-4">{p.description}</p>
                  </div>
                </div>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                  : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />}
              </button>

              {/* Expanded editor */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-3 border-t border-zinc-100">
                  <p className="text-[12px] text-zinc-500 pt-4">{p.description}</p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                        {isES ? 'Instrucción del sistema' : 'System instruction'}
                      </label>
                      {p.isCustomized && (
                        <span className="text-[11px] text-zinc-400">
                          {isES ? 'Predeterminado:' : 'Default:'}{' '}
                          <button
                            className="underline underline-offset-2 hover:text-zinc-700"
                            onClick={() => setDrafts(prev => ({ ...prev, [p.action]: p.defaultText }))}
                          >
                            {isES ? 'restaurar' : 'restore'}
                          </button>
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={effectiveText}
                      onChange={e => setDrafts(prev => ({ ...prev, [p.action]: e.target.value }))}
                      placeholder={p.defaultText}
                      className="min-h-[100px] resize-y text-[13px] font-mono bg-white"
                      aria-label={`System prompt for ${p.label}`}
                    />
                    {!draft && (
                      <p className="text-[11px] text-zinc-400 italic">
                        {isES
                          ? '↑ Mostrando el texto predeterminado del sistema. Edita arriba para personalizarlo.'
                          : '↑ Showing system default. Edit above to customize for your org.'}
                      </p>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => save(p.action)}
                        disabled={isSaving || !isDirty || !draft.trim()}
                        className="h-8 text-[12px]"
                      >
                        {isSaving
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />{isES ? 'Guardando…' : 'Saving…'}</>
                          : justSaved
                          ? <><CheckCircle2 className="h-3 w-3 mr-1.5 text-emerald-400" />{isES ? 'Guardado' : 'Saved'}</>
                          : <><Save className="h-3 w-3 mr-1.5" />{isES ? 'Guardar nueva versión' : 'Save new version'}</>}
                      </Button>

                      {p.isCustomized && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => reset(p.action)}
                          disabled={isResetting}
                          className="h-8 text-[12px] text-zinc-500 hover:text-red-600"
                        >
                          {isResetting
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <><RotateCcw className="h-3 w-3 mr-1.5" />{isES ? 'Restablecer predeterminado' : 'Reset to default'}</>}
                        </Button>
                      )}
                    </div>

                    {/* Version history toggle */}
                    {p.history.length > 0 && (
                      <button
                        onClick={() => setShowHistory(showHistory === p.action ? null : p.action)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {isES ? `${p.history.length} versiones` : `${p.history.length} version${p.history.length !== 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>

                  {/* Version history list */}
                  {showHistory === p.action && p.history.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 text-[12px]">
                      {p.history.map(h => (
                        <div key={h.version} className="flex items-center justify-between px-3 py-2">
                          <span className="font-medium text-zinc-700">
                            v{h.version}
                            {h.version === p.currentVersion && (
                              <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                                {isES ? 'Activo' : 'Active'}
                              </span>
                            )}
                          </span>
                          <span className="text-zinc-400">
                            {format(new Date(h.created_at), 'MMM d, yyyy · h:mm a')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info callout */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-[12px] text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-700 text-[13px]">
          {isES ? '¿Cómo funciona?' : 'How does this work?'}
        </p>
        <p>
          {isES
            ? 'Cada llamada de IA (notas de voz, resúmenes de traspaso, informes para donantes, escaneo de formularios) envía una "instrucción del sistema" a Gemini antes del contenido del cliente. Personalizar esto te permite inyectar terminología específica de tu organización — por ejemplo, NMTSA puede agregar términos de musicoterapia para que la IA entienda "sesión de RAS" o "TIMP".'
            : 'Every AI call (voice notes, handoff summaries, funder reports, form scanning) sends a "system instruction" to Gemini before the client content. Customizing this lets you inject org-specific terminology — e.g. NMTSA can add music therapy terms so the AI understands "RAS session" or "TIMP".'}
        </p>
        <p>
          {isES
            ? 'Cada guardado crea una nueva versión — el historial anterior se conserva. Restablece al predeterminado del sistema en cualquier momento.'
            : 'Each save creates a new version — prior history is preserved. Reset to system default at any time.'}
        </p>
      </div>
    </main>
  )
}
