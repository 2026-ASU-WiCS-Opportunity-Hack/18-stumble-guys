'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, BarChart3,
  FileText, Settings, Upload, BrainCircuit, UserCog
} from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { NotificationToggle } from '@/components/pwa/NotificationToggle'
import type { TranslationKey } from '@/lib/i18n'

const mainNav: { href: string; labelKey: TranslationKey; icon: React.ElementType }[] = [
  { href: '/dashboard',    labelKey: 'nav_dashboard',    icon: LayoutDashboard },
  { href: '/clients',      labelKey: 'nav_clients',      icon: Users },
  { href: '/appointments', labelKey: 'nav_appointments', icon: Calendar },
  { href: '/reports',      labelKey: 'nav_reports',      icon: BarChart3 },
]

const adminNav: { href: string; labelKey: TranslationKey; icon: React.ElementType }[] = [
  { href: '/admin/staff',     labelKey: 'nav_staff',     icon: UserCog },
  { href: '/admin/audit-log', labelKey: 'nav_audit',     icon: FileText },
  { href: '/admin/settings',  labelKey: 'nav_settings',  icon: Settings },
  { href: '/admin/import',    labelKey: 'nav_import',    icon: Upload },
  { href: '/admin/prompts',   labelKey: 'nav_prompts',   icon: BrainCircuit },
]

function NavLink({ href, labelKey, icon: Icon }: { href: string; labelKey: TranslationKey; icon: React.ElementType }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600',
        isActive
          ? 'bg-indigo-500/20 text-white'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-indigo-300' : 'text-zinc-500 group-hover:text-zinc-300'
        )}
        aria-hidden="true"
      />
      {t(labelKey)}
    </Link>
  )
}

export function NavList({ role }: { role: string }) {
  const { lang, setLang, t } = useLanguage()
  const isAdmin = role === 'admin'

  return (
    <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto flex flex-col">
      <div className="flex-1 space-y-0.5">
        {mainNav.map(item => <NavLink key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 select-none">
                {t('nav_admin')}
              </p>
            </div>
            {adminNav.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </div>

      {/* Push notification opt-in */}
      <div className="pt-1 pb-0">
        <NotificationToggle />
      </div>

      {/* Global language toggle */}
      <div className="pt-2 pb-1 px-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 select-none mb-2">
          Language / Idioma
        </p>
        <div
          role="group"
          aria-label="Select interface language"
          className="flex rounded-lg overflow-hidden border border-zinc-700"
        >
          <button
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
            className={cn(
              'flex-1 py-1.5 text-[12px] font-semibold transition-colors',
              lang === 'en'
                ? 'bg-white text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLang('es')}
            aria-pressed={lang === 'es'}
            className={cn(
              'flex-1 py-1.5 text-[12px] font-semibold transition-colors border-l border-zinc-700',
              lang === 'es'
                ? 'bg-white text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
            )}
          >
            ES
          </button>
        </div>
      </div>
    </div>
  )
}
