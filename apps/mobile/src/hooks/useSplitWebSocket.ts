/**
 * Hook for real-time split bill updates via WebSocket
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/src/config/api';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { loadSplitBillsThunk } from '@/src/store/slices/split-slice';
import { createLogger } from '@/src/utils/logger';
import type { SplitBill } from '@/src/services/split-bill-service';

const log = createLogger('SplitWebSocket');

interface SplitWebSocketEvents {
  onCreated?: (bill: SplitBill) => void;
  onUpdated?: (bill: SplitBill) => void;
  onPaid?: (data: { bill: SplitBill; paidAddress: string }) => void;
  onCompleted?: (bill: SplitBill) => void;
  onCancelled?: (bill: SplitBill) => void;
}

export function useSplitWebSocket(events?: SplitWebSocketEvents) {
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

    const socket = io(`${API_BASE_URL}/splits`, {
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

    socket.on('split:created', (bill: SplitBill) => {
      log.debug('Split created', { id: bill.id });
      dispatch(loadSplitBillsThunk(address));
      events?.onCreated?.(bill);
    });

    socket.on('split:updated', (bill: SplitBill) => {
      log.debug('Split updated', { id: bill.id });
      dispatch(loadSplitBillsThunk(address));
      events?.onUpdated?.(bill);
    });

    socket.on('split:paid', (data: { bill: SplitBill; paidAddress: string }) => {
      log.debug('Participant paid', { address: data.paidAddress });
      dispatch(loadSplitBillsThunk(address));
      events?.onPaid?.(data);
    });

    socket.on('split:completed', (bill: SplitBill) => {
      log.debug('Split completed', { id: bill.id });
      dispatch(loadSplitBillsThunk(address));
      events?.onCompleted?.(bill);
    });

    socket.on('split:cancelled', (bill: SplitBill) => {
      log.debug('Split cancelled', { id: bill.id });
      dispatch(loadSplitBillsThunk(address));
      events?.onCancelled?.(bill);
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
