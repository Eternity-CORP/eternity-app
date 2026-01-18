'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'hero', label: 'Hero' },
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'features', label: 'Features' },
  { id: 'coming-soon', label: 'Coming Soon' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'cta', label: 'Join Us' },
]

export function TimelineIndicator() {
  const [activeSection, setActiveSection] = useState('hero')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero
      setIsVisible(window.scrollY > 300)

      // Find active section
      const scrollPosition = window.scrollY + window.innerHeight / 3

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id)
        if (element) {
          const { offsetTop } = element
          if (scrollPosition >= offsetTop) {
            setActiveSection(sections[i].id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
      transition={{ duration: 0.3 }}
      className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end"
    >
      {sections.map((section, index) => {
        const isActive = section.id === activeSection
        const isPast = sections.findIndex((s) => s.id === activeSection) > index

        return (
          <div key={section.id} className="flex flex-col items-end">
            <button
              onClick={() => scrollToSection(section.id)}
              className="group flex items-center gap-4 py-2"
            >
              {/* Label - always visible */}
              <span
                className={cn(
                  'text-xs font-medium transition-all duration-300',
                  isActive
                    ? 'text-black'
                    : isPast
                      ? 'text-black/40'
                      : 'text-black/25 group-hover:text-black/50'
                )}
              >
                {section.label}
              </span>

              {/* Dot */}
              <div className="relative">
                <motion.div
                  className={cn(
                    'w-3 h-3 rounded-full transition-all duration-300 border-2',
                    isActive
                      ? 'bg-black border-black scale-125'
                      : isPast
                        ? 'bg-black/40 border-black/40'
                        : 'bg-transparent border-black/20 group-hover:border-black/40'
                  )}
                  animate={isActive ? { scale: [1.25, 1.4, 1.25] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Active glow */}
                {isActive && (
                  <motion.div
                    className="absolute -inset-1 bg-black/10 rounded-full blur-sm"
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            </button>

            {/* Connection line - between items with more spacing */}
            {index < sections.length - 1 && (
              <div className="flex justify-end pr-[5px] h-6">
                <div
                  className={cn(
                    'w-px h-full transition-colors duration-300',
                    isPast ? 'bg-black/30' : 'bg-black/10'
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </motion.div>
  )
}
