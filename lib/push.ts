/**
 * Shared push notification helpers.
 * Uses service-role Supabase client to bypass RLS when fetching subscriptions.
 * Auto-cleans expired subscriptions (410 Gone from push service).
 */
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  'mailto:admin@casetrack.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  type: 'appointment' | 'follow_up'
  id: string
  url?: string
}

async function sendToSubscriptions(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
): Promise<number> {
  if (!subs.length) return 0

  const url = payload.url ?? (payload.type === 'appointment' ? '/appointments' : '/follow-ups')
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    type: payload.type,
    id: payload.id,
    url,
    icon: '/icons/icon-192.png',
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
      ),
    ),
  )

  // Clean up subscriptions that the browser has revoked (HTTP 410 Gone)
  const admin = createAdminClient()
  const expiredEndpoints = results
    .map((r, i) =>
      r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410
        ? subs[i].endpoint
        : null,
    )
    .filter(Boolean) as string[]

  if (expiredEndpoints.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  return results.filter((r) => r.status === 'fulfilled').length
}

export async function sendPushToOrg(org_id: string, payload: PushPayload): Promise<number> {
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('org_id', org_id)
  return sendToSubscriptions(subs ?? [], payload)
}

export async function sendPushToUser(user_id: string, payload: PushPayload): Promise<number> {
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user_id)
  return sendToSubscriptions(subs ?? [], payload)
}
