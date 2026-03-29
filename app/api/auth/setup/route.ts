import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Called client-side after every successful sign-in.
 * Ensures a public.users record exists for the authenticated user.
 * Safe to call multiple times — idempotent.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const adminClient = createAdminClient()

  // Check if user record already exists
  const { data: existing } = await adminClient
    .from('users')
    .select('id, role, client_id')
    .eq('id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true, created: false, role: existing.role })
  }

  // New user (e.g. Google SSO first sign-in) — create record
  const meta = user.user_metadata ?? {}
  const role = meta.role ?? 'staff'
  const orgId = meta.org_id ?? null
  const clientId = meta.client_id ?? null

  const { error } = await adminClient.from('users').insert({
    id: user.id,
    email: user.email ?? '',
    full_name: meta.full_name ?? meta.name ?? user.email ?? '',
    role,
    org_id: orgId,
    client_id: clientId,
  })

  if (error) {
    // Duplicate insert race condition — harmless
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, created: false, role })
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // If this is a client invite, link portal_user_id on the client record
  if (role === 'client' && clientId) {
    await adminClient
      .from('clients')
      .update({ portal_user_id: user.id })
      .eq('id', clientId)
  }

  return NextResponse.json({ ok: true, created: true, role })
}
