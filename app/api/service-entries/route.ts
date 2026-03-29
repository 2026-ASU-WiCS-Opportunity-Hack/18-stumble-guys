import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { CreateServiceEntrySchema } from '@/lib/validators/service-entry'
import { logAuditEvent } from '@/lib/audit'
import { getEmbedding } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()
  if (!userData?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await request.json()
  const parsed = CreateServiceEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { confirmed_follow_ups, ...entryFields } = parsed.data

  const { data, error } = await supabase
    .from('service_entries')
    .insert({
      ...entryFields,
      org_id: userData.org_id,
      staff_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAuditEvent({
    action: 'create_service_entry',
    tableName: 'service_entries',
    recordId: data.id,
    after: { id: data.id, service_type: data.service_type, date: data.date },
    orgId: userData.org_id,
    actorId: user.id,
  })

  // Insert human-confirmed follow-ups (never auto-saved without review)
  if (confirmed_follow_ups?.length) {
    await supabase.from('follow_ups').insert(
      confirmed_follow_ups.map(f => ({
        client_id: entryFields.client_id,
        service_entry_id: data.id,
        org_id: userData.org_id,
        description: f.description,
        urgency: f.urgency,
        due_date: f.due_date ?? null,
        status: 'pending' as const,
      }))
    )
  }

  // Fire-and-forget: embed notes for semantic search
  if (data.notes) {
    const supabaseAdmin = await createClient()
    getEmbedding(data.notes).then(async (embedding) => {
      await supabaseAdmin.from('case_note_embeddings').upsert({
        service_entry_id: data.id,
        org_id: userData.org_id,
        embedding,
        content_hash: data.id,
      }, { onConflict: 'service_entry_id' })
    }).catch((err) => {
      console.error('Embedding failed (non-blocking):', err)
    })
  }

  return NextResponse.json(data, { status: 201 })
}
