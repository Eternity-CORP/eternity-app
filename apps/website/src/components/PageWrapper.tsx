'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface PageWrapperProps {
  children: React.ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <>
      <LoadingScreen
        duration={2500}
        onComplete={() => setIsLoaded(true)}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {children}
      </motion.div>
    </>
  )
}
