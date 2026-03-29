'use client'

import { useState } from 'react'
import { Calendar, Clock, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface Props {
  staffName: string | null
}

const SERVICE_TYPES = [
  'General Check-in',
  'Case Review',
  'Document Review',
  'Benefits Assistance',
  'Housing Support',
  'Mental Health Support',
  'Medical Referral',
  'Job Readiness',
  'Follow-up Visit',
  'Other',
]

export function ScheduleAppointment({ staffName }: Props) {
  const [open, setOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Min datetime = now + 1 hour, rounded to next 30-min slot
  function minDatetime() {
    const d = new Date()
    d.setHours(d.getHours() + 1, d.getMinutes() >= 30 ? 60 : 30, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt || !serviceType) return
    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/portal/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt, service_type: serviceType, notes: notes || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      setState('success')
      setScheduledAt('')
      setServiceType('')
      setNotes('')
      // Reload after 2s to refresh upcoming appointments list
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch {
      setErrorMsg('Network error. Please check your connection.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold">Schedule an Appointment</h2>
        </div>
        <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="font-medium text-zinc-900">Appointment requested!</p>
          <p className="text-sm text-muted-foreground">
            {staffName ? `${staffName} will be notified.` : 'Your case manager will be notified.'}
            {' '}Refreshing your upcoming appointments…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-2 text-left hover:bg-zinc-50 transition-colors"
        aria-expanded={open}
      >
        <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
        <h2 className="font-semibold flex-1">Schedule an Appointment</h2>
        {staffName && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            with {staffName}
          </span>
        )}
        {open
          ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        }
      </button>

      {open && (
        <form onSubmit={submit} className="px-5 pb-5 space-y-4 border-t pt-4">
          {staffName && (
            <p className="text-sm text-muted-foreground">
              Your appointment will be scheduled with{' '}
              <span className="font-medium text-zinc-800">{staffName}</span>.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="portal-datetime" className="text-sm font-medium text-zinc-700">
                Date &amp; Time <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <input
                  id="portal-datetime"
                  type="datetime-local"
                  required
                  min={minDatetime()}
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="portal-service-type" className="text-sm font-medium text-zinc-700">
                Service Type <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="portal-service-type"
                required
                value={serviceType}
                onChange={e => setServiceType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select a type…</option>
                {SERVICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="portal-notes" className="text-sm font-medium text-zinc-700">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="portal-notes"
              rows={3}
              maxLength={2000}
              placeholder="Any specific topics or questions you'd like to discuss…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {state === 'error' && (
            <p role="alert" className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={state === 'loading' || !scheduledAt || !serviceType}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state === 'loading' ? 'Requesting…' : 'Request Appointment'}
          </button>
        </form>
      )}
    </div>
  )
}
