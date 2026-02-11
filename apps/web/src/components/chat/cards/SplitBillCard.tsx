'use client'

import { useState } from 'react'
import type { SplitPreview } from '@e-y/shared'
import ChatCardShell from './ChatCardShell'

interface SplitBillCardProps {
  preview: SplitPreview
  onConfirm: () => void
  onCancel: () => void
}

function SplitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
      <path d="m15 9 6-6" />
    </svg>
  )
}

export default function SplitBillCard({ preview, onConfirm, onCancel }: SplitBillCardProps) {
  const [status, setStatus] = useState<'idle' | 'confirming'>('idle')

  const handleConfirm = () => {
    setStatus('confirming')
    onConfirm()
  }

  return (
    <ChatCardShell className="border border-[#22C55E]/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E]">
          <SplitIcon />
        </div>
        <span className="text-sm font-semibold text-white">Split Bill</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E]">
          {preview.participants.length} people
        </span>
      </div>

      {/* Amount summary */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Total</span>
          <span className="text-sm font-semibold text-white">{preview.totalAmount} {preview.token}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Per person</span>
          <span className="text-xs text-[#22C55E] font-mono">{preview.perPerson} {preview.token}</span>
        </div>
        {preview.description && (
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Memo</span>
            <span className="text-xs text-white/60 truncate max-w-[180px]">{preview.description}</span>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="border-t border-white/5 pt-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1.5">Participants</span>
        <div className="space-y-1 max-h-[100px] overflow-y-auto">
          {preview.participants.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-white/70 truncate max-w-[160px]">
                {p.username ? `@${p.username}` : p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
              </span>
              <span className="text-white/50 font-mono">{p.amount}</span>
            </div>
          ))}
        </div>
      </div>

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
          {status === 'confirming' ? 'Creating...' : 'Create Split'}
        </button>
      </div>
    </ChatCardShell>
  )
}
