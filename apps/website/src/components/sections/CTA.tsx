'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'
import { Button } from '@/components/ui/Button'

export function CTA() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isBetaTester, setIsBetaTester] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setStatus('error')
      setErrorMessage('Please enter a valid email')
      return
    }

    setStatus('loading')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message, isBetaTester }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <section
      id="cta"
      className="relative min-h-screen flex items-center py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background-secondary)' }}
    >
      {/* Background dots */}
      <div className="absolute inset-0 bg-dots opacity-50" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            Join Us
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            <GlitchText
              delay={0.3}
              glitchIntensity="medium"
              style={{ color: 'var(--foreground)' }}
            >
              Ready to Try the Future?
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-12" style={{ color: 'var(--foreground-muted)' }}>
            Join the waitlist for early access
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="max-w-md mx-auto">
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="text-center p-8 rounded-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                >
                  {/* Animated checkmark */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--foreground)' }}
                  >
                    <motion.svg
                      className="w-10 h-10"
                      style={{ color: 'var(--background)' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      />
                    </motion.svg>
                  </motion.div>

                  {/* Animated text */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
                      Welcome to the Future!
                    </h3>
                    <p className="mb-4" style={{ color: 'var(--foreground-muted)' }}>
                      You've secured your spot on the waitlist.
                    </p>
                  </motion.div>

                  {/* Animated notification message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center gap-3 justify-center mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--accent-blue)' }}
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Coming Soon</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      We'll notify you when early access is available. <br />
                      <span className="font-medium" style={{ color: 'var(--foreground)' }}>Be the first to experience Eternity.</span>
                    </p>
                  </motion.div>

                  {/* Animated particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{ background: 'var(--foreground)', opacity: 0.2 }}
                        initial={{
                          x: '50%',
                          y: '50%',
                          scale: 0,
                        }}
                        animate={{
                          x: `${50 + (Math.random() - 0.5) * 100}%`,
                          y: `${50 + (Math.random() - 0.5) * 100}%`,
                          scale: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: 0.2 + i * 0.05,
                          ease: 'easeOut',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="p-8 rounded-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
                >
                  <div className="mb-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (status === 'error') setStatus('idle')
                      }}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 rounded-xl outline-none transition-colors"
                      style={{
                        background: 'var(--input-bg)',
                        border: status === 'error' ? '1px solid #EF4444' : '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                    {status === 'error' && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-2"
                      >
                        {errorMessage}
                      </motion.p>
                    )}
                  </div>

                  <div className="mb-4">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Any feedback or suggestions? (optional)"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>

                  <label className="flex items-center gap-3 mb-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBetaTester}
                      onChange={(e) => setIsBetaTester(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{
                        background: isBetaTester ? 'var(--foreground)' : 'transparent',
                        border: isBetaTester ? 'none' : '1px solid var(--border)'
                      }}
                    >
                      {isBetaTester && (
                        <svg
                          className="w-3 h-3"
                          style={{ color: 'var(--background)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      I want to be a beta tester
                    </span>
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      'Get Early Access'
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

          </div>
        </FadeIn>

        {/* Tagline */}
        <FadeIn delay={0.6}>
          <p className="text-center mt-12" style={{ color: 'var(--foreground-muted)' }}>
            "The wallet that finally makes sense"
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
