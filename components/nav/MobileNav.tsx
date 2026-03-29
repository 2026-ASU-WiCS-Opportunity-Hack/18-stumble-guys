'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Menu, X, LogOut,
  LayoutDashboard, Users, Calendar, BarChart3,
  FileText, Settings, Upload, UserCog, BrainCircuit
} from 'lucide-react'
import { NotificationToggle } from '@/components/pwa/NotificationToggle'

const mainNav = [
  { href: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/clients',      label: 'Clients',         icon: Users },
  { href: '/appointments', label: 'Appointments',    icon: Calendar },
  { href: '/reports',      label: 'Reports',         icon: BarChart3 },
]

const adminNav = [
  { href: '/admin/staff',     label: 'Staff',           icon: UserCog },
  { href: '/admin/audit-log', label: 'Audit Log',       icon: FileText },
  { href: '/admin/settings',  label: 'Settings',        icon: Settings },
  { href: '/admin/import',    label: 'Import / Export', icon: Upload },
  { href: '/admin/prompts',   label: 'AI Prompts',      icon: BrainCircuit },
]

const roleBadgeStyle: Record<string, string> = {
  admin: 'bg-indigo-500/30 text-indigo-200',
  staff: 'bg-zinc-600/50 text-zinc-300',
  client: 'bg-emerald-500/30 text-emerald-200',
}

interface Props {
  initials: string
  displayName: string
  orgName?: string
  role: string
}

export function MobileNav({ initials, displayName, orgName, role }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-[13px] font-semibold text-white tracking-tight">CaseTrack</span>
        <div className="w-8" aria-hidden="true" />
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        aria-label="Mobile navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-zinc-800 flex flex-col md:hidden',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">C</span>
            </div>
            <span className="text-[13px] font-semibold text-white tracking-tight">CaseTrack</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[14px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500',
                  isActive
                    ? 'bg-white/[0.12] text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-zinc-500')} aria-hidden="true" />
                {label}
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 select-none">Admin</p>
              </div>

              {adminNav.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[14px] font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500',
                      isActive
                        ? 'bg-white/[0.12] text-white'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-zinc-500')} aria-hidden="true" />
                    {label}
                  </Link>
                )
              })}
            </>
          )}
        </div>

        {/* Push notification opt-in */}
        <div className="px-2 pb-1">
          <NotificationToggle />
        </div>

        {/* User */}
        <div className="px-2 py-3 border-t border-zinc-700 shrink-0">
          <div className="px-2.5 py-2 mb-1 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-white truncate leading-none">{displayName}</p>
              {orgName && <p className="text-[11px] text-zinc-500 truncate mt-0.5 leading-none">{orgName}</p>}
            </div>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize', roleBadgeStyle[role] ?? roleBadgeStyle.staff)}>
              {role}
            </span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}
