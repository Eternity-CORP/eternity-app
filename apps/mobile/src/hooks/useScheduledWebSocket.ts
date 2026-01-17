/**
 * Hook for real-time scheduled payment updates via WebSocket
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/src/config/api';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { loadScheduledPaymentsThunk } from '@/src/store/slices/scheduled-slice';
import type { ScheduledPayment } from '@/src/services/scheduled-payment-service';

interface ScheduledWebSocketEvents {
  onCreated?: (payment: ScheduledPayment) => void;
  onUpdated?: (payment: ScheduledPayment) => void;
  onReminder?: (data: { payment: ScheduledPayment; message: string }) => void;
  onExecuted?: (payment: ScheduledPayment) => void;
  onCancelled?: (payment: ScheduledPayment) => void;
  onReceived?: (payment: ScheduledPayment) => void;
  onFailed?: (data: { payment: ScheduledPayment; reason: string }) => void;
}

export function useScheduledWebSocket(events?: ScheduledWebSocketEvents) {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!currentAccount?.address) return;

    const address = currentAccount.address.toLowerCase();

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    const socket = io(`${API_BASE_URL}/scheduled`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[ScheduledWS] Connected');
      // Subscribe to address-specific events
      socket.emit('subscribe', { address });
    });

    socket.on('disconnect', (reason) => {
      console.log('[ScheduledWS] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('[ScheduledWS] Connection error:', error.message);
    });

    // Scheduled payment events
    socket.on('scheduled:created', (payment: ScheduledPayment) => {
      console.log('[ScheduledWS] Payment created:', payment.id);
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onCreated?.(payment);
    });

    socket.on('scheduled:updated', (payment: ScheduledPayment) => {
      console.log('[ScheduledWS] Payment updated:', payment.id);
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onUpdated?.(payment);
    });

    socket.on('scheduled:reminder', (data: { payment: ScheduledPayment; message: string }) => {
      console.log('[ScheduledWS] Payment reminder:', data.payment.id);
      // Don't reload, just notify
      events?.onReminder?.(data);
    });

    socket.on('scheduled:executed', (payment: ScheduledPayment) => {
      console.log('[ScheduledWS] Payment executed:', payment.id);
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onExecuted?.(payment);
    });

    socket.on('scheduled:cancelled', (payment: ScheduledPayment) => {
      console.log('[ScheduledWS] Payment cancelled:', payment.id);
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onCancelled?.(payment);
    });

    socket.on('scheduled:received', (payment: ScheduledPayment) => {
      console.log('[ScheduledWS] Payment received:', payment.id);
      // This is for when you're the recipient of a scheduled payment
      events?.onReceived?.(payment);
    });

    socket.on('scheduled:failed', (data: { payment: ScheduledPayment; reason: string }) => {
      console.log('[ScheduledWS] Payment failed:', data.payment.id, data.reason);
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onFailed?.(data);
    });
  }, [currentAccount?.address, dispatch, events]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Connect on mount and when app comes to foreground
  useEffect(() => {
    connect();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        connect();
      } else if (nextAppState === 'background') {
        disconnect();
      }
    });

    return () => {
      disconnect();
      subscription.remove();
    };
  }, [connect, disconnect]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    reconnect: connect,
    disconnect,
  };
}
