/**
 * POST /api/ai/photo-to-intake
 * Accepts a photo of a paper intake form, returns prefilled client fields.
 *
 * Privacy: images cannot be text-masked (pixel data), but the call is recorded
 * in audit_logs with the file hash so every scan is attributable and traceable.
 * The extracted data (which may contain PII) is returned to the caller only
 * and is never stored by this route.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { photoToIntake } from '@/lib/gemini'
import { logAuditEvent } from '@/lib/audit'
import { hashForAudit } from '@/lib/pii'
import { createHash } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const formData = await request.formData()
  const file = formData.get('photo') as File | null

  if (!file) return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WEBP, or HEIC images allowed' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Hash the image bytes for audit trail (sha256 of raw binary, not base64)
  const imageHash = createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex').slice(0, 32)

  const result = await photoToIntake(base64, file.type)

  // ── Audit log ─────────────────────────────────────────────────────────────
  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (userData?.org_id) {
    logAuditEvent({
      action: 'ai_photo_to_intake',
      orgId: userData.org_id,
      actorId: user.id,
      before: imageHash,
      after: hashForAudit(JSON.stringify(result)),
      metadata: {
        file_size: file.size,
        mime_type: file.type,
        model: 'gemini-2.5-flash',
      },
    }).catch(() => {})
  }

  return NextResponse.json(result)
}
