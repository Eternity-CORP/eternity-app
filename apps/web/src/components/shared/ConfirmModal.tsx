'use client'

import type { ReactNode, KeyboardEvent, MouseEvent } from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import MiniWarpBg from '../chat/cards/MiniWarpBg'

export interface ConfirmDetail {
  key?: string
  label: string
  value: string
  editable?: boolean
  type?: 'text' | 'number'
}

interface ConfirmModalProps {
  title: string
  summary: string
  details: ConfirmDetail[]
  extraContent?: ReactNode
  requiresPassword?: boolean
  confirmLabel?: string
  onConfirm: (password: string, editedValues?: Record<string, string>) => Promise<void>
  onCancel: () => void
}

const AUTO_CANCEL_SECONDS = 60

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('insufficient_funds') || lower.includes('insufficient funds'))
    return 'Insufficient funds to cover gas fees. Top up your balance and try again.'
  if (lower.includes('nonce') && lower.includes('too low'))
    return 'Transaction conflict. Please try again.'
  if (lower.includes('user rejected') || lower.includes('user denied'))
    return 'Transaction was cancelled.'
  if (lower.includes('wrong password') || lower.includes('invalid password') || lower.includes('incorrect password'))
    return 'Wrong password. Please try again.'
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Network timeout. Check your connection and try again.'
  if (lower.includes('network') && lower.includes('error'))
    return 'Network error. Check your connection.'
  if (raw.length > 120)
    return raw.slice(0, raw.indexOf('(') > 0 ? raw.indexOf('(') : 100).trim()
  return raw
}

export default function ConfirmModal({
  title,
  summary,
  details,
  extraContent,
  requiresPassword = true,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CANCEL_SECONDS)
  const [editedValues, setEditedValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const d of details) {
      if (d.editable && d.key) {
        initial[d.key] = d.value
      }
    }
    return initial
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const firstEditableRef = useRef<HTMLInputElement>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (requiresPassword) {
      inputRef.current?.focus()
    } else {
      firstEditableRef.current?.focus()
    }
  }, [requiresPassword])

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onCancelRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (requiresPassword && !password.trim()) return
    if (status === 'loading') return
    setError(null)
    setStatus('loading')
    try {
      const hasEdited = Object.keys(editedValues).length > 0
      await onConfirm(password, hasEdited ? editedValues : undefined)
      setStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Confirmation failed'
      setError(friendlyError(msg))
      setStatus('failed')
    }
  }, [password, status, onConfirm, requiresPassword, editedValues])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const handleEditChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
  }

  const isWarpBoosted = status === 'loading' || status === 'succeeded'
  const contentFading = isWarpBoosted

  const canConfirm = requiresPassword ? !!password.trim() : true

  const firstEditableIdx = details.findIndex((d) => d.editable && d.key)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="glass-card rounded-2xl p-5 max-w-[380px] w-full relative z-10" style={{ overflow: 'hidden' }}>
        {/* Warp background */}
        <MiniWarpBg boosted={isWarpBoosted} />

        {/* Content */}
        <div
          className="relative z-[1] transition-opacity duration-700"
          style={{ opacity: contentFading ? 0.15 : 1 }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="Eternity" className="w-10 h-10" />
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-white mb-1 text-center">{title}</h3>

          {/* Summary */}
          <p className="text-lg font-bold text-white mb-4">{summary}</p>

          {/* Details */}
          {details.length > 0 && (
            <div className="space-y-2 mb-4">
              {details.map((detail, i) => {
                if (detail.editable && detail.key) {
                  const refProp = i === firstEditableIdx ? { ref: firstEditableRef } : {}
                  return (
                    <div key={i}>
                      <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">
                        {detail.label}
                      </label>
                      <input
                        {...refProp}
                        type={detail.type || 'text'}
                        value={editedValues[detail.key] ?? detail.value}
                        onChange={(e) => handleEditChange(detail.key!, e.target.value)}
                        onKeyDown={handleKeyDown}
                        step={detail.type === 'number' ? 'any' : undefined}
                        min={detail.type === 'number' ? '0' : undefined}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 outline-none focus:border-[#3388FF]/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  )
                }
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40">{detail.label}</span>
                    <span className="text-[11px] text-white/70 font-mono">{detail.value}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Extra content (e.g. participant list) */}
          {extraContent}

          {/* Divider */}
          {requiresPassword && <div className="border-t border-white/8 my-4" />}

          {/* Password input */}
          {requiresPassword && (
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">
                Password
              </label>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#3388FF]/40 transition-colors"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-[#EF4444] mb-3">{error}</p>
          )}

          {/* Auto-cancel timer */}
          <p className="text-[10px] text-white/20 text-center mb-3">
            Auto-cancels in {secondsLeft}s
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={status === 'loading'}
              className="flex-1 px-3 py-2.5 rounded-xl text-xs font-medium text-white/60 glass-card hover:text-white/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || status === 'loading'}
              className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white text-black shimmer cursor-pointer hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.2)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="black" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Confirming...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
