'use client'

import { useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface ReceiveCardProps {
  address: string
}

export default function ReceiveCard({ address }: ReceiveCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = address
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [address])

  return (
    <div className="flex justify-start">
      <div className="glass-card rounded-2xl p-4 max-w-[280px] w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M19 12l-7 7-7-7" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Receive</span>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-xl p-3">
            <QRCodeSVG
              value={address}
              size={160}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* Address */}
        <p className="text-[11px] text-white/60 font-mono break-all text-center leading-relaxed mb-3">
          {address}
        </p>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="w-full px-3 py-2 rounded-xl text-xs font-medium glass-card flex items-center justify-center gap-1.5 cursor-pointer hover:border-white/20 transition-colors"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-[#22C55E]">Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span className="text-white/60">Copy address</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
