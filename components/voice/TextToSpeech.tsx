'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Volume2, Loader2, AlertCircle, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiveRegion } from '@/components/a11y/LiveRegion'

interface TextToSpeechProps {
  text: string
  label?: string
  className?: string
}

export function TextToSpeech({ text, label = 'Read aloud', className }: TextToSpeechProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  // Track which text the cached audio belongs to
  const cachedTextRef = useRef<string | null>(null)

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const attachListeners = useCallback((audio: HTMLAudioElement) => {
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.ondurationchange = () => setDuration(audio.duration)
    audio.onplay = () => { setPlaying(true); setStatusMsg('Playing audio') }
    audio.onpause = () => { setPlaying(false); setStatusMsg('Audio paused') }
    audio.onended = () => { setPlaying(false); setStatusMsg('Audio complete') }
    audio.onerror = () => { setStatus('error'); setPlaying(false); setStatusMsg('Audio playback failed') }
  }, [])

  const load = useCallback(async () => {
    // If we already have cached audio for this text, just show the player
    if (audioRef.current && cachedTextRef.current === text) {
      setStatus('ready')
      await audioRef.current.play()
      return
    }

    // Discard old audio if text changed
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    audioRef.current = null
    cachedTextRef.current = null

    setStatus('loading')
    setStatusMsg('Loading audio...')

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'TTS request failed')
      }

      const buffer = await res.arrayBuffer()
      const blob = new Blob([buffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      attachListeners(audio)
      audioRef.current = audio
      cachedTextRef.current = text

      setStatus('ready')
      setCurrentTime(0)
      await audio.play()
    } catch {
      setStatus('error')
      setStatusMsg('Failed to load audio')
    }
  }, [text, attachListeners])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }, [])

  const rewind = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play()
  }, [])

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
  }, [])

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (status === 'idle') {
    return (
      <>
        <LiveRegion message={statusMsg} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={load}
          aria-label={label}
          className={className}
        >
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </Button>
      </>
    )
  }

  if (status === 'loading') {
    return (
      <>
        <LiveRegion message={statusMsg} />
        <Button type="button" variant="ghost" size="sm" disabled aria-busy className={className}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading audio…</span>
        </Button>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <LiveRegion message={statusMsg} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStatus('idle')}
          aria-label="TTS unavailable — click to dismiss"
          className={`text-destructive hover:text-destructive ${className ?? ''}`}
          title={statusMsg}
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Audio unavailable</span>
        </Button>
      </>
    )
  }

  // status === 'ready' — inline mini player
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <>
      <LiveRegion message={statusMsg} />
      <div
        role="region"
        aria-label="Audio player"
        className="inline-flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-1"
      >
        <button
          type="button"
          onClick={rewind}
          aria-label="Rewind to start"
          className="text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="text-zinc-700 hover:text-zinc-900 transition-colors"
        >
          {playing
            ? <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={seek}
          aria-label="Seek"
          className="w-20 h-1 accent-zinc-700 cursor-pointer"
        />

        <span className="text-[11px] text-zinc-500 tabular-nums min-w-[2.5rem]">
          {fmt(currentTime)}<span aria-hidden="true"> / </span>{fmt(duration)}
        </span>
      </div>
    </>
  )
}
