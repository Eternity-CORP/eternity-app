'use client'

import { motion } from 'framer-motion'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { LoadingProvider, useLoading } from '@/context/LoadingContext'

interface PageWrapperProps {
  children: React.ReactNode
}

function PageContent({ children }: PageWrapperProps) {
  const { isLoaded, setIsLoaded } = useLoading()

  return (
    <>
      <LoadingScreen
        duration={3500}
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

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <LoadingProvider>
      <PageContent>{children}</PageContent>
    </LoadingProvider>
  )
}
