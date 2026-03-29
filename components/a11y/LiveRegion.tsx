'use client'

import { useEffect, useRef, useState } from 'react'

interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
}

/**
 * Announces async status changes to screen readers.
 * Usage: <LiveRegion message={statusMessage} />
 * The message must change (even if same text) to re-announce.
 */
export function LiveRegion({ message, politeness = 'polite' }: LiveRegionProps) {
  const [displayed, setDisplayed] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!message) return
    // Clear then re-set so screen reader re-announces repeated messages
    setDisplayed('')
    timeoutRef.current = setTimeout(() => setDisplayed(message), 50)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [message])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {displayed}
    </div>
  )
}
