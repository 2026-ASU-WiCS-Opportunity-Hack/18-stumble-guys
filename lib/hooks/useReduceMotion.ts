'use client'

import { useState, useEffect } from 'react'

function readFromDom(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.reduceMotion === 'true'
}

/**
 * Returns true when the user has enabled "Reduce Motion" in the
 * accessibility widget. Initialises synchronously from the DOM so
 * Recharts never starts an animation that needs to be cancelled.
 */
export function useReduceMotion(): boolean {
  // Lazy initialiser reads the DOM on first render — prevents the flash
  // where reduceMotion=false while localStorage/dataset already says true
  const [reduced, setReduced] = useState<boolean>(readFromDom)

  useEffect(() => {
    // Sync in case the inline script missed anything (e.g. server render)
    setReduced(readFromDom())

    const observer = new MutationObserver(() => setReduced(readFromDom()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-reduce-motion'],
    })
    return () => observer.disconnect()
  }, [])

  return reduced
}
