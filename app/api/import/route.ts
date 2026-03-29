import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import Papa from 'papaparse'
import { logAuditEvent } from '@/lib/audit'

interface CsvRow {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  language_preference?: string
  [key: string]: string | undefined
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.org_id) return NextResponse.json({ error: 'Org not found' }, { status: 403 })
  if (userData.role !== 'admin') return NextResponse.json({ error: 'Admin role required' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const text = await file.text()
  const { data: rows, errors } = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true })

  if (errors.length > 0) {
    return NextResponse.json({ error: `CSV parse error: ${errors[0].message}` }, { status: 422 })
  }

  let imported = 0
  let skipped = 0
  const importErrors: string[] = []

  for (const row of rows.slice(0, 500)) { // Hard limit 500 rows per import
    if (!row.first_name || !row.last_name) {
      skipped++
      continue
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        org_id: userData.org_id,
        first_name: row.first_name.trim(),
        last_name: row.last_name.trim(),
        date_of_birth: row.date_of_birth || null,
        phone: row.phone || null,
        email: row.email || null,
        language_preference: row.language_preference || 'en',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      importErrors.push(`${row.first_name} ${row.last_name}: ${error.message}`)
      skipped++
    } else {
      await logAuditEvent({
        actorId: user.id,
        orgId: userData.org_id,
        action: 'create_client',
        tableName: 'clients',
        recordId: client.id,
        after: { id: client.id, name: `${row.first_name} ${row.last_name}` },
      })
      imported++
    }
  }

  return NextResponse.json({ imported, skipped, errors: importErrors.slice(0, 10) })
}
