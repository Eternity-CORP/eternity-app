'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollReveal } from '@/components/animations/ScrollReveal'

export function CTA() {
  const [email, setEmail] = useState('')
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    <section id="cta" className="relative min-h-[60vh] flex items-center py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
        <ScrollReveal>
          <h2 className="text-heading text-center mb-4">Join the waitlist.</h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-body-lg text-white/50 text-center mb-10">
            Early access. Be first.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="max-w-md mx-auto">
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="text-center p-8 glass-card"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-full bg-white flex items-center justify-center"
                  >
                    <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      />
                    </svg>
                  </motion.div>

                  <h3 className="text-xl font-bold text-white mb-2">You&apos;re In!</h3>
                  <p className="text-sm text-white/50">
                    We&apos;ll notify you when early access is available.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3"
                >
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (status === 'error') setStatus('idle')
                      }}
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-3 rounded-xl outline-none text-white bg-white/5 border border-white/10 focus:border-white/20 transition-colors placeholder:text-white/20"
                    />
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="px-6 py-3 text-sm font-medium bg-white text-black rounded-xl shimmer hover:bg-white/90 transition-colors disabled:opacity-50"
                    >
                      {status === 'loading' ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : (
                        'Get Access'
                      )}
                    </button>
                  </div>

                  {status === 'error' && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm"
                    >
                      {errorMessage}
                    </motion.p>
                  )}

                  <p className="text-xs text-white/20 text-center mt-2">
                    No spam. Just launch updates.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
