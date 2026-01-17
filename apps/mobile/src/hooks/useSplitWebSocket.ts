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
import type { SplitBill } from '@/src/services/split-bill-service';

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

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    const socket = io(`${API_BASE_URL}/splits`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SplitWS] Connected');
      // Subscribe to address-specific events
      socket.emit('subscribe', { address });
    });

    socket.on('disconnect', (reason) => {
      console.log('[SplitWS] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('[SplitWS] Connection error:', error.message);
    });

    // Split bill events
    socket.on('split:created', (bill: SplitBill) => {
      console.log('[SplitWS] Split created:', bill.id);
      dispatch(loadSplitBillsThunk(address));
      events?.onCreated?.(bill);
    });

    socket.on('split:updated', (bill: SplitBill) => {
      console.log('[SplitWS] Split updated:', bill.id);
      dispatch(loadSplitBillsThunk(address));
      events?.onUpdated?.(bill);
    });

    socket.on('split:paid', (data: { bill: SplitBill; paidAddress: string }) => {
      console.log('[SplitWS] Participant paid:', data.paidAddress);
      dispatch(loadSplitBillsThunk(address));
      events?.onPaid?.(data);
    });

    socket.on('split:completed', (bill: SplitBill) => {
      console.log('[SplitWS] Split completed:', bill.id);
      dispatch(loadSplitBillsThunk(address));
      events?.onCompleted?.(bill);
    });

    socket.on('split:cancelled', (bill: SplitBill) => {
      console.log('[SplitWS] Split cancelled:', bill.id);
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
