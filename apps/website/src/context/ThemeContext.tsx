'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode, type JSX } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: (x?: number, y?: number) => void
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

const TRANSITION_DURATION = 600

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

  const toggleTheme = useCallback((x?: number, y?: number) => {
    if (isAnimatingRef.current) return
    const overlay = overlayRef.current
    if (!overlay) {
      setTheme(prev => prev === 'light' ? 'dark' : 'light')
      return
    }

    const nextTheme = theme === 'light' ? 'dark' : 'light'
    const cx = x ?? window.innerWidth / 2
    const cy = y ?? 0

    // Calculate radius to cover entire screen from click point
    const maxX = Math.max(cx, window.innerWidth - cx)
    const maxY = Math.max(cy, window.innerHeight - cy)
    const radius = Math.sqrt(maxX * maxX + maxY * maxY)

    isAnimatingRef.current = true

    // Set overlay color to the NEXT theme's background
    overlay.style.background = nextTheme === 'dark' ? '#000000' : '#ffffff'
    overlay.style.clipPath = `circle(0px at ${cx}px ${cy}px)`
    overlay.style.opacity = '1'
    overlay.style.transition = 'none'

    // Force reflow
    overlay.offsetHeight

    // Expand circle
    overlay.style.transition = `clip-path ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
    overlay.style.clipPath = `circle(${radius}px at ${cx}px ${cy}px)`

    // Switch actual theme at midpoint so content updates under the overlay
    const midTimer = setTimeout(() => {
      setTheme(nextTheme)
    }, TRANSITION_DURATION * 0.35)

    // Fade out overlay after circle fully expanded
    const endTimer = setTimeout(() => {
      overlay.style.transition = `opacity 200ms ease-out`
      overlay.style.opacity = '0'

      setTimeout(() => {
        overlay.style.clipPath = ''
        isAnimatingRef.current = false
      }, 200)
    }, TRANSITION_DURATION)

    return () => {
      clearTimeout(midTimer)
      clearTimeout(endTimer)
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
