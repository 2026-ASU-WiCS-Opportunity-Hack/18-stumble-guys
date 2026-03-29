/**
 * GET  /api/admin/prompts — list all prompt actions with current active version for this org
 * PUT  /api/admin/prompts — save a new version for an action (auto-increments, deactivates old)
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_PROMPTS, invalidatePromptCache } from '@/lib/prompts'
import { z } from 'zod'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return data
}

export async function GET() {
  const supabase = await createClient()
  const userData = await requireAdmin(supabase)
  if (!userData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all active prompts for this org
  const { data: rows } = await supabase
    .from('ai_prompts')
    .select('action, prompt_template, version, created_at')
    .eq('org_id', userData.org_id)
    .eq('is_active', true)
    .order('action')

  // Fetch version history counts
  const { data: history } = await supabase
    .from('ai_prompts')
    .select('action, version, created_at')
    .eq('org_id', userData.org_id)
    .order('version', { ascending: false })

  // Build response: one entry per known action
  const activeByAction: Record<string, { prompt_template: string; version: number; created_at: string }> = {}
  for (const row of (rows ?? [])) {
    activeByAction[row.action] = row
  }

  const historyByAction: Record<string, { version: number; created_at: string }[]> = {}
  for (const row of (history ?? [])) {
    if (!historyByAction[row.action]) historyByAction[row.action] = []
    historyByAction[row.action].push({ version: row.version, created_at: row.created_at })
  }

  const result = Object.entries(DEFAULT_PROMPTS).map(([action, meta]) => {
    const active = activeByAction[action]
    return {
      action,
      label: meta.label,
      description: meta.description,
      defaultText: meta.defaultText,
      // custom prompt if org has one, otherwise null (UI shows defaultText as placeholder)
      currentText: active?.prompt_template ?? null,
      currentVersion: active?.version ?? null,
      updatedAt: active?.created_at ?? null,
      isCustomized: !!active,
      history: historyByAction[action] ?? [],
    }
  })

  return NextResponse.json(result)
}

const PutSchema = z.object({
  action: z.string().min(1),
  prompt_template: z.string().min(10),
})

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const userData = await requireAdmin(supabase)
  if (!userData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { action, prompt_template } = parsed.data

  if (!DEFAULT_PROMPTS[action]) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Get current max version for this org+action
  const { data: existing } = await supabase
    .from('ai_prompts')
    .select('version')
    .eq('org_id', userData.org_id)
    .eq('action', action)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (existing?.version ?? 0) + 1

  // Deactivate all previous versions
  await supabase
    .from('ai_prompts')
    .update({ is_active: false })
    .eq('org_id', userData.org_id)
    .eq('action', action)

  // Insert new active version
  const { error } = await supabase.from('ai_prompts').insert({
    org_id: userData.org_id,
    action,
    prompt_template,
    version: nextVersion,
    is_active: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bust cache so next AI call picks up the new prompt immediately
  invalidatePromptCache(userData.org_id, action)

  return NextResponse.json({ version: nextVersion })
}

// DELETE — revert to default by removing all custom versions
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const userData = await requireAdmin(supabase)
  if (!userData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await request.json()
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  await supabase
    .from('ai_prompts')
    .delete()
    .eq('org_id', userData.org_id)
    .eq('action', action)

  invalidatePromptCache(userData.org_id, action)
  return NextResponse.json({ reset: true })
}
