/**
 * GET /api/ai/client-summary?client_id=UUID[&force=true]
 *
 * Returns a stored summary if one exists and is fresh (no new service entries
 * since it was generated). Pass ?force=true to always regenerate.
 *
 * Response: { summary, generated_at, is_stale, cached }
 *
 * Privacy: client name and note PII are masked before reaching Gemini.
 * Every (re)generation is recorded in audit_logs with input/output hashes.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateHandoffSummary } from '@/lib/gemini'
import { getSystemPrompt } from '@/lib/prompts'
import { logAuditEvent } from '@/lib/audit'
import { createMasker, hashForAudit } from '@/lib/pii'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = request.nextUrl.searchParams.get('client_id')
  const force = request.nextUrl.searchParams.get('force') === 'true'
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()

  // Fetch client + service entries (RLS enforces org access)
  const { data: client, error } = await supabase
    .from('clients')
    .select('first_name, last_name, service_entries(id, date, service_type, notes, ai_structured_notes, created_at)')
    .eq('id', clientId)
    .single()

  if (error || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const entries = (client.service_entries ?? []) as {
    id: string
    date: string
    service_type: string
    notes: string
    ai_structured_notes: Record<string, unknown> | null
    created_at: string
  }[]

  if (entries.length === 0) {
    return NextResponse.json({ summary: 'No service history available yet.', cached: false })
  }

  // Latest service entry timestamp — used to detect staleness
  const latestEntryAt = entries.reduce((max, e) =>
    e.created_at > max ? e.created_at : max, entries[0].created_at)

  // ── Check for existing stored summary ────────────────────────────────────
  if (!force) {
    const { data: stored } = await supabase
      .from('client_handoff_summaries')
      .select('summary_text, generated_at')
      .eq('client_id', clientId)
      .single()

    if (stored) {
      const isStale = latestEntryAt > stored.generated_at
      return NextResponse.json({
        summary: stored.summary_text,
        generated_at: stored.generated_at,
        is_stale: isStale,
        cached: true,
      })
    }
  }

  // ── Rate limit only applies when actually calling the LLM ────────────────
  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const systemInstruction = userData?.org_id
    ? await getSystemPrompt(supabase, userData.org_id, 'handoff_summary')
    : undefined

  const clientName = `${client.first_name} ${client.last_name}`

  // ── Privacy: mask PII before sending to Gemini ────────────────────────────
  const masker = createMasker([clientName])
  const maskedName = masker.mask(clientName)
  const maskedEntries = entries.map(e => ({ ...e, notes: masker.mask(e.notes ?? '') }))
  const inputHash = hashForAudit(clientName + JSON.stringify(entries))

  const rawSummary = await generateHandoffSummary(maskedName, maskedEntries, systemInstruction)
  const summary = masker.unmask(rawSummary)
  const generatedAt = new Date().toISOString()

  // ── Persist ───────────────────────────────────────────────────────────────
  if (userData?.org_id) {
    await supabase
      .from('client_handoff_summaries')
      .upsert(
        {
          client_id: clientId,
          org_id: userData.org_id,
          summary_text: summary,
          generated_by: user.id,
          generated_at: generatedAt,
        },
        { onConflict: 'client_id' },
      )
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  if (userData?.org_id) {
    logAuditEvent({
      action: 'ai_client_summary',
      orgId: userData.org_id,
      actorId: user.id,
      recordId: clientId,
      tableName: 'clients',
      before: inputHash,
      after: hashForAudit(summary),
      metadata: {
        client_id: clientId,
        entries_count: entries.length,
        pii_tokens_masked: masker.tokenCount,
        forced: force,
        model: 'gemini-2.5-flash',
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    summary,
    generated_at: generatedAt,
    is_stale: false,
    cached: false,
  })
}
