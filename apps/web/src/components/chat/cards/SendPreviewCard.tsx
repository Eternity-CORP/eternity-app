'use client'

import { useState, useRef, useEffect } from 'react'
import { truncateAddress } from '@e-y/shared'

interface TransactionPreview {
  id: string
  from: string
  to: string
  toUsername?: string
  amount: string
  token: string
  amountUsd?: string
  estimatedGas?: string
  estimatedGasUsd?: string
  network?: string
}

interface SendPreviewCardProps {
  transaction: TransactionPreview
  onConfirm: (updated: TransactionPreview) => void
  onCancel: () => void
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

export default function SendPreviewCard({ transaction, onConfirm, onCancel }: SendPreviewCardProps) {
  const [draft, setDraft] = useState(transaction)
  const [editingTo, setEditingTo] = useState(false)
  const [editingAmount, setEditingAmount] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTo && toInputRef.current) toInputRef.current.focus()
  }, [editingTo])

  useEffect(() => {
    if (editingAmount && amountInputRef.current) amountInputRef.current.focus()
  }, [editingAmount])

  const handleToBlur = () => {
    setEditingTo(false)
  }

  const handleAmountBlur = () => {
    setEditingAmount(false)
  }

  return (
    <div className="flex justify-start">
      <div className="glass-card rounded-2xl p-4 max-w-[320px] w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#3388FF]/15 flex items-center justify-center text-[#3388FF]">
            <SendIcon />
          </div>
          <span className="text-sm font-semibold text-white">Send</span>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {/* From */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">From</span>
            <p className="text-xs text-white/60 font-mono mt-0.5">{truncateAddress(draft.from)}</p>
          </div>

          {/* To (editable) */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">To</span>
            {editingTo ? (
              <div className="editable-field mt-0.5">
                <input
                  ref={toInputRef}
                  type="text"
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value, toUsername: undefined })}
                  onBlur={handleToBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleToBlur() }}
                  className="w-full bg-transparent text-xs text-white font-mono outline-none"
                />
              </div>
            ) : (
              <div
                className="editable-field mt-0.5 flex items-center justify-between cursor-pointer group"
                onClick={() => setEditingTo(true)}
              >
                <span className="text-xs text-white font-mono">
                  {draft.toUsername || truncateAddress(draft.to)}
                </span>
                <span className="text-white/30 group-hover:text-white/60 transition-colors">
                  <PencilIcon />
                </span>
              </div>
            )}
          </div>

          {/* Amount (editable) */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Amount</span>
            {editingAmount ? (
              <div className="editable-field mt-0.5 flex items-center gap-1">
                <input
                  ref={amountInputRef}
                  type="number"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  onBlur={handleAmountBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAmountBlur() }}
                  step="any"
                  min="0"
                  className="flex-1 bg-transparent text-xs text-white font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-white/40">{draft.token}</span>
              </div>
            ) : (
              <div
                className="editable-field mt-0.5 flex items-center justify-between cursor-pointer group"
                onClick={() => setEditingAmount(true)}
              >
                <span className="text-xs text-white font-mono">
                  {draft.amount} {draft.token}
                </span>
                <span className="text-white/30 group-hover:text-white/60 transition-colors">
                  <PencilIcon />
                </span>
              </div>
            )}
            {draft.amountUsd && (
              <p className="text-[10px] text-white/30 mt-0.5">${draft.amountUsd}</p>
            )}
          </div>

          {/* Network (read-only) */}
          {draft.network && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Network</span>
              <p className="text-xs text-white/60 mt-0.5">{draft.network}</p>
            </div>
          )}

          {/* Gas fee (read-only) */}
          {draft.estimatedGas && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Gas fee</span>
              <p className="text-xs text-white/60 mt-0.5">
                {draft.estimatedGas} ETH
                {draft.estimatedGasUsd && <span className="text-white/30"> (${draft.estimatedGasUsd})</span>}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-white/60 glass-card hover:text-white/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(draft)}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-black shimmer cursor-pointer hover:bg-white/90 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
