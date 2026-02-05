'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export default function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div
      className={`
        bg-white/[0.02] border border-white/10 rounded-2xl
        ${paddingClasses[padding]}
        ${hover ? 'hover:bg-white/[0.04] hover:border-white/20 transition-all cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
