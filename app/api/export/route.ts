import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clients, error } = await supabase
    .from('clients')
    .select('client_number, first_name, last_name, date_of_birth, phone, email, language_preference, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build CSV
  const headers = ['client_number', 'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'language_preference', 'is_active', 'created_at']

  function escape(val: unknown): string {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = [
    headers.join(','),
    ...(clients ?? []).map(c =>
      headers.map(h => escape(c[h as keyof typeof c])).join(',')
    ),
  ]

  const csv = rows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
