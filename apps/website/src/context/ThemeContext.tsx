'use client'

import { createContext, useContext, useState, useEffect, type ReactNode, type JSX } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

// Default values for SSR
const defaultContext: ThemeContextType = {
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
}

const ThemeContext = createContext<ThemeContextType>(defaultContext)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme) {
      setTheme(savedTheme)
    } else if (prefersDark) {
      setTheme('dark')
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value = { theme, toggleTheme, isDark: theme === 'dark' }

  // Always provide context, but use default values until mounted to prevent hydration issues
  return (
    <ThemeContext.Provider value={mounted ? value : defaultContext}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
