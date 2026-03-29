const CACHE_NAME = 'casetrack-v1'
const PRECACHE_URLS = ['/dashboard', '/appointments', '/clients', '/offline']

// ── install: precache shell pages ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
})

// ── activate: purge old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── fetch: network-first, fallback to cache ────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
        return res
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/offline'))
      )
  )
})

// ── push: show notification ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  // payload shape: { title, body, icon, url, type, id }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      tag: `${data.type}-${data.id}`,  // deduplicates same record
      renotify: false,
      data: { url: data.url || '/dashboard' },
    })
  )
})

// ── notificationclick: navigate to relevant record ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(targetUrl)
    })
  )
})
