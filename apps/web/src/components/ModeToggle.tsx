'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface ModeToggleProps {
  value: 'ai' | 'classic'
  onChange: (mode: 'ai' | 'classic') => void
}

export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const aiRef = useRef<HTMLButtonElement>(null)
  const classicRef = useRef<HTMLButtonElement>(null)
  const [slider, setSlider] = useState({ left: 0, width: 0 })

  const updateSlider = useCallback(() => {
    const activeRef = value === 'ai' ? aiRef : classicRef
    const btn = activeRef.current
    const container = containerRef.current
    if (!btn || !container) return

    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()

    setSlider({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    })
  }, [value])

  useEffect(() => {
    updateSlider()
  }, [updateSlider])

  return (
    <div ref={containerRef} className="mode-toggle">
      <div
        className="mode-toggle-slider"
        style={{ left: slider.left, width: slider.width }}
      />
      <button
        ref={aiRef}
        onClick={() => onChange('ai')}
        className={`mode-toggle-option ${value === 'ai' ? 'active' : ''}`}
      >
        AI
      </button>
      <button
        ref={classicRef}
        onClick={() => onChange('classic')}
        className={`mode-toggle-option ${value === 'classic' ? 'active' : ''}`}
      >
        Classic
      </button>
    </div>
  )
}
