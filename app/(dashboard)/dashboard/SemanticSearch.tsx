'use client'

import { useState, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2, CalendarDays, Tag, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { LiveRegion } from '@/components/a11y/LiveRegion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface SearchResult {
  service_entry_id: string
  client_id: string
  client_name: string
  date: string
  service_type: string
  notes: string
  similarity: number
}

function matchBadge(pct: number) {
  if (pct >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-zinc-100 text-zinc-500 border-zinc-200'
}

function initials(name: string) {
  const parts = name?.trim().split(' ') ?? []
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setSearched(false); return }
    setSearching(true)
    setStatusMsg('Searching...')
    try {
      const res = await fetch(`/api/ai/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setSearched(true)
      setStatusMsg(`${data.results?.length ?? 0} results found`)
    } catch {
      setStatusMsg('Search failed')
    } finally {
      setSearching(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  return (
    <div role="search" aria-label="Semantic case note search">
      <LiveRegion message={statusMsg} />

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
        {searching
          ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" aria-hidden="true" />
          : null
        }
        <Input
          type="search"
          placeholder='Search case notes… e.g. "housing referral", "family separation"'
          value={query}
          onChange={handleChange}
          className="pl-9 pr-9 h-10 text-[13px]"
          aria-label="Search case notes by meaning"
          aria-controls="search-results"
          aria-autocomplete="list"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          aria-label={`${results.length} search results`}
          className="mt-2 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden divide-y divide-zinc-100"
        >
          {results.map((r, idx) => {
            const pct = Math.round(r.similarity * 100)
            const name = r.client_name ?? '—'
            const svcType = r.service_type ?? ''
            const dateStr = r.date ? format(new Date(r.date), 'MMM d, yyyy') : ''

            return (
              <li key={r.service_entry_id} role="option" aria-selected="false">
                <Link
                  href={`/clients/${r.client_id}#${r.service_entry_id}`}
                  className="group flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
                >
                  {/* Avatar */}
                  <div
                    className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-semibold text-zinc-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    {initials(name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + badges + match */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[13px] font-semibold text-zinc-900 leading-none">
                        {name}
                      </span>

                      {svcType && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                          <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                          {svcType}
                        </span>
                      )}

                      {dateStr && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                          <CalendarDays className="h-2.5 w-2.5" aria-hidden="true" />
                          {dateStr}
                        </span>
                      )}

                      <span className={cn(
                        'ml-auto inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full border',
                        matchBadge(pct)
                      )}>
                        {pct}% match
                      </span>
                    </div>

                    {/* Row 2: note snippet (2 lines) */}
                    <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">
                      {r.notes}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-500 shrink-0 mt-1 transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {searched && results.length === 0 && !searching && (
        <p className="mt-3 text-[13px] text-zinc-400 text-center py-4">
          No matching case notes found.
        </p>
      )}
    </div>
  )
}
