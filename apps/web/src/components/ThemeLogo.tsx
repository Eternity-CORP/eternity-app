'use client'

interface ThemeLogoProps {
  className?: string
}

export default function ThemeLogo({ className = 'w-20 h-20' }: ThemeLogoProps) {
  return (
    <>
      <img src="/logo-black.svg" alt="Eternity" className={`${className} block dark:hidden`} />
      <img src="/logo-white.svg" alt="Eternity" className={`${className} hidden dark:block`} />
    </>
  )
}
