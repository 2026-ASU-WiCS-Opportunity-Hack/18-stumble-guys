/**
 * Portal appointment routes — client-role users only.
 * GET  /api/portal/appointments  — list own appointments
 * POST /api/portal/appointments  — request a new appointment with the onboarding staff
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const CreateSchema = z.object({
  scheduled_at: z.string().min(1),
  service_type: z.string().min(1).max(100),
  notes: z.string().max(2000).optional(),
})

async function getClientContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('client_id, org_id, role')
    .eq('id', userId)
    .single()
  return userData
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userData = await getClientContext(supabase, user.id)
  if (userData?.role !== 'client' || !userData?.client_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, scheduled_at, service_type, status, notes')
    .eq('client_id', userData.client_id)
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userData = await getClientContext(supabase, user.id)
  if (userData?.role !== 'client' || !userData?.client_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  // Validate the scheduled time is in the future
  if (new Date(parsed.data.scheduled_at) <= new Date()) {
    return NextResponse.json({ error: 'Appointment must be scheduled in the future' }, { status: 422 })
  }

  // Get the client record to find the onboarding staff member (created_by)
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('created_by, org_id')
    .eq('id', userData.client_id)
    .single()

  // Use admin client to bypass RLS for the insert — auth is already verified above
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('appointments')
    .insert({
      client_id: userData.client_id,
      org_id: clientRecord?.org_id ?? userData.org_id,
      staff_id: clientRecord?.created_by ?? null,
      scheduled_at: parsed.data.scheduled_at,
      service_type: parsed.data.service_type,
      notes: parsed.data.notes ?? null,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
