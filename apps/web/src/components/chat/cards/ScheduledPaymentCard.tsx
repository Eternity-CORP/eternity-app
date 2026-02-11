'use client'

import { useState } from 'react'
import type { ScheduledPaymentPreview } from '@e-y/shared'
import ChatCardShell from './ChatCardShell'

interface ScheduledPaymentCardProps {
  preview: ScheduledPaymentPreview
  onConfirm: () => void
  onCancel: () => void
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

const RECURRING_LABELS: Record<string, string> = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export default function ScheduledPaymentCard({ preview, onConfirm, onCancel }: ScheduledPaymentCardProps) {
  const [status, setStatus] = useState<'idle' | 'confirming'>('idle')

  const handleConfirm = () => {
    setStatus('confirming')
    onConfirm()
  }

  const scheduledDate = new Date(preview.scheduledAt)
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const recipientDisplay = preview.recipientUsername
    ? `@${preview.recipientUsername}`
    : `${preview.recipient.slice(0, 6)}...${preview.recipient.slice(-4)}`

  return (
    <ChatCardShell className="border border-[#3388FF]/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#3388FF]/15 flex items-center justify-center text-[#3388FF]">
          <ClockIcon />
        </div>
        <span className="text-sm font-semibold text-white">Schedule Payment</span>
        {preview.recurring !== 'once' && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#3388FF]/15 text-[#3388FF]">
            {RECURRING_LABELS[preview.recurring]}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Amount</span>
          <span className="text-sm font-semibold text-white">{preview.amount} {preview.token}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40">To</span>
          <span className="text-xs text-[#3388FF] font-mono">{recipientDisplay}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40">When</span>
          <span className="text-xs text-white/70">{formattedDate} {formattedTime}</span>
        </div>
        {preview.description && (
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Memo</span>
            <span className="text-xs text-white/60 truncate max-w-[180px]">{preview.description}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
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
          {status === 'confirming' ? 'Scheduling...' : 'Schedule'}
        </button>
      </div>
    </ChatCardShell>
  )
}
