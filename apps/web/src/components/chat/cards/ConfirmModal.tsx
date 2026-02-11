'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MiniWarpBg from './MiniWarpBg'

interface ConfirmModalProps {
  title: string
  summary: string
  details: Array<{ label: string; value: string }>
  onConfirm: (password: string) => Promise<void>
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

export default function ConfirmModal({ title, summary, details, onConfirm, onCancel }: ConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CANCEL_SECONDS)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onCancel()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onCancel])

  const handleConfirm = useCallback(async () => {
    if (!password.trim() || status === 'loading') return
    setError(null)
    setStatus('loading')
    try {
      await onConfirm(password)
      setStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Confirmation failed'
      setError(friendlyError(msg))
      setStatus('failed')
    }
  }, [password, status, onConfirm])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const isWarpBoosted = status === 'loading' || status === 'succeeded'
  const contentFading = isWarpBoosted

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="glass-card rounded-2xl p-5 max-w-[380px] w-full relative z-10" style={{ overflow: 'hidden' }}>
        {/* Warp background — accelerates on confirm */}
        <MiniWarpBg boosted={isWarpBoosted} />

        {/* Content — fades when warp engages */}
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
              {details.map((detail, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40">{detail.label}</span>
                  <span className="text-[11px] text-white/70 font-mono">{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/8 my-4" />

          {/* Password input */}
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
              disabled={!password.trim() || status === 'loading'}
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
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
