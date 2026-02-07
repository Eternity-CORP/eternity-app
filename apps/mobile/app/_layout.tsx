// Import polyfill for crypto.getRandomValues in React Native (must be first)
import 'react-native-get-random-values';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';

import { NotificationProvider } from '@/src/components/NotificationProvider';
import { MigrationModal } from '@/src/components/MigrationModal';
import { AppThemeProvider, useTheme } from '@/src/contexts';
import { store } from '@/src/store';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { loadWalletThunk, loadAccountsThunk } from '@/src/store/slices/wallet-slice';
import { clearLegacyContactsThunk } from '@/src/store/slices/contacts-slice';
import { hasWallet } from '@/src/services/wallet-service';
import { initErrorTracking, setUserContext } from '@/src/services/error-tracking-service';
import {
  hasMigrationModalBeenShown,
  markMigrationModalAsShown,
} from '@/src/services/migration-service';

// Initialize Sentry at app startup
initErrorTracking();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Create navigation theme from app theme
function createNavigationTheme(appTheme: ReturnType<typeof useTheme>['theme']) {
  return {
    dark: appTheme.isDark,
    colors: {
      primary: appTheme.colors.accent,
      background: appTheme.colors.background,
      card: appTheme.colors.surface,
      text: appTheme.colors.textPrimary,
      border: appTheme.colors.border,
      notification: appTheme.colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '800' as const },
    },
  };
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AppThemeProvider>
          <RootLayoutNav />
        </AppThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const { theme, isDark } = useTheme();
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Create navigation theme from current app theme
  const navigationTheme = createNavigationTheme(theme);

  useEffect(() => {
    async function checkWallet() {
      try {
        // Clear legacy global contacts on startup (one-time migration)
        await dispatch(clearLegacyContactsThunk());

        const hasWalletData = await hasWallet();
        if (hasWalletData) {
          const walletResult = await dispatch(loadWalletThunk());
          // Load accounts after wallet is loaded
          if (walletResult.type === 'wallet/load/fulfilled') {
            await dispatch(loadAccountsThunk());
            // Set user context for error tracking
            const loadedWallet = walletResult.payload as { address: string };
            if (loadedWallet?.address) {
              setUserContext(loadedWallet.address);
            }

            // Check if we need to show migration modal (existing users only)
            const migrationShown = await hasMigrationModalBeenShown();
            if (!migrationShown) {
              setShowMigrationModal(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      } finally {
        setIsCheckingWallet(false);
      }
    }
    checkWallet();
  }, [dispatch]);

  useEffect(() => {
    if (isCheckingWallet) return;

    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';
    const hasWalletData = wallet.isInitialized;

    if (!hasWalletData && !inOnboarding) {
      // No wallet - go to onboarding
      router.replace('/(onboarding)/welcome');
    } else if (hasWalletData && inOnboarding) {
      // Has wallet but in onboarding - go to AI (default tab)
      router.replace('/(tabs)/ai');
    } else if (hasWalletData && !inTabs && !inOnboarding && !segments[0]) {
      // Has wallet but on unknown/root route - go to AI (default tab)
      router.replace('/(tabs)/ai');
    }
  }, [isCheckingWallet, wallet.isInitialized, segments, router]);

  if (isCheckingWallet) {
    return null; // Show splash screen while checking
  }

  const handleMigrationDismiss = async () => {
    await markMigrationModalAsShown();
    setShowMigrationModal(false);
  };

  return (
    <NotificationProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <MigrationModal
          visible={showMigrationModal}
          onDismiss={handleMigrationDismiss}
        />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="send" options={{ headerShown: false }} />
          <Stack.Screen name="receive" options={{ headerShown: false }} />
          <Stack.Screen name="blik" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="transaction" options={{ headerShown: false }} />
          <Stack.Screen name="token" options={{ headerShown: false }} />
          <Stack.Screen name="scheduled" options={{ headerShown: false }} />
          <Stack.Screen name="split" options={{ headerShown: false }} />
          <Stack.Screen name="swap" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </NotificationProvider>
  );
}
