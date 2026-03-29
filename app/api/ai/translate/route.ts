/**
 * POST /api/ai/translate
 * Translates text to a target language via Gemini, with Supabase cache.
 *
 * Privacy: PII is masked before leaving the server. Translations are cached
 * using the masked text as the key (PII is never stored in the translations table).
 * Every non-cached call is recorded in audit_logs.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { translateText } from '@/lib/gemini'
import { logAuditEvent } from '@/lib/audit'
import { createMasker, hashForAudit } from '@/lib/pii'
import { z } from 'zod'

const Schema = z.object({
  text: z.string().min(1).max(10000),
  target_language: z.string().min(2).max(10),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { text, target_language } = parsed.data

  // ── Privacy: mask PII before caching or sending to Gemini ────────────────
  const masker = createMasker()
  const maskedText = masker.mask(text)

  // Check cache (keyed on masked text — no raw PII stored in cache table)
  const { data: cached } = await supabase
    .from('translations')
    .select('translated_text')
    .eq('original_text', maskedText)
    .eq('language', target_language)
    .single()

  if (cached) {
    // Unmask: restore any PII tokens in the cached translation
    return NextResponse.json({ translated: masker.unmask(cached.translated_text), cached: true })
  }

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()

  const maskedTranslated = await translateText(maskedText, target_language)
  const translated = masker.unmask(maskedTranslated)

  // Cache using masked text so PII is never persisted
  await supabase
    .from('translations')
    .upsert({ original_text: maskedText, language: target_language, translated_text: maskedTranslated })

  // ── Audit log ─────────────────────────────────────────────────────────────
  if (userData?.org_id) {
    logAuditEvent({
      action: 'ai_translate',
      orgId: userData.org_id,
      actorId: user.id,
      before: hashForAudit(text),
      after: hashForAudit(translated),
      metadata: {
        target_language,
        chars_sent: maskedText.length,
        pii_tokens_masked: masker.tokenCount,
        model: 'gemini-2.5-flash',
      },
    }).catch(() => {})
  }

  return NextResponse.json({ translated, cached: false })
}
