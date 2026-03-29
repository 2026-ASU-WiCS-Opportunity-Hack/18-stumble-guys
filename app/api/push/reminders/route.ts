/**
 * GET /api/push/reminders
 * Finds appointments scheduled within the next 90 minutes that haven't had a reminder sent,
 * fires push notifications, and marks them as sent.
 * Called every 5 minutes by ServiceWorkerRegistrar while the app is open.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushToOrg } from '@/lib/push'
import { format, parseISO } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const cutoff = new Date(now.getTime() + 90 * 60 * 1000)

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, org_id, scheduled_at, service_type, clients(first_name, last_name)')
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', cutoff.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!appointments?.length) return NextResponse.json({ fired: 0 })

  let fired = 0
  for (const appt of appointments) {
    const client = appt.clients as unknown as { first_name: string; last_name: string } | null
    const clientName = client ? `${client.first_name} ${client.last_name}` : 'Client'
    const time = format(parseISO(appt.scheduled_at), 'h:mm a')

    await sendPushToOrg(appt.org_id, {
      title: 'Upcoming Appointment',
      body: `${clientName} — ${appt.service_type ?? 'Session'} at ${time}`,
      type: 'appointment',
      id: appt.id,
    })

    await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', appt.id)

    fired++
  }

  return NextResponse.json({ fired })
}
