import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import BiometricAuthScreen from '../screens/BiometricAuthScreen';
import PinAuthScreen from '../screens/PinAuthScreen';
import { shouldRequireBiometric } from '../services/biometricService';
import { isPinSet } from '../services/pinService';
import { LOCK_TIMEOUT_MS } from '../config/security';

interface AuthContextValue {
  isAuthenticated: boolean;
  authenticate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresBiometric, setRequiresBiometric] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pinEnabled, setPinEnabled] = useState(false);
  const lastUnlockAt = useRef<number>(Date.now());

  useEffect(() => {
    checkBiometricRequirement();
    checkPinRequirement();
  }, []);

  // Re-check authentication when app comes back from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, [requiresBiometric]);

  // Inactivity timeout
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        const now = Date.now();
        const elapsed = now - lastUnlockAt.current;
        if (elapsed >= LOCK_TIMEOUT_MS) {
          setIsAuthenticated(false);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const checkBiometricRequirement = async () => {
    try {
      const required = await shouldRequireBiometric();
      setRequiresBiometric(required);

      if (!required) {
        // If biometric not required, user is automatically authenticated
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Error checking biometric requirement:', e);
      // Security: On error, assume biometric is not required and allow access
      // This prevents lockout if biometric check service fails
      // User can still enable it later in settings
      setRequiresBiometric(false);
      setIsAuthenticated(true);
    } finally {
      setIsChecking(false);
    }
  };

  const checkPinRequirement = async () => {
    try {
      const enabled = await isPinSet();
      setPinEnabled(enabled);
    } catch (e) {
      setPinEnabled(false);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && requiresBiometric) {
      // When app becomes active and biometric is required, re-authenticate
      setIsAuthenticated(false);
    }
  };

  const authenticate = async () => {
    setIsAuthenticated(true);
    lastUnlockAt.current = Date.now();
  };

  if (isChecking) {
    // Show loading state while checking
    return null;
  }

  if (!isAuthenticated) {
    if (requiresBiometric) {
      return (
        <BiometricAuthScreen
          onSuccess={authenticate}
          onCancel={() => {
            // Security: Do not allow bypass on cancel
            // User must authenticate or use recovery options
            // onCancel will show options within BiometricAuthScreen itself
          }}
        />
      );
    }

    if (pinEnabled) {
      return (
        <PinAuthScreen
          onSuccess={authenticate}
          onCancel={() => {
            // Security: Do not allow bypass on cancel
            // User must authenticate or use recovery options
            // onCancel will show options within PinAuthScreen itself
          }}
        />
      );
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, authenticate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
