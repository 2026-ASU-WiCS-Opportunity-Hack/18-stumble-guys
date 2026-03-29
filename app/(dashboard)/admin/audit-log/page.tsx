import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Suspense } from 'react'
import Link from 'next/link'
import { AuditFilters } from '@/components/audit/AuditFilters'

const PAGE_SIZE = 25

const actionColors: Record<string, string> = {
  create_client:        'bg-green-100 text-green-800',
  update_client:        'bg-blue-100 text-blue-800',
  delete_client:        'bg-red-100 text-red-800',
  create_service_entry: 'bg-purple-100 text-purple-800',
  update_service_entry: 'bg-indigo-100 text-indigo-800',
  delete_service_entry: 'bg-red-100 text-red-800',
  create_appointment:   'bg-teal-100 text-teal-800',
  update_appointment:   'bg-cyan-100 text-cyan-800',
  update_follow_up:     'bg-orange-100 text-orange-800',
  ai_voice_to_notes:    'bg-violet-100 text-violet-800',
  ai_client_summary:    'bg-violet-100 text-violet-800',
  ai_funder_report:     'bg-violet-100 text-violet-800',
  import_csv:           'bg-amber-100 text-amber-800',
  export_csv:           'bg-amber-100 text-amber-800',
  invite_staff:         'bg-sky-100 text-sky-800',
  remove_staff:         'bg-red-100 text-red-800',
  update_staff_role:    'bg-sky-100 text-sky-800',
  invite_client:        'bg-sky-100 text-sky-800',
  page_visit:           'bg-zinc-100 text-zinc-600',
}

const ALL_ACTIONS = [
  'create_client', 'update_client', 'delete_client',
  'create_service_entry', 'update_service_entry', 'delete_service_entry',
  'create_appointment', 'update_appointment',
  'update_follow_up',
  'ai_voice_to_notes', 'ai_client_summary', 'ai_funder_report',
  'import_csv', 'export_csv',
  'invite_staff', 'remove_staff', 'update_staff_role', 'invite_client',
  'page_visit',
]

type SearchParams = {
  action?: string; user_id?: string; role?: string
  date_from?: string; date_to?: string; page?: string
}

