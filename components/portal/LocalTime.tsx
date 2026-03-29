'use client'

/**
 * Renders a UTC timestamp in the browser's local timezone.
 * Must be a client component — server components run in UTC on Vercel,
 * which causes appointment times to display incorrectly for non-UTC users.
 */
export function LocalTime({ iso, formatStr }: { iso: string; formatStr: 'datetime' | 'date' }) {
  const d = new Date(iso)
  if (formatStr === 'date') {
    return <>{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</>
  }
  return (
    <>
      {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      {' · '}
      {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
    </>
  )
}
