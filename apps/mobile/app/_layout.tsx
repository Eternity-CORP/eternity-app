// Import polyfill for crypto.getRandomValues in React Native (must be first)
import 'react-native-get-random-values';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { store } from '@/src/store';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { loadWalletThunk, loadAccountsThunk } from '@/src/store/slices/wallet-slice';
import { hasWallet } from '@/src/services/wallet-service';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

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
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);

  useEffect(() => {
    async function checkWallet() {
      try {
        const hasWalletData = await hasWallet();
        if (hasWalletData) {
          const walletResult = await dispatch(loadWalletThunk());
          // Load accounts after wallet is loaded
          if (walletResult.type === 'wallet/load/fulfilled') {
            await dispatch(loadAccountsThunk());
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
    const hasWalletData = wallet.isInitialized;

    if (!hasWalletData && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
    } else if (hasWalletData && inOnboarding) {
      router.replace('/(tabs)/home');
    }
  }, [isCheckingWallet, wallet.isInitialized, segments, router]);

  if (isCheckingWallet) {
    return null; // Show splash screen while checking
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="send" options={{ headerShown: false }} />
        <Stack.Screen name="blik" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
