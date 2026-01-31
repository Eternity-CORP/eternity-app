'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from './Button'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Roadmap', href: '#coming-soon' },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'glass py-3' : 'py-5'
      )}
    >
      <nav className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={isDark ? '/images/logo_white.svg' : '/images/logo.svg'}
            alt="Eternity"
            width={36}
            height={36}
            className="w-9 h-9"
          />
          <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Eternity</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors duration-200 text-sm font-medium"
              style={{ color: 'var(--foreground-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
          <Button variant="primary" size="sm" onClick={() => scrollToSection('cta')}>
            Get Early Access
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            className="p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={cn(
                  'w-full h-0.5 transition-all duration-300',
                  isMobileMenuOpen && 'rotate-45 translate-y-2'
                )}
                style={{ background: 'var(--foreground)' }}
              />
              <span
                className={cn(
                  'w-full h-0.5 transition-all duration-300',
                  isMobileMenuOpen && 'opacity-0'
                )}
                style={{ background: 'var(--foreground)' }}
              />
              <span
                className={cn(
                  'w-full h-0.5 transition-all duration-300',
                  isMobileMenuOpen && '-rotate-45 -translate-y-2'
                )}
                style={{ background: 'var(--foreground)' }}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass"
            style={{ borderTop: '1px solid var(--border-light)' }}
          >
            <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors py-2"
                  style={{ color: 'var(--foreground-muted)' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Button variant="primary" size="sm" className="w-full" onClick={() => scrollToSection('cta')}>
                Get Early Access
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
