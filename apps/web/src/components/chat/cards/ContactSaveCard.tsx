'use client'

import { useState, useRef, useEffect } from 'react'
import { truncateAddress } from '@e-y/shared'
import ChatCardShell from './ChatCardShell'

interface ContactSaveCardProps {
  recipientAddress: string
  recipientUsername?: string
  onSave: (name: string) => void
  onSkip: () => void
}

function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

export default function ContactSaveCard({ recipientAddress, recipientUsername, onSave, onSkip }: ContactSaveCardProps) {
  const defaultName = recipientUsername ? recipientUsername.replace(/^@/, '') : ''
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <ChatCardShell>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E]">
            <UserPlusIcon />
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">Save to Contacts?</span>
        </div>

        {/* Recipient info */}
        <div className="space-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-subtle)]">Address</span>
            <p className="text-xs text-[var(--foreground-muted)] font-mono mt-0.5">{truncateAddress(recipientAddress)}</p>
          </div>

          {recipientUsername && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-subtle)]">Username</span>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{recipientUsername}</p>
            </div>
          )}

          {/* Name input */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-subtle)]">Name</span>
            <div className="editable-field mt-0.5">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()) }}
                placeholder="Enter contact name"
                className="w-full bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onSkip}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-[var(--foreground-muted)] glass-card hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={() => onSave(name.trim())}
            disabled={!name.trim()}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--foreground)] text-[var(--background)] shimmer cursor-pointer hover:opacity-90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
    </ChatCardShell>
  )
}
