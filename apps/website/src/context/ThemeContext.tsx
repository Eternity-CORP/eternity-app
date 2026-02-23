'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode, type JSX } from 'react'

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

const EXPAND_DURATION = 700

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isAnimatingRef = useRef(false)

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

  const toggleTheme = useCallback(() => {
    if (isAnimatingRef.current) return
    const overlay = overlayRef.current
    if (!overlay) {
      setTheme(prev => prev === 'light' ? 'dark' : 'light')
      return
    }

    const nextTheme = theme === 'light' ? 'dark' : 'light'

    // Center of screen — "old TV" style
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const radius = Math.sqrt(cx * cx + cy * cy)

    isAnimatingRef.current = true

    // The overlay inverts everything underneath it as it expands
    // Content stays visible, just color-flipped inside the circle
    overlay.style.backdropFilter = 'invert(1)'
    ;(overlay.style as Record<string, string>).webkitBackdropFilter = 'invert(1)'
    overlay.style.background = 'transparent'
    overlay.style.clipPath = `circle(0px at ${cx}px ${cy}px)`
    overlay.style.opacity = '1'
    overlay.style.transition = 'none'

    // Force reflow
    overlay.offsetHeight

    // Expand from center — like turning on an old TV
    overlay.style.transition = `clip-path ${EXPAND_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`
    overlay.style.clipPath = `circle(${radius}px at ${cx}px ${cy}px)`

    // Switch theme slightly before animation ends so DOM is ready
    const switchTimer = setTimeout(() => {
      setTheme(nextTheme)
    }, EXPAND_DURATION - 80)

    // After circle fully covers screen, fade out the overlay smoothly
    const fadeTimer = setTimeout(() => {
      overlay.style.transition = 'opacity 300ms ease-out'
      overlay.style.opacity = '0'

      setTimeout(() => {
        overlay.style.clipPath = ''
        overlay.style.backdropFilter = ''
        ;(overlay.style as Record<string, string>).webkitBackdropFilter = ''
        isAnimatingRef.current = false
      }, 300)
    }, EXPAND_DURATION)

    return () => {
      clearTimeout(switchTimer)
      clearTimeout(fadeTimer)
    }
  }, [theme])

  const value = { theme, toggleTheme, isDark: theme === 'dark' }

  return (
    <ThemeContext.Provider value={mounted ? value : defaultContext}>
      {children}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          opacity: 0,
        }}
      />
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
