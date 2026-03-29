import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, Clock, FileText, Phone, Mail, Paperclip, Download, Image } from 'lucide-react'

const BUCKET = 'client-documents'

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const urgencyDot: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-zinc-400',
}

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the client record linked to this portal user
  const { data: userData } = await supabase
    .from('users')
    .select('client_id, org_id, full_name')
    .eq('id', user.id)
    .single()

  if (!userData?.client_id) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">No client record linked to your account. Please contact your case manager.</p>
      </div>
    )
  }

  // Fetch client profile
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', userData.client_id)
    .single()

  if (!client) redirect('/login')

  // Fetch service history
  const { data: services } = await supabase
    .from('service_entries')
    .select('id, service_type, service_date, notes, created_at, users(full_name)')
    .eq('client_id', userData.client_id)
    .order('service_date', { ascending: false })
    .limit(20)

  // Fetch upcoming appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, scheduled_at, service_type, status, notes')
    .eq('client_id', userData.client_id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5)

  // Fetch documents visible to client
  const { data: rawDocs } = await supabase
    .from('client_documents')
    .select('id, file_name, file_size, mime_type, storage_path, created_at')
    .eq('client_id', userData.client_id)
    .eq('visible_to_client', true)
    .order('created_at', { ascending: false })

  const documents = await Promise.all(
    (rawDocs ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, download_url: signed?.signedUrl ?? null }
    }),
  )

  // Fetch pending follow-ups
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('id, description, due_date, urgency, category, status')
    .eq('client_id', userData.client_id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(10)

  const fullName = `${client.first_name} ${client.last_name}`

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700 shrink-0">
            {client.first_name[0]}{client.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-zinc-900">{fullName}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Client ID: {client.client_number}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  {client.phone}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  {client.email}
                </div>
              )}
              {client.date_of_birth && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  DOB: {format(new Date(client.date_of_birth), 'MMMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      {documents.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-zinc-500" />
            <h2 className="font-semibold">My Documents</h2>
            <span className="text-sm font-normal text-muted-foreground ml-1">({documents.length})</span>
          </div>
          <ul className="divide-y">
            {documents.map(doc => (
              <li key={doc.id} className="px-5 py-3 flex items-center gap-3">
                {doc.mime_type?.startsWith('image/')
                  ? <Image className="h-4 w-4 text-sky-500 shrink-0" aria-hidden="true" />
                  : <FileText className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(doc.file_size)}
                    {' · '}{format(new Date(doc.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {doc.download_url && (
                  <a
                    href={doc.download_url}
                    download={doc.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    aria-label={`Download ${doc.file_name}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming appointments */}
      {(appointments?.length ?? 0) > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              Upcoming Appointments
            </h2>
          </div>
          <div className="divide-y">
            {appointments!.map(appt => (
              <div key={appt.id} className="px-5 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{appt.service_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(appt.scheduled_at), 'EEEE, MMMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Scheduled</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending follow-ups */}
      {(followUps?.length ?? 0) > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Pending Action Items</h2>
          </div>
          <div className="divide-y">
            {followUps!.map(fu => (
              <div key={fu.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${urgencyDot[fu.urgency] ?? 'bg-zinc-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{fu.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {fu.due_date && <span>Due: {format(new Date(fu.due_date), 'MMM d, yyyy')}</span>}
                    {fu.category && <span>· {fu.category}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service history */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-500" />
            Service History
            {(services?.length ?? 0) > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({services!.length} entries)</span>
            )}
          </h2>
        </div>
        {!services?.length ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No services logged yet.</div>
        ) : (
          <div className="divide-y">
            {services.map(entry => {
              const staff = entry.users as unknown as { full_name?: string } | null
              return (
                <div key={entry.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        {entry.service_type}
                      </span>
                      {staff?.full_name && (
                        <span className="text-xs text-muted-foreground">by {staff.full_name}</span>
                      )}
                    </div>
                    <time className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(entry.service_date ?? entry.created_at), 'MMM d, yyyy')}
                    </time>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-zinc-700 mt-1 leading-relaxed line-clamp-3">{entry.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
