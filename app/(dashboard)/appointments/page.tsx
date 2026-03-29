'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  format, startOfMonth, startOfWeek, addDays, addWeeks, addMonths,
  subWeeks, subMonths, subDays, isSameMonth, isToday, isSameDay,
  parseISO, getHours, getMinutes, setHours, setMinutes,
} from 'date-fns'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Plus, X,
  Clock, Loader2, CheckCircle2, XCircle, UserX, Bell, CalendarClock,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LiveRegion } from '@/components/a11y/LiveRegion'

// ─── Types ────────────────────────────────────────────────────────
interface Client { id: string; first_name: string; last_name: string; client_number: string }
interface Appointment {
  id: string
  org_id: string
  scheduled_at: string
  service_type: string | null
  notes: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  clients: Client | null
  users: { full_name: string } | null
}
type View = 'month' | 'week' | 'day'
type ModalMode = 'add' | 'view' | 'reschedule'

// ─── Constants ────────────────────────────────────────────────────
const HOUR_H   = 56              // px per hour in time grid
const DAY_START = 7              // 7 am
const DAY_END   = 21             // 9 pm
const HOURS     = Array.from({ length: DAY_END - DAY_START }, (_, i) => i + DAY_START)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS = {
  scheduled: { label: 'Scheduled', chip: 'bg-indigo-600 text-white',     pill: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  completed:  { label: 'Completed', chip: 'bg-emerald-600 text-white',    pill: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  cancelled:  { label: 'Cancelled', chip: 'bg-zinc-200 text-zinc-600',    pill: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  no_show:    { label: 'No Show',   chip: 'bg-red-400 text-white',        pill: 'bg-red-50 text-red-500 border-red-100' },
} as const

const FALLBACK_TYPES = [
  'General Services', 'Music Therapy', 'Food Assistance', 'Case Management',
  'Physical Therapy', 'Counseling', 'Follow-Up Visit', 'Assessment', 'Crisis Session',
]

// ─── Helpers ──────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0') }

function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function eventTop(scheduled_at: string): number {
  const d = parseISO(scheduled_at)
  return (getHours(d) - DAY_START + getMinutes(d) / 60) * HOUR_H
}

// ─── Component ────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [view, setView]               = useState<View>('month')
  const [current, setCurrent]         = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients]         = useState<Client[]>([])
  const [serviceTypes, setServiceTypes] = useState<string[]>(FALLBACK_TYPES)
  const [loading, setLoading]         = useState(true)
  const [statusMsg, setStatusMsg]     = useState('')
  const [updatingId, setUpdatingId]   = useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen]     = useState(false)
  const [modalMode, setModalMode]     = useState<ModalMode>('add')
  const [modalDate, setModalDate]     = useState(new Date())
  const [modalAppt, setModalAppt]     = useState<Appointment | null>(null)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState('')
  const [fClientId, setFClientId]     = useState('')
  const [fScheduledAt, setFScheduledAt] = useState('')
  const [fServiceType, setFServiceType] = useState('')
  const [fNotes, setFNotes]           = useState('')

  // Reschedule form state
  const [rScheduledAt, setRScheduledAt] = useState('')
  const [rNotes, setRNotes]             = useState('')

  // Keyboard shortcuts: d=day, w=week, m=month
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'd') setView('day')
      else if (e.key === 'w') setView('week')
      else if (e.key === 'm') setView('month')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const fetchAll = useCallback(async () => {
    const [appts, cls, fields] = await Promise.all([
      fetch('/api/appointments').then(r => r.ok ? r.json() : []),
      fetch('/api/clients').then(r => r.ok ? r.json() : []),
      fetch('/api/clients/fields').then(r => r.ok ? r.json() : {}),
    ])
    setAppointments(Array.isArray(appts) ? appts : [])
    setClients(Array.isArray(cls) ? cls : [])
    const f = fields as { service_types?: string[] }
    if (f.service_types?.length) setServiceTypes(f.service_types)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Navigation
  function prev() {
    if (view === 'month') setCurrent(c => subMonths(c, 1))
    else if (view === 'week') setCurrent(c => subWeeks(c, 1))
    else setCurrent(c => subDays(c, 1))
  }
  function next() {
    if (view === 'month') setCurrent(c => addMonths(c, 1))
    else if (view === 'week') setCurrent(c => addWeeks(c, 1))
    else setCurrent(c => addDays(c, 1))
  }

  // Open add modal
  function openAdd(date: Date, hour = 9) {
    const d = new Date(date)
    d.setHours(hour, 0, 0, 0)
    setFClientId(''); setFScheduledAt(toDatetimeLocal(d))
    setFServiceType(''); setFNotes(''); setFormError('')
    setModalDate(d); setModalMode('add'); setModalAppt(null); setModalOpen(true)
  }

  // Open view modal
  function openView(a: Appointment) {
    setModalAppt(a); setModalMode('view')
    setModalDate(parseISO(a.scheduled_at)); setModalOpen(true)
  }

  function closeModal() { setModalOpen(false) }

  function openReschedule(a: Appointment) {
    setRScheduledAt(toDatetimeLocal(parseISO(a.scheduled_at)))
    setRNotes(a.notes ?? '')
    setFormError('')
    setModalAppt(a)
    setModalDate(parseISO(a.scheduled_at))
    setModalMode('reschedule')
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault()
    if (!modalAppt || !rScheduledAt) { setFormError('Date and time are required'); return }
    setSaving(true); setFormError('')
    try {
      const res = await fetch(`/api/appointments/${modalAppt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: new Date(rScheduledAt).toISOString(),
          notes: rNotes || undefined,
          status: 'scheduled',
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      await fetchAll()
      setStatusMsg('Appointment rescheduled')
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed')
    } finally { setSaving(false) }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!fClientId || !fScheduledAt) { setFormError('Client and date/time are required'); return }
    setSaving(true); setFormError('')
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: fClientId,
          scheduled_at: new Date(fScheduledAt).toISOString(),
          service_type: fServiceType || undefined,
          notes: fNotes || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      await fetchAll()
      setStatusMsg('Appointment scheduled')
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed')
    } finally { setSaving(false) }
  }

  async function sendReminder(appt: Appointment) {
    const clientName = appt.clients
      ? `${appt.clients.first_name} ${appt.clients.last_name}`
      : 'Client'
    const time = format(parseISO(appt.scheduled_at), 'h:mm a')
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: appt.org_id,
        title: 'Appointment Reminder',
        body: `${clientName} — ${appt.service_type ?? 'Session'} at ${time}`,
        type: 'appointment',
        id: appt.id,
      }),
    })
    setStatusMsg('Reminder sent')
  }

  async function updateStatus(id: string, status: Appointment['status']) {
    setUpdatingId(id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    if (modalAppt?.id === id) setModalAppt(a => a ? { ...a, status } : a)
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setStatusMsg(`Marked as ${status.replace('_', ' ')}`)
    setUpdatingId(null)
  }

  // Appointment helpers
  function byDay(day: Date) {
    return appointments
      .filter(a => isSameDay(parseISO(a.scheduled_at), day))
      .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
  }

  // Week days (Sun–Sat anchored to current)
  const weekStart = startOfWeek(current, { weekStartsOn: 0 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Month grid (always 6 weeks = 42 cells)
  const monthStart = startOfMonth(current)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 })
  const monthCells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  // Header title
  function title() {
    if (view === 'month') return format(current, 'MMMM yyyy')
    if (view === 'week') {
      const we = addDays(weekStart, 6)
      return `${format(weekStart, 'MMM d')} – ${format(we, isSameMonth(weekStart, we) ? 'd, yyyy' : 'MMM d, yyyy')}`
    }
    return format(current, 'EEEE, MMMM d, yyyy')
  }

  const viewDays = view === 'day' ? [current] : weekDays

  return (
    <div className="h-full flex flex-col bg-white" style={{ minHeight: 0 }}>
      <LiveRegion message={statusMsg} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 md:px-5 h-14 border-b border-zinc-200 bg-zinc-50 shrink-0 gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrent(new Date())}
            className="text-[12px] font-medium text-zinc-600 border border-zinc-200 rounded-lg px-3 h-7 hover:bg-zinc-100 transition-colors shrink-0"
          >
            Today
          </button>
          <button onClick={prev} aria-label="Previous" className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} aria-label="Next" className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h1 className="text-[15px] font-semibold text-zinc-900 ml-0.5 truncate">{title()}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View switcher */}
          <div className="hidden sm:flex rounded-lg border border-zinc-200 overflow-hidden text-[12px] font-medium">
            {(['day', 'week', 'month'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 h-7 capitalize transition-colors',
                  view === v ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-100'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Mobile view switcher */}
          <select
            className="sm:hidden text-[12px] border border-zinc-200 rounded-lg px-2 h-7 text-zinc-600 bg-white"
            value={view}
            onChange={e => setView(e.target.value as View)}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>

          <button
            onClick={() => openAdd(current, 9)}
            className="inline-flex items-center gap-1 text-[12px] font-medium h-7 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
        </div>
      </div>

      {/* ── Week/Day column headers ───────────────────────────── */}
      {(view === 'week' || view === 'day') && (
        <div className="flex shrink-0 border-b border-zinc-200 bg-zinc-50">
          <div className="w-14 shrink-0" />
          <div className={cn('flex-1 grid', view === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
            {viewDays.map((day, i) => (
              <div key={i} className={cn('py-2 text-center', i > 0 && 'border-l border-zinc-100')}>
                <p className={cn('text-[10px] font-semibold uppercase tracking-widest', isToday(day) ? 'text-zinc-600' : 'text-zinc-400')}>
                  {DAY_NAMES[day.getDay()]}
                </p>
                <div className="flex items-center justify-center mt-0.5">
                  <span className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full text-[15px] font-semibold',
                    isToday(day) ? 'bg-zinc-800 text-white' : 'text-zinc-700'
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {loading && (
          <div className="flex items-center justify-center h-full text-[13px] text-zinc-400 gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
          </div>
        )}

        {/* ── MONTH VIEW ─────────────────────────────────────── */}
        {!loading && view === 'month' && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Day name headers */}
            <div className="grid grid-cols-7 border-b border-zinc-200 shrink-0 bg-zinc-50">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d[0]}</span>
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-auto">
              {monthCells.map((day, i) => {
                const dayAppts = byDay(day)
                const inMonth  = isSameMonth(day, current)
                const today    = isToday(day)
                return (
                  <div
                    key={i}
                    onClick={() => openAdd(day, 9)}
                    className={cn(
                      'border-b border-r border-zinc-100 p-1.5 cursor-pointer transition-colors hover:bg-zinc-50',
                      !inMonth && 'bg-zinc-50/60',
                      today && 'bg-blue-50/20',
                    )}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-center mb-1">
                      <span className={cn(
                        'h-5 w-5 md:h-6 md:w-6 flex items-center justify-center rounded-full text-[11px] md:text-[13px] font-medium leading-none',
                        today ? 'bg-zinc-800 text-white' : inMonth ? 'text-zinc-700' : 'text-zinc-300'
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    {/* Events */}
                    <div className="space-y-0.5 min-w-0">
                      {dayAppts.slice(0, 3).map(a => (
                        <button
                          key={a.id}
                          onClick={e => { e.stopPropagation(); openView(a) }}
                          className={cn(
                            'w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate',
                            STATUS[a.status]?.chip ?? STATUS.scheduled.chip
                          )}
                        >
                          <span className="opacity-60 mr-0.5">{format(parseISO(a.scheduled_at), 'h:mma')}</span>
                          {a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : (a.service_type ?? '—')}
                        </button>
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="text-[10px] text-zinc-400 px-1 leading-none">+{dayAppts.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── WEEK / DAY TIME GRID ───────────────────────────── */}
        {!loading && (view === 'week' || view === 'day') && (
          <div className="h-full overflow-y-auto">
            <div className="flex min-w-0" style={{ minHeight: HOURS.length * HOUR_H }}>
              {/* Time axis */}
              <div className="w-14 shrink-0 border-r border-zinc-100 bg-zinc-50/50">
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_H }} className="relative border-b border-zinc-50 last:border-0">
                    <span className="absolute -top-2.5 left-2 text-[10px] text-zinc-400 select-none whitespace-nowrap">
                      {format(setMinutes(setHours(new Date(), h), 0), 'h a')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className={cn('flex-1 grid min-w-0', view === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
                {viewDays.map((day, di) => {
                  const dayAppts = byDay(day)
                  const today    = isToday(day)

                  return (
                    <div key={di} className={cn('relative', di > 0 && 'border-l border-zinc-100')}>
                      {/* Hour slots */}
                      {HOURS.map(h => (
                        <div
                          key={h}
                          style={{ height: HOUR_H }}
                          onClick={() => openAdd(day, h)}
                          className="border-b border-zinc-50 last:border-0 cursor-pointer hover:bg-zinc-50/80 transition-colors group relative"
                        >
                          {/* Half-hour line */}
                          <div className="absolute left-0 right-0 top-1/2 border-b border-zinc-50 border-dashed pointer-events-none" />
                          {/* Hover hint */}
                          <span className="absolute top-1 left-1 text-[9px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                            {format(setMinutes(setHours(new Date(), h), 0), 'h:mm a')}
                          </span>
                        </div>
                      ))}

                      {/* Appointment blocks */}
                      {dayAppts.map(a => {
                        const top = eventTop(a.scheduled_at)
                        if (top < 0 || top >= HOURS.length * HOUR_H) return null
                        return (
                          <button
                            key={a.id}
                            onClick={e => { e.stopPropagation(); openView(a) }}
                            style={{ top, height: Math.max(HOUR_H - 4, 28), minHeight: 28 }}
                            className={cn(
                              'absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-left overflow-hidden',
                              'hover:opacity-90 hover:shadow-md transition-all z-10 shadow-sm',
                              STATUS[a.status]?.chip ?? STATUS.scheduled.chip
                            )}
                          >
                            <p className="text-[10px] opacity-75 leading-none">
                              {format(parseISO(a.scheduled_at), 'h:mm a')}
                            </p>
                            {a.clients && (
                              <p className="text-[11px] font-semibold leading-tight truncate mt-0.5">
                                {a.clients.first_name} {a.clients.last_name}
                              </p>
                            )}
                            {a.service_type && (
                              <p className="text-[10px] opacity-70 truncate leading-none mt-0.5">{a.service_type}</p>
                            )}
                          </button>
                        )
                      })}

                      {/* Current time line */}
                      {today && (() => {
                        const now = new Date()
                        const top = (getHours(now) - DAY_START + getMinutes(now) / 60) * HOUR_H
                        if (top < 0 || top > HOURS.length * HOUR_H) return null
                        return (
                          <div style={{ top }} className="absolute left-0 right-0 flex items-center z-20 pointer-events-none">
                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 -ml-1.5 shrink-0" />
                            <div className="flex-1 h-px bg-blue-500" />
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={modalMode === 'add' ? 'Schedule appointment' : 'Appointment details'}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-0">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  {modalMode === 'add' ? 'New Appointment' : modalMode === 'reschedule' ? 'Reschedule Appointment' : 'Appointment Details'}
                </p>
                <p className="text-[17px] font-semibold text-zinc-900 mt-0.5">
                  {format(modalDate, 'EEEE, MMMM d')}
                </p>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors -mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pb-6 pt-5">
              {/* ── ADD FORM ─────────────────────────────────── */}
              {modalMode === 'add' && (
                <form onSubmit={handleAdd} className="space-y-3.5" noValidate>
                  {formError && (
                    <p role="alert" className="text-[12px] text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      {formError}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="m-client" className="text-[12px] font-medium text-zinc-600">
                      Client <span className="text-red-400">*</span>
                    </Label>
                    <Select value={fClientId} onValueChange={v => { setFClientId(v ?? ''); setFormError('') }} required>
                      <SelectTrigger id="m-client" className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300">
                        <SelectValue placeholder="Select a client…" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-medium">{c.first_name} {c.last_name}</span>
                            <span className="text-zinc-400 font-mono text-[10px] ml-2">{c.client_number}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-time" className="text-[12px] font-medium text-zinc-600">
                      Date & Time <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="m-time"
                      type="datetime-local"
                      value={fScheduledAt}
                      onChange={e => { setFScheduledAt(e.target.value); setFormError('') }}
                      required
                      className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-type" className="text-[12px] font-medium text-zinc-600">Service Type</Label>
                    <Select value={fServiceType} onValueChange={v => setFServiceType(v ?? '')}>
                      <SelectTrigger id="m-type" className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-notes" className="text-[12px] font-medium text-zinc-600">Notes</Label>
                    <Textarea
                      id="m-notes"
                      value={fNotes}
                      onChange={e => setFNotes(e.target.value)}
                      placeholder="Preparation notes or context…"
                      rows={2}
                      maxLength={2000}
                      className="text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 h-9 rounded-lg text-[13px] font-medium bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Schedule</>}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="h-9 px-4 rounded-lg text-[13px] font-medium text-zinc-500 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* ── RESCHEDULE FORM ──────────────────────────── */}
              {modalMode === 'reschedule' && modalAppt && (
                <form onSubmit={handleReschedule} className="space-y-3.5" noValidate>
                  {/* Client reminder */}
                  {modalAppt.clients && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 text-[12px] text-zinc-600">
                      <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600 shrink-0">
                        {modalAppt.clients.first_name[0]}{modalAppt.clients.last_name[0]}
                      </div>
                      {modalAppt.clients.first_name} {modalAppt.clients.last_name}
                      {modalAppt.service_type && <span className="ml-auto text-zinc-400">{modalAppt.service_type}</span>}
                    </div>
                  )}

                  {formError && (
                    <p role="alert" className="text-[12px] text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      {formError}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="r-time" className="text-[12px] font-medium text-zinc-600">
                      New Date &amp; Time <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="r-time"
                      type="datetime-local"
                      value={rScheduledAt}
                      onChange={e => { setRScheduledAt(e.target.value); setFormError('') }}
                      required
                      className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="r-notes" className="text-[12px] font-medium text-zinc-600">
                      Notes <span className="text-zinc-400 font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="r-notes"
                      value={rNotes}
                      onChange={e => setRNotes(e.target.value)}
                      placeholder="Reason for rescheduling or updated context…"
                      rows={2}
                      maxLength={2000}
                      className="text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 h-9 rounded-lg text-[13px] font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CalendarClock className="h-3.5 w-3.5" /> Reschedule</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode('view')}
                      className="h-9 px-4 rounded-lg text-[13px] font-medium text-zinc-500 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* ── VIEW DETAILS ─────────────────────────────── */}
              {modalMode === 'view' && modalAppt && (
                <div className="space-y-4">
                  {/* Client info */}
                  {modalAppt.clients && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center text-[13px] font-semibold text-zinc-600 shrink-0">
                        {modalAppt.clients.first_name[0]}{modalAppt.clients.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/clients/${modalAppt.clients.id}`}
                          onClick={closeModal}
                          className="text-[14px] font-semibold text-zinc-900 hover:underline underline-offset-2 block truncate"
                        >
                          {modalAppt.clients.first_name} {modalAppt.clients.last_name}
                        </Link>
                        <p className="text-[11px] text-zinc-400 font-mono">{modalAppt.clients.client_number}</p>
                      </div>
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0', STATUS[modalAppt.status]?.pill)}>
                        {STATUS[modalAppt.status]?.label}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2.5 text-[13px] text-zinc-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      {format(parseISO(modalAppt.scheduled_at), 'h:mm a · EEEE, MMMM d, yyyy')}
                    </div>
                    {modalAppt.service_type && (
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 shrink-0" />
                        <span className="inline-block bg-zinc-100 rounded-full px-2.5 py-0.5 text-[12px] font-medium text-zinc-600">
                          {modalAppt.service_type}
                        </span>
                      </div>
                    )}
                    {modalAppt.notes && (
                      <div className="flex items-start gap-2">
                        <span className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-zinc-500 leading-relaxed border-l-2 border-zinc-200 pl-3 italic">
                          {modalAppt.notes}
                        </p>
                      </div>
                    )}
                    {modalAppt.users?.full_name && (
                      <p className="text-[12px] text-zinc-400 pl-5">Staff: {modalAppt.users.full_name}</p>
                    )}
                  </div>

                  {/* Status actions */}
                  {modalAppt.status === 'scheduled' ? (
                    <div className="space-y-2 pt-1 border-t border-zinc-100">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateStatus(modalAppt.id, 'completed')}
                          disabled={!!updatingId}
                          className="h-8 rounded-lg text-[12px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </button>
                        <button
                          onClick={() => updateStatus(modalAppt.id, 'no_show')}
                          disabled={!!updatingId}
                          className="h-8 rounded-lg text-[12px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                        >
                          <UserX className="h-3.5 w-3.5" /> No Show
                        </button>
                        <button
                          onClick={() => updateStatus(modalAppt.id, 'cancelled')}
                          disabled={!!updatingId}
                          className="h-8 rounded-lg text-[12px] font-medium text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openReschedule(modalAppt)}
                          disabled={!!updatingId}
                          className="h-8 rounded-lg text-[12px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                        >
                          <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                        </button>
                        <button
                          onClick={() => sendReminder(modalAppt)}
                          disabled={!!updatingId}
                          className="h-8 rounded-lg text-[12px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                        >
                          <Bell className="h-3.5 w-3.5" /> Send Reminder
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateStatus(modalAppt.id, 'scheduled')}
                      disabled={!!updatingId}
                      className="w-full h-8 rounded-lg text-[12px] font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-100 transition-colors disabled:opacity-40"
                    >
                      Restore to Scheduled
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
