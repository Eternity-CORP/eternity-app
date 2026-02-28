'use client'

import type { BridgeStatusResult } from '@e-y/shared'

type BridgeStep = 'approval' | 'sending' | 'bridging' | 'complete' | 'failed'

interface BridgeProgressProps {
  currentStep: string
  bridgeStatus: BridgeStatusResult | null
  txHash: string | null
  fromNetworkName: string
  toNetworkName: string
  onRetry?: () => void
  onDone?: () => void
}

const STEP_ORDER: BridgeStep[] = ['approval', 'sending', 'bridging', 'complete']

function getActiveStep(currentStep: string, bridgeStatus: BridgeStatusResult | null): BridgeStep {
  if (bridgeStatus?.status === 'DONE') return 'complete'
  if (bridgeStatus?.status === 'FAILED') return 'failed'
  if (currentStep.includes('allowance') || currentStep.includes('Approving')) return 'approval'
  if (currentStep.includes('Sending') || currentStep.includes('bridge transaction')) return 'sending'
  if (currentStep.includes('Waiting') || currentStep.includes('completion')) return 'bridging'
  return 'sending'
}

export default function BridgeProgress({
  currentStep,
  bridgeStatus,
  txHash,
  fromNetworkName,
  toNetworkName,
  onRetry,
  onDone,
}: BridgeProgressProps) {
  const activeStep = getActiveStep(currentStep, bridgeStatus)
  const isFailed = activeStep === 'failed'
  const isComplete = activeStep === 'complete'

  const steps = [
    { id: 'approval' as const, label: 'Token Approval' },
    { id: 'sending' as const, label: 'Send Transaction' },
    { id: 'bridging' as const, label: `Bridging to ${toNetworkName}` },
    { id: 'complete' as const, label: 'Complete' },
  ]

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Bridge Progress</h3>

      {/* Step indicators */}
      <div className="space-y-3 mb-4">
        {steps.map((step, index) => {
          const stepIndex = STEP_ORDER.indexOf(step.id)
          const activeIndex = STEP_ORDER.indexOf(activeStep === 'failed' ? 'bridging' : activeStep)
          const isDone = stepIndex < activeIndex || isComplete
          const isCurrent = stepIndex === activeIndex && !isComplete
          const isPending = stepIndex > activeIndex

          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Circle */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isDone
                  ? 'bg-[#22c55e] text-[var(--foreground)]'
                  : isCurrent
                    ? isFailed
                      ? 'bg-[#EF4444]/20 border-2 border-[#EF4444] text-[#EF4444]'
                      : 'bg-[#3388FF]/20 border-2 border-[#3388FF] text-[#3388FF] animate-pulse'
                    : 'bg-[var(--surface)] text-[var(--foreground-subtle)]'
              }`}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isCurrent && isFailed ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Label */}
              <span className={`text-sm ${
                isDone ? 'text-[var(--foreground-muted)]' : isCurrent ? 'text-[var(--foreground)] font-medium' : 'text-[var(--foreground-subtle)]'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Status Message */}
      {currentStep && !isComplete && !isFailed && (
        <p className="text-xs text-[var(--foreground-subtle)] mb-3">{currentStep}</p>
      )}

      {/* TX Hash */}
      {txHash && (
        <p className="text-xs text-[var(--foreground-subtle)] font-mono truncate mb-3">
          TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
        </p>
      )}

      {/* Failed */}
      {isFailed && (
        <div className="bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-lg p-3 mb-3">
          <p className="text-xs text-[#f87171]">{bridgeStatus?.message || 'Bridge failed'}</p>
        </div>
      )}

      {/* Actions */}
      {(isComplete || isFailed) && (
        <div className="flex gap-2">
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-2.5 rounded-xl glass-card text-[var(--foreground-muted)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
            >
              Retry
            </button>
          )}
          {(isComplete || isFailed) && onDone && (
            <button
              onClick={onDone}
              className="flex-1 py-2.5 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold shimmer hover:opacity-90 transition-all"
            >
              {isComplete ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
