/**
 * POST /api/ai/translate/cached
 * Returns all cached Spanish translations for a given list of note texts.
 * Used on page load to pre-populate translations without triggering Gemini.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  texts: z.array(z.string()).max(100),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { texts } = parsed.data
  if (!texts.length) return NextResponse.json({ translations: {} })

  const { data } = await supabase
    .from('translations')
    .select('original_text, translated_text')
    .eq('language', 'Spanish')
    .in('original_text', texts)

  // Map original_text → translated_text
  const translations: Record<string, string> = {}
  for (const row of data ?? []) {
    translations[row.original_text] = row.translated_text
  }

  return NextResponse.json({ translations })
}
