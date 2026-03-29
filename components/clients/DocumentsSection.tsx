'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Paperclip, Upload, Trash2, Download, Eye, EyeOff,
  FileText, Image, Loader2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

interface Document {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  visible_to_client: boolean
  created_at: string
  download_url: string | null
  users: { full_name: string } | null
}

interface Props {
  clientId: string
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith('image/')) return <Image className="h-4 w-4 text-sky-500" aria-hidden="true" />
  return <FileText className="h-4 w-4 text-zinc-400" aria-hidden="true" />
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsSection({ clientId }: Props) {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [visibleToClient, setVisibleToClient] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/documents`)
      .then(r => r.ok ? r.json() : [])
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('visible_to_client', String(visibleToClient))

    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); return }

      // Refresh list
      const updated = await fetch(`/api/clients/${clientId}/documents`).then(r => r.json())
      setDocs(updated)
      setShowUploadPanel(false)
      setVisibleToClient(false)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setUploadError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  async function toggleVisibility(doc: Document) {
    setTogglingId(doc.id)
    const res = await fetch(`/api/clients/${clientId}/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_to_client: !doc.visible_to_client }),
    })
    if (res.ok) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, visible_to_client: !d.visible_to_client } : d))
    }
    setTogglingId(null)
  }

  async function deleteDoc(doc: Document) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    setDeletingId(doc.id)
    const res = await fetch(`/api/clients/${clientId}/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) setDocs(prev => prev.filter(d => d.id !== doc.id))
    setDeletingId(null)
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            Documents
          </p>
          {!loading && (
            <span className="text-[11px] text-zinc-400 ml-1">{docs.length}</span>
          )}
        </div>
        <button
          onClick={() => { setShowUploadPanel(v => !v); setUploadError(null) }}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Attach file
        </button>
      </div>

      {/* Upload panel */}
      {showUploadPanel && (
        <div className="px-5 py-4 border-b border-zinc-100 bg-white space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-zinc-200 hover:border-zinc-300',
            )}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            aria-label="Upload file"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" aria-hidden="true" />
                <p className="text-sm text-zinc-500">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="h-6 w-6 text-zinc-400" aria-hidden="true" />
                <p className="text-sm font-medium text-zinc-700">Drop file here or click to browse</p>
                <p className="text-xs text-zinc-400">PDF, JPEG, PNG, WEBP, HEIC · max 10 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/heic"
            onChange={handleFileInput}
            disabled={uploading}
            className="sr-only"
          />

          {/* Visible to client toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <button
              type="button"
              role="switch"
              aria-checked={visibleToClient}
              onClick={() => setVisibleToClient(v => !v)}
              disabled={uploading}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                visibleToClient ? 'bg-indigo-600' : 'bg-zinc-200',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform',
                  visibleToClient ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
            <span className="text-sm text-zinc-700">
              Visible to client
              <span className="ml-1.5 text-xs text-zinc-400">
                {visibleToClient ? '— client can download this file' : '— staff only'}
              </span>
            </span>
          </label>

          {uploadError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> {uploadError}
            </p>
          )}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="px-5 py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden="true" />
        </div>
      ) : docs.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-zinc-400 text-center">
          No documents attached yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {docs.map(doc => (
            <li key={doc.id} className="group px-5 py-3 flex items-center gap-3 hover:bg-zinc-100/60 transition-colors">
              <FileIcon mimeType={doc.mime_type} />

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-zinc-800 truncate">{doc.file_name}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {formatBytes(doc.file_size)}
                  {doc.users?.full_name && ` · ${doc.users.full_name}`}
                  {' · '}{format(parseISO(doc.created_at), 'MMM d, yyyy')}
                </p>
              </div>

              {/* Visibility badge */}
              <button
                onClick={() => toggleVisibility(doc)}
                disabled={togglingId === doc.id}
                title={doc.visible_to_client ? 'Click to hide from client' : 'Click to show to client'}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors',
                  doc.visible_to_client
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                    : 'text-zinc-500 bg-zinc-100 border-zinc-200 hover:bg-zinc-200',
                )}
              >
                {togglingId === doc.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : doc.visible_to_client
                    ? <Eye className="h-3 w-3" aria-hidden="true" />
                    : <EyeOff className="h-3 w-3" aria-hidden="true" />
                }
                {doc.visible_to_client ? 'Client visible' : 'Staff only'}
              </button>

              {/* Download */}
              {doc.download_url && (
                <a
                  href={doc.download_url}
                  download={doc.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Download ${doc.file_name}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteDoc(doc)}
                disabled={deletingId === doc.id}
                className="shrink-0 p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                aria-label={`Delete ${doc.file_name}`}
              >
                {deletingId === doc.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                }
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
