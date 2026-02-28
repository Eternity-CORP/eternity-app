'use client'

import type { KeyboardEvent, ChangeEvent } from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface InputBarProps {
  onSend: (msg: string) => void
  disabled?: boolean
  placeholder?: string
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      opacity={0.5}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function VoiceBars() {
  return (
    <div className="voice-bars">
      <div className="voice-bar" />
      <div className="voice-bar" />
      <div className="voice-bar" />
      <div className="voice-bar" />
      <div className="voice-bar" />
    </div>
  )
}

export default function InputBar({ onSend, disabled = false, placeholder = 'Type or dictate a message...' }: InputBarProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback((text?: string) => {
    const trimmed = (text ?? value).trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const { isListening, isSupported, transcript, start, stop } = useSpeechRecognition({
    onResult: (text) => {
      handleSend(text)
    },
  })

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (isListening) {
      stop()
    }
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const displayValue = isListening ? transcript : value

  // Auto-resize textarea when transcript updates during voice input
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    // Scroll to bottom so latest words are visible
    el.scrollTop = el.scrollHeight
  }, [displayValue])

  const hasText = value.trim().length > 0
  const showSend = hasText && !isListening

  const handleActionButton = () => {
    if (disabled) return
    if (isListening) {
      stop()
    } else if (showSend) {
      handleSend()
    } else if (isSupported) {
      setValue('')
      start()
    }
  }

  return (
    <div className={`chat-input-container rounded-2xl px-4 py-3 flex items-end gap-3 ${isListening ? '!border-red-500/30' : ''}`}>
      {isListening && (
        <div className="flex items-center gap-2 flex-shrink-0 self-center">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <VoiceBars />
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        maxLength={1000}
        rows={1}
        disabled={disabled}
        readOnly={isListening}
        placeholder={isListening ? 'Listening...' : placeholder}
        className={`flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder-[var(--foreground-subtle)] resize-none outline-none leading-relaxed max-h-[120px] ${isListening ? '!placeholder-red-400/50' : ''}`}
      />
      {(showSend || isListening || isSupported) && (
        <button
          onClick={handleActionButton}
          disabled={disabled}
          className={`
            w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all
            ${isListening
              ? 'bg-red-500/20 voice-pulse cursor-pointer'
              : showSend
                ? 'bg-[#3388FF] hover:bg-[#3388FF]/80 cursor-pointer'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] cursor-pointer'
            }
          `}
        >
          {isListening ? <StopIcon /> : showSend ? <SendIcon /> : <MicIcon />}
        </button>
      )}
    </div>
  )
}
