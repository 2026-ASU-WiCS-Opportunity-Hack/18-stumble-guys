import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User } from 'lucide-react'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role, org_id, organizations(name)')
    .eq('id', user.id)
    .single()

  // Only client-role users belong here
  if (userData?.role !== 'client') redirect('/dashboard')

  const orgName = (userData?.organizations as unknown as { name: string })?.name
  const displayName = userData?.full_name ?? user.email ?? ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      {/* Top nav bar */}
      <header className="h-14 bg-white border-b border-zinc-200 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">C</span>
          </div>
          <div>
            <span className="text-[14px] font-semibold text-zinc-900">Client Portal</span>
            {orgName && (
              <span className="ml-2 text-[12px] text-zinc-500">{orgName}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-700">
              {initials || <User className="h-4 w-4" />}
            </div>
            <span className="text-[13px] font-medium text-zinc-700">{displayName}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Client</span>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Nav links */}
      <nav className="bg-white border-b border-zinc-200 px-4 md:px-8">
        <div className="flex gap-1">
          <Link
            href="/portal"
            className="px-3 py-2.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 border-b-2 border-transparent hover:border-zinc-300 transition-colors"
          >
            My Profile
          </Link>
        </div>
      </nav>

      <main id="main-content" className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        {children}
      </main>

      <footer className="py-4 text-center text-xs text-zinc-400 border-t">
        Powered by CaseTrack · {orgName}
      </footer>
    </div>
  )
}
