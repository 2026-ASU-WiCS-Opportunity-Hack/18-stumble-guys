/**
 * POST /api/push/send
 * Internal route — sends a push notification to all subscribers in an org or a specific user.
 * Called by: appointments page (manual reminder), follow-ups AI route (auto).
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { sendPushToOrg, sendPushToUser } from '@/lib/push'
import { z } from 'zod'

const Schema = z.object({
  org_id:  z.string().min(1).nullish(),
  user_id: z.string().min(1).nullish(),
  title:   z.string().min(1),
  body:    z.string().min(1),
  type:    z.enum(['appointment', 'follow_up']),
  id:      z.string().min(1),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', detail: parsed.error.flatten() }, { status: 400 })

  const { org_id: rawOrgId, user_id, title, body: msgBody, type, id } = parsed.data

  // Fall back to the caller's own org if no target provided
  let org_id = rawOrgId
  if (!org_id && !user_id) {
    const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    org_id = userData?.org_id ?? null
  }

  if (!org_id && !user_id) {
    return NextResponse.json({ error: 'Could not resolve org_id' }, { status: 400 })
  }

  const sent = org_id
    ? await sendPushToOrg(org_id, { title, body: msgBody, type, id })
    : await sendPushToUser(user_id!, { title, body: msgBody, type, id })

  return NextResponse.json({ sent })
}
