/**
 * Lock Screen Component
 * Displays when app requires authentication
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts';
import {
  authenticate,
  getBiometricStatus,
  getBiometricTypeName,
  type BiometricType,
} from '@/src/services/biometric-service';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { theme } = useTheme();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');

  useEffect(() => {
    // Get biometric type for icon
    getBiometricStatus().then((status) => {
      setBiometricType(status.biometricType);
    });

    // Auto-trigger authentication on mount
    handleAuthenticate();
  }, []);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError(null);

    const result = await authenticate('Войдите в E-Y');

    setIsAuthenticating(false);

    if (result.success) {
      onUnlock();
    } else {
      setError(result.error || 'Ошибка аутентификации');
    }
  };

  const getIcon = () => {
    switch (biometricType) {
      case 'facial':
        return 'smile-o'; // Face ID
      case 'fingerprint':
        return 'hand-pointer-o'; // Touch ID
      default:
        return 'lock';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={[styles.logoContainer, { backgroundColor: theme.colors.accent }]}>
          <Text style={[styles.logoText, { color: theme.colors.background }]}>E-Y</Text>
        </View>

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Добро пожаловать
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Подтвердите вход для доступа к кошельку
        </Text>

        {/* Error message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Authenticate button */}
        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: theme.colors.accent }]}
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <>
              <FontAwesome
                name={getIcon()}
                size={24}
                color={theme.colors.background}
                style={styles.authIcon}
              />
              <Text style={[styles.authButtonText, { color: theme.colors.background }]}>
                {biometricType !== 'none'
                  ? `Войти с ${getBiometricTypeName(biometricType)}`
                  : 'Разблокировать'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  authIcon: {
    marginRight: 12,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
