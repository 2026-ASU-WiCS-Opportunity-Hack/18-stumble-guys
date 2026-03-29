'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiveRegion } from '@/components/a11y/LiveRegion'

interface IntakeResult {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  demographics?: Record<string, string>
}

interface PhotoIntakeProps {
  onPrefill: (data: IntakeResult) => void
}

export function PhotoIntake({ onPrefill }: PhotoIntakeProps) {
  const [state, setState] = useState<'idle' | 'preview' | 'scanning' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreview(url)
    setState('preview')
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setSelectedFile(null)
    setState('idle')
    setStatusMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function scan() {
    const file = selectedFile
    if (!file) return

    setState('scanning')
    setStatusMsg('Scanning form with AI…')

    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res = await fetch('/api/ai/photo-to-intake', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Scan failed')
      }

      const result: IntakeResult = await res.json()
      const fieldCount = Object.values(result).filter(Boolean).length
      setStatusMsg(`AI filled ${fieldCount} fields from the photo`)
      setState('done')
      onPrefill(result)
    } catch (err) {
      setState('error')
      setStatusMsg(err instanceof Error ? err.message : 'Scan failed')
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <LiveRegion message={statusMsg} />

      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">Scan Paper Intake Form</p>
        <span className="text-xs text-muted-foreground ml-auto">AI-powered · Gemini Vision</span>
      </div>

      {state === 'idle' && (
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground mb-3">
            Take a photo of a paper intake form — AI will prefill the fields below
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            Choose Photo or Take Picture
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            className="sr-only"
            aria-label="Upload intake form photo"
            onChange={handleFileChange}
          />
        </div>
      )}

      {(state === 'preview' || state === 'scanning') && preview && (
        <div className="space-y-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Intake form preview"
              className="w-full max-h-48 object-contain rounded border bg-white"
            />
            {state === 'preview' && (
              <button
                type="button"
                onClick={reset}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {state === 'scanning' && (
              <div className="absolute inset-0 bg-primary/10 rounded flex items-center justify-center">
                <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 text-sm font-medium shadow">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                  Scanning with AI…
                </div>
              </div>
            )}
          </div>
          {state === 'preview' && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={scan}
                className="flex-1 gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Extract Fields with AI
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {state === 'done' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium">{statusMsg}</p>
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-xs h-7">
            Scan another
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-destructive">{statusMsg}</p>
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-xs h-7">
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
