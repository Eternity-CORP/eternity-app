'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import {
  debounce,
  lookupAddressByUsername,
  checkUsernameAvailability,
  registerUsername,
  updateUsername,
  deleteUsername,
  isValidUsernameFormat,
  normalizeUsername,
  createUsernameSignatureMessage,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Navigation from '@/components/Navigation'
import ConfirmModal from '@/components/chat/cards/ConfirmModal'

// --- Types ---

type ModalAction = 'register' | 'update' | 'delete'

// --- Component ---

export default function UsernamePage() {
  const router = useRouter()
  useAuthGuard()
  const { address, currentAccount } = useAccount()

  // Page state
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [pageStatus, setPageStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [formatError, setFormatError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modal state
  const [modalAction, setModalAction] = useState<ModalAction | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Load current username on mount
  useEffect(() => {
    if (!address) return

    let cancelled = false

    async function load() {
      try {
        const username = await lookupAddressByUsername(apiClient, address)
        if (cancelled) return
        setCurrentUsername(username)
        if (username) {
          setInput(username)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setPageStatus('succeeded')
      }
    }

    load()
    return () => { cancelled = true }
  }, [address])

  // Debounced availability check
  const debouncedCheck = useMemo(
    () =>
      debounce(async (username: string) => {
        setIsChecking(true)
        setError(null)
        try {
          const available = await checkUsernameAvailability(apiClient, username)
          setIsAvailable(available)
          if (!available) {
            setError('Username is already taken')
          }
        } catch {
          setIsAvailable(true)
          setError('Could not verify availability. You can still try.')
        } finally {
          setIsChecking(false)
        }
      }, 400),
    [],
  )

  // Handle input change
  const handleInputChange = useCallback(
    (text: string) => {
      const normalized = normalizeUsername(text)
      setInput(normalized)
      setError(null)
      setFormatError(null)
      setIsAvailable(null)
      setSuccessMessage(null)

      if (normalized.length === 0) return

      if (normalized.length >= 3 && !isValidUsernameFormat(normalized)) {
        setFormatError('3-20 chars, letters/numbers/underscore, must start with a letter')
        return
      }

      // If same as current, skip check
      if (currentUsername && normalized === currentUsername) {
        setIsAvailable(true)
        return
      }

      if (normalized.length >= 3 && isValidUsernameFormat(normalized)) {
        debouncedCheck(normalized)
      }
    },
    [currentUsername, debouncedCheck],
  )

  // Submit handler (called after password confirmation)
  const handleConfirmSubmit = useCallback(
    async (password: string) => {
      if (!currentAccount) throw new Error('No account available')

      const mnemonic = await loadAndDecrypt(password)
      const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)
      const timestamp = Date.now()

      if (modalAction === 'register') {
        const message = createUsernameSignatureMessage(input, address, timestamp, 'claim')
        const signature = await wallet.signMessage(message)
        await registerUsername(apiClient, {
          username: normalizeUsername(input),
          address,
          signature,
          timestamp,
        })
        setCurrentUsername(normalizeUsername(input))
        setSuccessMessage(`Your username is now @${normalizeUsername(input)}`)
      } else if (modalAction === 'update') {
        const message = createUsernameSignatureMessage(input, address, timestamp, 'update')
        const signature = await wallet.signMessage(message)
        await updateUsername(apiClient, {
          newUsername: normalizeUsername(input),
          address,
          signature,
          timestamp,
        })
        setCurrentUsername(normalizeUsername(input))
        setSuccessMessage(`Username updated to @${normalizeUsername(input)}`)
      } else if (modalAction === 'delete' && currentUsername) {
        const message = createUsernameSignatureMessage(currentUsername, address, timestamp, 'delete')
        const signature = await wallet.signMessage(message)
        await deleteUsername(apiClient, {
          address,
          signature,
          timestamp,
        })
        setCurrentUsername(null)
        setInput('')
        setSuccessMessage('Username deleted')
      }

      setModalAction(null)
    },
    [modalAction, input, address, currentAccount, currentUsername],
  )

  // Determine which action to perform
  const handleSubmitClick = () => {
    setError(null)
    setSuccessMessage(null)
    if (currentUsername) {
      setModalAction('update')
    } else {
      setModalAction('register')
    }
  }

  const handleDeleteClick = () => {
    setError(null)
    setSuccessMessage(null)
    setModalAction('delete')
  }

  const handleModalCancel = useCallback(() => {
    setModalAction(null)
  }, [])

  // Derived state
  const isNewUsername = !currentUsername || input !== currentUsername
  const canSubmit =
    input.length >= 3 &&
    isValidUsernameFormat(input) &&
    !isChecking &&
    isNewUsername &&
    (isAvailable === true || (currentUsername !== null && input === currentUsername))

  // Build modal props
  const modalProps = modalAction
    ? {
        title:
          modalAction === 'delete'
            ? 'Delete Username'
            : modalAction === 'update'
              ? 'Update Username'
              : 'Claim Username',
        summary:
          modalAction === 'delete'
            ? `Delete @${currentUsername}`
            : modalAction === 'update'
              ? `Change to @${input}`
              : `Claim @${input}`,
        details:
          modalAction === 'delete'
            ? [
                { label: 'Username', value: `@${currentUsername}` },
                { label: 'Address', value: `${address.slice(0, 6)}...${address.slice(-4)}` },
              ]
            : [
                { label: 'Username', value: `@${input}` },
                { label: 'Address', value: `${address.slice(0, 6)}...${address.slice(-4)}` },
                ...(currentUsername ? [{ label: 'Current', value: `@${currentUsername}` }] : []),
              ],
      }
    : null

  // Loading state
  if (pageStatus === 'loading') {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <main className="w-full flex justify-center px-6 pt-12 pb-12">
          <div className="w-full max-w-[420px] flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">Username</h1>

            {/* Info box */}
            <div className="flex items-start gap-3 bg-white/3 border border-white/8 rounded-xl p-4 mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5 text-[#3388FF]">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="8" r="1" fill="currentColor" />
              </svg>
              <p className="text-xs text-white/50 leading-relaxed">
                Your @username allows others to send tokens to you easily without knowing your wallet address.
              </p>
            </div>

            {/* Current username display */}
            {currentUsername && (
              <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-6 text-center">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Current Username</p>
                <p className="text-lg font-semibold text-[#22C55E]">@{currentUsername}</p>
              </div>
            )}

            {/* Input */}
            <div className="mb-6">
              <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">
                {currentUsername ? 'New Username' : 'Choose Username'}
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#3388FF]/40 transition-colors">
                <span className="text-white/30 text-lg font-medium mr-1">@</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="username"
                  maxLength={20}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent text-lg font-medium text-white placeholder:text-white/20 focus:outline-none"
                />
                {/* Status indicator */}
                {isChecking && (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                )}
                {!isChecking && isAvailable === true && isNewUsername && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-[#22C55E]">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {!isChecking && isAvailable === false && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-[#EF4444]">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* Hint */}
              <p className="text-[11px] text-white/25 mt-2">
                3-20 characters, letters, numbers, and underscores. Must start with a letter.
              </p>

              {/* Format error */}
              {formatError && (
                <p className="text-xs text-[#EF4444] mt-2">{formatError}</p>
              )}

              {/* API error */}
              {error && (
                <p className="text-xs text-[#EF4444] mt-2">{error}</p>
              )}
            </div>

            {/* Success message */}
            {successMessage && (
              <div className="px-4 py-3 bg-[#22C55E]/5 border border-[#22C55E]/15 rounded-xl mb-4">
                <p className="text-[#22C55E] text-sm text-center">{successMessage}</p>
              </div>
            )}

            {/* Claim / Update button */}
            <button
              onClick={handleSubmitClick}
              disabled={!canSubmit}
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {currentUsername ? 'Update Username' : 'Claim Username'}
            </button>

            {/* Delete button */}
            {currentUsername && (
              <button
                onClick={handleDeleteClick}
                className="w-full mt-3 py-3.5 rounded-xl font-medium text-sm transition-all border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/5 hover:border-[#EF4444]/50 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#EF4444]">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete Username
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Password confirmation modal */}
      {modalAction && modalProps && (
        <ConfirmModal
          title={modalProps.title}
          summary={modalProps.summary}
          details={modalProps.details}
          onConfirm={handleConfirmSubmit}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  )
}
