'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Lang, translations, t as tFn, type TranslationKey } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')
  const router = useRouter()

  // Hydrate from cookie (set by server) or localStorage on mount
  useEffect(() => {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('ui_lang='))?.split('=')[1] as Lang | undefined
    const stored = cookie ?? localStorage.getItem('ui_lang') as Lang | null
    if (stored === 'en' || stored === 'es') {
      setLangState(stored)
      document.documentElement.lang = stored
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('ui_lang', l)
    // Cookie lets server components read the language on next request
    document.cookie = `ui_lang=${l}; path=/; max-age=31536000; SameSite=Lax`
    document.documentElement.lang = l
    // Re-render server components with the updated cookie (no full page reload)
    router.refresh()
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>) {
    return tFn(translations[lang], key, vars)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
