import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SkipNav } from '@/components/a11y/SkipNav'
import { AccessibilityWidget } from '@/components/a11y/AccessibilityWidget'
import { NavList } from '@/components/nav/NavItem'
import { MobileNav } from '@/components/nav/MobileNav'
import { LogOut } from 'lucide-react'
import { LanguageProvider } from '@/components/LanguageProvider'
import { getServerT } from '@/lib/server-lang'
import { PageVisitTracker } from '@/components/audit/PageVisitTracker'
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import { cn } from '@/lib/utils'

const roleBadgeStyle: Record<string, string> = {
  admin: 'bg-indigo-500/30 text-indigo-200',
  staff: 'bg-zinc-600/50 text-zinc-300',
  client: 'bg-emerald-500/30 text-emerald-200',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role, org_id, organizations(name)')
    .eq('id', user.id)
    .single()

  // Client portal users go to a different route
  if (userData?.role === 'client') redirect('/portal')

  const role = userData?.role ?? 'staff'
  const orgName = (userData?.organizations as unknown as { name: string })?.name
  const displayName = userData?.full_name ?? user.email ?? ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <LanguageProvider>
    <>
      <SkipNav />
      <div className="flex flex-col md:flex-row h-screen bg-zinc-100">
        {/* Mobile nav (hamburger + drawer) */}
        <MobileNav initials={initials} displayName={displayName} orgName={orgName} role={role} />

        {/* Desktop sidebar */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex w-56 bg-zinc-800 flex-col shrink-0 border-r border-zinc-700"
        >
          {/* Logo */}
          <div className="px-4 h-14 flex items-center border-b border-zinc-700 shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 rounded-sm"
            >
              <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-white">C</span>
              </div>
              <span className="text-[13px] font-semibold text-white tracking-tight">CaseTrack</span>
            </Link>
          </div>

          {/* Nav items */}
          <NavList role={role} />

          {/* User */}
          <div className="px-2 py-3 border-t border-zinc-700 shrink-0">
            <div className="px-2.5 py-2 mb-1">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {initials || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate leading-none">
                    {userData?.full_name ?? user.email}
                  </p>
                  {orgName && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5 leading-none">{orgName}</p>
                  )}
                </div>
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize shrink-0', roleBadgeStyle[role] ?? roleBadgeStyle.staff)}>
                  {role}
                </span>
              </div>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('layout_signout')}
              </button>
            </form>
          </div>
        </nav>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-zinc-100 min-h-0 flex flex-col">
          {children}
        </main>
      </div>
      <AccessibilityWidget />
      <PageVisitTracker />
      <ServiceWorkerRegistrar />
      <InstallBanner />
    </>
    </LanguageProvider>
  )
}
