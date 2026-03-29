import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CaseTrack — Nonprofit Case Management',
    short_name: 'CaseTrack',
    description: 'Case management for nonprofits',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#18181b',
    theme_color: '#18181b',
    categories: ['productivity', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
