'use client'

import { useState } from 'react'
import type { UsernamePreview } from '@e-y/shared'
import ChatCardShell from './ChatCardShell'

interface UsernameCardProps {
  preview: UsernamePreview
  onConfirm: () => void
  onCancel: () => void
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  )
}

export default function UsernameCard({ preview, onConfirm, onCancel }: UsernameCardProps) {
  const [status, setStatus] = useState<'idle' | 'confirming'>('idle')

  const handleConfirm = () => {
    setStatus('confirming')
    onConfirm()
  }

  return (
    <ChatCardShell className="border border-[#3388FF]/20">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#3388FF]/15 flex items-center justify-center text-[#3388FF]">
            <UserIcon />
          </div>
          <span className="text-sm font-semibold text-white">Register Username</span>
        </div>

        {/* Username preview */}
        <div className="space-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Username</span>
            <p className="text-xs text-[#3388FF] font-mono mt-0.5">@{preview.username}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Wallet</span>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              {preview.address.slice(0, 6)}...{preview.address.slice(-4)}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-white/30 mt-3 mb-3">
          Requires a wallet signature to verify ownership.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={status === 'confirming'}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-white/60 glass-card hover:text-white/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={status === 'confirming'}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-black shimmer cursor-pointer hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {status === 'confirming' ? 'Signing...' : 'Register'}
          </button>
        </div>
    </ChatCardShell>
  )
}
