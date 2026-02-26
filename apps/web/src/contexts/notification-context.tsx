'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useAccount } from '@/contexts/account-context'
import type { NotificationPayload } from '@e-y/shared'

// ---- Types ----

export interface InAppNotification {
  id: string
  title: string
  body: string
  type: string
  data?: Record<string, string | undefined>
  timestamp: number
}

interface NotificationContextValue {
  /** Currently visible notifications (toast stack) */
  notifications: InAppNotification[]
  /** Push a new notification to the toast stack */
  pushNotification: (payload: NotificationPayload) => void
  /** Dismiss a notification by id */
  dismiss: (id: string) => void
  /** Dismiss all notifications */
  dismissAll: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  pushNotification: () => {},
  dismiss: () => {},
  dismissAll: () => {},
})

// ---- Constants ----

const MAX_VISIBLE_TOASTS = 5
const AUTO_DISMISS_MS = 6000

// ---- Provider ----

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const { address } = useAccount()

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach((timer) => clearTimeout(timer))
      timerRefs.current.clear()
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const timer = timerRefs.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timerRefs.current.delete(id)
    }
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications([])
    timerRefs.current.forEach((timer) => clearTimeout(timer))
    timerRefs.current.clear()
  }, [])

  const pushNotification = useCallback(
    (payload: NotificationPayload) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      const notification: InAppNotification = {
        id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: payload.data,
        timestamp: Date.now(),
      }

      setNotifications((prev) => {
        const updated = [notification, ...prev]
        // Keep only the most recent toasts
        return updated.slice(0, MAX_VISIBLE_TOASTS)
      })

      // Auto-dismiss after timeout
      const timer = setTimeout(() => {
        dismiss(id)
      }, AUTO_DISMISS_MS)

      timerRefs.current.set(id, timer)
    },
    [dismiss],
  )

  // Listen for WebSocket notification events from existing socket connections
  // The web app already has socket.io connections for splits, scheduled, blik, etc.
  // We hook into the existing 'notification' event that the server can emit.
  useEffect(() => {
    if (!address) return

    // For MVP, notifications come through existing WebSocket namespaces.
    // The web app handles real-time updates via the split/scheduled/blik sockets.
    // Push notifications are primarily for mobile (when app is in background).
    // On web, we rely on the existing WS events which already update the UI.
    //
    // This context provides a programmatic API for showing toast notifications
    // from any component that receives real-time events.
    //
    // TODO: Add a dedicated /notifications WebSocket namespace if needed.
  }, [address])

  return (
    <NotificationContext.Provider
      value={{ notifications, pushNotification, dismiss, dismissAll }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// ---- Hook ----

export function useNotifications() {
  return useContext(NotificationContext)
}
