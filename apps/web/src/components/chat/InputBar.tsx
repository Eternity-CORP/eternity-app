'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'

interface InputBarProps {
  onSend: (msg: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function InputBar({ onSend, disabled = false, placeholder = 'Type a message...' }: InputBarProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="chat-input-container rounded-2xl px-4 py-3 flex items-end gap-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        maxLength={1000}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none leading-relaxed max-h-[120px]"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`
          w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all
          ${canSend
            ? 'bg-[#3388FF] hover:bg-[#3388FF]/80 cursor-pointer'
            : 'bg-white/5 cursor-not-allowed'
          }
        `}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={canSend ? 'white' : 'rgba(255,255,255,0.2)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}
