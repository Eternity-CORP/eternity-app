import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { isWalletExists } from '../services/cryptoService';
import { WalletProvider } from '../context/WalletContext';
import { setupNotificationListeners, setNotificationNavigationRef } from '../services/notificationHandlers';

const prefix = Linking.createURL('/');

export default function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigationRef = useRef<any>(null);

  const checkWalletStatus = async () => {
    const exists = await isWalletExists();
    setIsAuthenticated(Boolean(exists));
    setIsChecking(false);
  };

  useEffect(() => {
    checkWalletStatus();
  }, []);

  // Check wallet status when navigation state changes
  // This allows automatic switch from Auth to Main after wallet creation
  const onNavigationStateChange = () => {
    checkWalletStatus();
  };

  // Poll wallet status more frequently when in Auth navigator
  // This ensures we detect wallet creation immediately
  useEffect(() => {
    if (isAuthenticated) return; // No need to poll if already authenticated

    const interval = setInterval(async () => {
      const exists = await isWalletExists();
      if (exists && !isAuthenticated) {
        setIsAuthenticated(true);
      }
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Setup notification listeners
  useEffect(() => {
    // Set navigation reference for notification handlers
    setNotificationNavigationRef(navigationRef.current);

    // Setup notification click listeners
    const unsubscribe = setupNotificationListeners();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const linking = {
    prefixes: [prefix, 'eternitywallet://'],
    config: {
      screens: {
        Home: 'home',
        PaySplitBill: {
          path: 'pay-split-bill',
          parse: {
            to: (to: string) => to,
            amount: (amount: string) => amount,
            total: (total: string) => total,
            participants: (participants: string) => participants,
          },
        },
        PendingPayments: 'pending-payments',
        SplitBill: 'split-bill',
        SplitBillHistory: 'split-bill-history',
      },
    },
  };

  if (isChecking) {
    // Show nothing while checking wallet status
    // NavigationContainer will handle loading state
    return null;
  }

  return (
    <WalletProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        fallback={null}
        onStateChange={onNavigationStateChange}
      >
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </WalletProvider>
  );
}
