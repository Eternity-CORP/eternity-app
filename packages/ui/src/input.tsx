'use client'

import { cn } from './utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl outline-none transition-colors',
          'bg-[var(--input-bg)] text-[var(--foreground)]',
          'border focus:ring-2 focus:ring-[var(--accent-blue)]/20',
          error ? 'border-red-500' : 'border-[var(--border)]',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  rows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none',
          'bg-[var(--input-bg)] text-[var(--foreground)]',
          'border focus:ring-2 focus:ring-[var(--accent-blue)]/20',
          error ? 'border-red-500' : 'border-[var(--border)]',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
