'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  /** The user's stored preference: 'light' | 'dark' | 'system' */
  preference: ThemePreference
  /** The resolved theme that is currently active */
  resolved: 'light' | 'dark'
  /** Change the theme preference */
  setTheme: (pref: ThemePreference) => void
  /** Convenience: cycle through light -> dark -> system */
  toggle: () => void
}

const STORAGE_KEY = 'ey_theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return getSystemTheme()
  return pref
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('dark')
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark')

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
    const pref = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'dark'
    setPreference(pref)
    const res = resolveTheme(pref)
    setResolved(res)
    applyTheme(res)
  }, [])

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const res = getSystemTheme()
      setResolved(res)
      applyTheme(res)
    }

    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref)
    localStorage.setItem(STORAGE_KEY, pref)
    const res = resolveTheme(pref)
    setResolved(res)
    applyTheme(res)
  }, [])

  const toggle = useCallback(() => {
    setPreference((prev) => {
      const next: ThemePreference =
        prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      const res = resolveTheme(next)
      setResolved(res)
      applyTheme(res)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ preference, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useThemeMode must be used within a ThemeProvider')
  }
  return ctx
}
