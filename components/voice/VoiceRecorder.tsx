'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiveRegion } from '@/components/a11y/LiveRegion'

interface VoiceRecorderProps {
  serviceType: string
  onTranscript: (transcript: string) => void
  onStructured?: (structured: {
    summary: string
    action_items: string[]
    follow_ups: { description: string; urgency: string; due_date?: string }[]
    risk_level: string
  }) => void
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'error'

export function VoiceRecorder({ serviceType, onTranscript, onStructured }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setState('processing')
        setStatusMsg('Transcribing audio...')

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          formData.append('service_type', serviceType)

          const res = await fetch('/api/ai/voice-to-notes', { method: 'POST', body: formData })
          if (!res.ok) throw new Error('Transcription failed')

          const data = await res.json()
          onTranscript(data.transcript)
          if (onStructured && data.structured) onStructured(data.structured)
          setStatusMsg('Transcription complete')
          setState('idle')
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Transcription failed')
          setState('error')
          setStatusMsg('')
        }
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setState('recording')
      setStatusMsg('Recording in progress')
    } catch (err) {
      setErrorMsg('Microphone access denied. Please allow microphone access to use voice notes.')
      setState('error')
    }
  }, [serviceType, onTranscript, onStructured])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setStatusMsg('Processing recording...')
  }, [])

  if (!consentGiven) {
    return (
      <div className="rounded-md border p-4 bg-blue-50 space-y-3" role="region" aria-label="Voice notes consent">
        <p className="text-sm font-medium text-blue-900">Voice Notes</p>
        <p className="text-sm text-blue-800">
          Record your case notes by voice. Your audio will be transcribed by ElevenLabs Scribe
          and then structured by AI. Audio is not stored — only the transcript is saved.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setConsentGiven(true)}
            aria-describedby="voice-consent-description"
          >
            <Mic className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            I consent — Enable voice notes
          </Button>
        </div>
        <p id="voice-consent-description" className="sr-only">
          By clicking consent, you agree to audio being sent to ElevenLabs for transcription.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="region" aria-label="Voice recorder">
      <LiveRegion message={statusMsg} />

      <div className="flex items-center gap-3">
        {state === 'idle' || state === 'error' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="gap-1.5"
            aria-label="Start recording voice notes"
          >
            <Mic className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
            Record voice notes
          </Button>
        ) : state === 'recording' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stopRecording}
            className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
            aria-label="Stop recording"
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            Stop recording
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled aria-busy="true" aria-label="Processing audio">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
            Transcribing…
          </Button>
        )}

        <span className="text-xs text-muted-foreground">
          {state === 'recording' && 'Recording — speak clearly'}
          {state === 'processing' && 'Transcribing with ElevenLabs Scribe v1…'}
          {state === 'idle' && consentGiven && 'Click to record case notes by voice'}
        </span>
      </div>

      {errorMsg && (
        <p role="alert" className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {errorMsg}
        </p>
      )}
    </div>
  )
}
