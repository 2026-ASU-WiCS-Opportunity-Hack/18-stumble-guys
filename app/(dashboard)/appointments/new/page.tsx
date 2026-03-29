'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  first_name: string
  last_name: string
  client_number: string
}

const FALLBACK_SERVICE_TYPES = [
  'General Services', 'Music Therapy', 'Food Assistance',
  'Case Management', 'Physical Therapy', 'Counseling',
  'Follow-Up Visit', 'Assessment', 'Crisis Session',
]

function defaultDatetime() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  // Format as datetime-local value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
}

export default function NewAppointmentPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [serviceTypes, setServiceTypes] = useState<string[]>(FALLBACK_SERVICE_TYPES)
  const [clientId, setClientId] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultDatetime)
  const [serviceType, setServiceType] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clients').then(r => r.ok ? r.json() : []).then(data => {
      setClients(Array.isArray(data) ? data : [])
    })
    fetch('/api/clients/fields').then(r => r.ok ? r.json() : {}).then((data: { service_types?: string[] }) => {
      if (data.service_types?.length) setServiceTypes(data.service_types)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !scheduledAt) { setError('Client and date/time are required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          service_type: serviceType || undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      router.push('/appointments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="p-4 md:p-8 max-w-xl mx-auto animate-fade-up">

      {/* Back */}
      <Link
        href="/appointments"
        className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Appointments
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          </div>
          <h1 className="text-[20px] font-semibold text-zinc-900 tracking-tight">Schedule Appointment</h1>
        </div>
        <p className="text-[13px] text-zinc-400 ml-10.5">Book a session for a client</p>
      </div>

      {/* Form card */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-4">
        {error && (
          <p role="alert" className="text-[12px] text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
            <span className="h-1 w-1 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Client */}
          <div className="space-y-1.5">
            <Label htmlFor="client" className="text-[12px] font-medium text-zinc-600">
              Client <span aria-hidden="true" className="text-red-400">*</span>
            </Label>
            <Select value={clientId} onValueChange={v => { setClientId(v ?? ''); setError('') }} required>
              <SelectTrigger
                id="client"
                aria-required="true"
                className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
              >
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-medium">{c.first_name} {c.last_name}</span>
                    <span className="text-zinc-400 font-mono text-[11px] ml-2">{c.client_number}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_at" className="text-[12px] font-medium text-zinc-600">
              Date & Time <span aria-hidden="true" className="text-red-400">*</span>
            </Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={e => { setScheduledAt(e.target.value); setError('') }}
              required
              aria-required="true"
              className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
            />
          </div>

          {/* Service Type */}
          <div className="space-y-1.5">
            <Label htmlFor="service_type" className="text-[12px] font-medium text-zinc-600">
              Service Type
            </Label>
            <Select value={serviceType} onValueChange={v => setServiceType(v ?? '')}>
              <SelectTrigger
                id="service_type"
                className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
              >
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[12px] font-medium text-zinc-600">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Preparation notes, reminders, or context…"
              rows={3}
              maxLength={2000}
              className="text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'flex-1 h-9 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2',
                'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Schedule Appointment
                </>
              )}
            </button>
            <Link
              href="/appointments"
              className="h-9 px-4 rounded-lg text-[13px] font-medium text-zinc-500 border border-zinc-200 hover:text-zinc-800 hover:bg-zinc-100 flex items-center transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
