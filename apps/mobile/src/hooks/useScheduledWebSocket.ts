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
import { createLogger } from '@/src/utils/logger';
import type { ScheduledPayment } from '@/src/services/scheduled-payment-service';

const log = createLogger('ScheduledWebSocket');

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

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(`${API_BASE_URL}/scheduled`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      log.info('Connected');
      socket.emit('subscribe', { address });
    });

    socket.on('disconnect', (reason) => {
      log.debug('Disconnected', { reason });
    });

    socket.on('connect_error', (error) => {
      log.warn('Connection error', { message: error.message });
    });

    socket.on('scheduled:created', (payment: ScheduledPayment) => {
      log.debug('Payment created', { id: payment.id });
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onCreated?.(payment);
    });

    socket.on('scheduled:updated', (payment: ScheduledPayment) => {
      log.debug('Payment updated', { id: payment.id });
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onUpdated?.(payment);
    });

    socket.on('scheduled:reminder', (data: { payment: ScheduledPayment; message: string }) => {
      log.debug('Payment reminder', { id: data.payment.id });
      events?.onReminder?.(data);
    });

    socket.on('scheduled:executed', (payment: ScheduledPayment) => {
      log.debug('Payment executed', { id: payment.id });
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onExecuted?.(payment);
    });

    socket.on('scheduled:cancelled', (payment: ScheduledPayment) => {
      log.debug('Payment cancelled', { id: payment.id });
      dispatch(loadScheduledPaymentsThunk(address));
      events?.onCancelled?.(payment);
    });

    socket.on('scheduled:received', (payment: ScheduledPayment) => {
      log.debug('Payment received', { id: payment.id });
      events?.onReceived?.(payment);
    });

    socket.on('scheduled:failed', (data: { payment: ScheduledPayment; reason: string }) => {
      log.warn('Payment failed', { id: data.payment.id, reason: data.reason });
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