/** Build a URL that preserves current filters and sets a new page */
function pageUrl(filters: SearchParams, page: number) {
  const p = new URLSearchParams()
  if (filters.action)    p.set('action',    filters.action)
  if (filters.user_id)   p.set('user_id',   filters.user_id)
  if (filters.role)      p.set('role',      filters.role)
  if (filters.date_from) p.set('date_from', filters.date_from)
  if (filters.date_to)   p.set('date_to',   filters.date_to)
  p.set('page', String(page))
  return `/admin/audit-log?${p.toString()}`
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const page = Math.max(1, parseInt(filters.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return (
      <main id="main-content" className="p-6">
        <p role="alert" className="text-red-600 font-medium">Access denied. Admin role required.</p>
      </main>
    )
  }

  const { data: orgUsers } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('org_id', userData.org_id)
    .order('full_name')

  // Build base query with filters
  let query = supabase
    .from('audit_logs')
    .select('*, users(full_name, email, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.action)    query = query.eq('action',     filters.action)
  if (filters.user_id)   query = query.eq('actor_id',   filters.user_id)
  if (filters.role)      query = query.eq('actor_role',  filters.role)
  if (filters.date_from) query = query.gte('created_at', filters.date_from)
  if (filters.date_to)   query = query.lte('created_at', filters.date_to + 'T23:59:59Z')

  const { data: logs, count } = await query

  const totalPages   = Math.ceil((count ?? 0) / PAGE_SIZE)
  const activeFilters = Object.entries(filters)
    .filter(([k, v]) => k !== 'page' && Boolean(v)).length

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Activity is logged for 90 days. No raw PII recorded — state stored as hashes.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-20 rounded-lg border bg-card animate-pulse" />}>
        <AuditFilters
          users={orgUsers ?? []}
          actions={ALL_ACTIONS}
          current={filters}
          activeCount={activeFilters}
        />
      </Suspense>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {count ?? 0} {activeFilters > 0 ? 'filtered' : 'total'} entr{count === 1 ? 'y' : 'ies'}
          {totalPages > 1 && (
            <span className="ml-1">
              — page {page} of {totalPages}
            </span>
          )}
        </span>
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} filters={filters} />
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        {!logs?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {activeFilters > 0 ? 'No entries match your filters.' : 'No audit entries yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Audit log entries">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Page / Table</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Record</th>
                  <th className="px-4 py-3 font-medium hidden xl:table-cell">Detail</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => {
                  const actor = log.users as unknown as { full_name?: string; email?: string; role?: string } | null
                  const meta  = log.metadata as Record<string, unknown> | null
                  return (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors text-xs">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <time dateTime={log.created_at} title={log.created_at}>
                          {format(new Date(log.created_at), 'MMM d, yyyy')}
                          <br />
                          <span className="text-[11px]">{format(new Date(log.created_at), 'h:mm:ss a')}</span>
                        </time>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {actor?.full_name ?? actor?.email ?? log.actor_id?.slice(0, 8) ?? '—'}
                        </div>
                        {actor?.full_name && (
                          <div className="text-[11px] text-muted-foreground">{actor.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(log.actor_role ?? actor?.role) && (
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            (log.actor_role ?? actor?.role) === 'admin'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {log.actor_role ?? actor?.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${actionColors[log.action] ?? 'bg-zinc-100 text-zinc-700'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.action === 'page_visit'
                          ? <span className="font-mono text-[11px]">{log.page_path ?? '—'}</span>
                          : log.table_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground hidden lg:table-cell">
                        {log.record_id ? `${log.record_id.slice(0, 8)}…` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell max-w-xs">
                        {meta && Object.keys(meta).length > 0 && (
                          <div className="space-y-0.5">
                            {Object.entries(meta).filter(([k]) => k !== 'ip').map(([k, v]) => (
                              <div key={k} className="text-[11px]">
                                <span className="font-medium text-foreground">{k}:</span>{' '}
                                <span className="truncate">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {log.after_hash && (
                          <div className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
                            hash: {log.after_hash.slice(0, 12)}…
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground hidden lg:table-cell text-[11px]">
                        {(meta?.ip as string) ?? log.ip_address ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} totalPages={totalPages} filters={filters} />
        </div>
      )}
    </main>
  )
}

function Pagination({
  page, totalPages, filters,
}: {
  page: number; totalPages: number; filters: SearchParams
}) {
  // Show up to 7 page numbers with ellipsis
  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const btnBase = 'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400'

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      {/* Prev */}
      {page > 1 ? (
        <Link href={pageUrl(filters, page - 1)} className={`${btnBase} text-zinc-600 hover:bg-zinc-100`} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${btnBase} text-zinc-300 cursor-not-allowed`} aria-disabled="true"><ChevronLeft className="h-4 w-4" /></span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className={`${btnBase} text-zinc-400 cursor-default`}>…</span>
        ) : p === page ? (
          <span key={p} className={`${btnBase} bg-zinc-900 text-white`} aria-current="page">{p}</span>
        ) : (
          <Link key={p} href={pageUrl(filters, p as number)} className={`${btnBase} text-zinc-600 hover:bg-zinc-100`} aria-label={`Page ${p}`}>{p}</Link>
        )
      )}

      {/* Next */}
      {page < totalPages ? (
        <Link href={pageUrl(filters, page + 1)} className={`${btnBase} text-zinc-600 hover:bg-zinc-100`} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${btnBase} text-zinc-300 cursor-not-allowed`} aria-disabled="true"><ChevronRight className="h-4 w-4" /></span>
      )}
    </nav>
  )
}
