import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const PatchSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const { error } = await supabase
    .from('appointments')
    .update(parsed.data)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
