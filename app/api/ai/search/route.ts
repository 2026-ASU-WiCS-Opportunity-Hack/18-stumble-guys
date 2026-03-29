/**
 * GET /api/ai/search?q=TEXT
 * Semantic search over case notes using pgvector + Gemini embeddings.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getEmbedding } from '@/lib/gemini'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()
  if (!userData?.org_id) return NextResponse.json({ results: [] })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  let embedding: number[]
  try {
    embedding = await getEmbedding(q)
  } catch (err) {
    console.error('Embedding failed:', err)
    return NextResponse.json({ results: [], error: 'Semantic search unavailable' })
  }

  const { data, error } = await supabase.rpc('match_case_notes', {
    query_embedding: embedding,
    match_org_id: userData.org_id,
    match_count: 10,
  })

  if (error) {
    console.error('match_case_notes RPC error:', error)
    return NextResponse.json({ results: [] })
  }

  return NextResponse.json({ results: data ?? [] })
}
