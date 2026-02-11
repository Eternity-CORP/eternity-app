'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void
  lang?: string
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  start: () => void
  stop: () => void
}

export function useSpeechRecognition({
  onResult,
  lang = 'ru-RU',
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onResultRef = useRef(onResult)
  const lastTranscriptRef = useRef('')
  const hasSentRef = useRef(false)

  onResultRef.current = onResult

  // iOS WebKit supports the API but continuous mode doesn't work —
  // use continuous: false there so recognition auto-stops after a pause
  const isIOS = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)

  // Safari exposes webkitSpeechRecognition but it doesn't work reliably
  const isSafari = typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) &&
    !isSafari

  const stop = useCallback(() => {
    const pending = lastTranscriptRef.current.trim()
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setIsListening(false)
    setTranscript('')
    // Send pending transcript if we haven't sent yet
    if (!hasSentRef.current && pending) {
      hasSentRef.current = true
      onResultRef.current(pending)
    }
    lastTranscriptRef.current = ''
  }, [])

  const start = useCallback(() => {
    if (!isSupported) return

    // Stop any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = lang
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    // iOS WebKit doesn't support continuous mode — recognition hangs.
    // Use continuous: false on iOS so it auto-stops after a pause.
    recognition.continuous = !isIOS

    // Reset refs for new session
    lastTranscriptRef.current = ''
    hasSentRef.current = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      try {
        let fullText = ''
        let allFinal = true

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result && result[0]) {
            fullText += result[0].transcript
          }
          if (!result.isFinal) {
            allFinal = false
          }
        }

        lastTranscriptRef.current = fullText
        setTranscript(fullText)

        // On iOS (continuous: false), auto-send when final result arrives
        if (allFinal && fullText.trim()) {
          hasSentRef.current = true
          setTranscript('')
          setIsListening(false)
          recognitionRef.current = null
          onResultRef.current(fullText.trim())
        }
      } catch {
        // Defensive — don't crash on unexpected event shape
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are expected — not real errors
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setIsListening(false)
      setTranscript('')
      lastTranscriptRef.current = ''
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // Send any pending transcript that wasn't sent yet
      const pending = lastTranscriptRef.current.trim()
      if (!hasSentRef.current && pending) {
        hasSentRef.current = true
        onResultRef.current(pending)
      }
      setIsListening(false)
      setTranscript('')
      lastTranscriptRef.current = ''
      hasSentRef.current = false
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    setTranscript('')
    setIsListening(true)

    try {
      recognition.start()
    } catch {
      setIsListening(false)
      recognitionRef.current = null
    }
  }, [isSupported, isIOS, lang])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  return { isListening, isSupported, transcript, start, stop }
}
