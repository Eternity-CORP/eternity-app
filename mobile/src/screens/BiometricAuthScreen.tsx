import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { setBiometricEnabled } from '../services/biometricService';

interface BiometricAuthScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function BiometricAuthScreen({ onSuccess, onCancel }: BiometricAuthScreenProps) {
  const [loading, setLoading] = useState(true);
  const [biometricType, setBiometricType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!compatible) {
        setError('Biometric authentication is not supported on this device');
        setIsSupported(false);
        setLoading(false);
        return;
      }

      if (!enrolled) {
        setError('No biometric credentials enrolled. Please set up biometrics in your device settings.');
        setIsSupported(false);
        setLoading(false);
        return;
      }

      // Get biometric type
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      } else {
        setBiometricType('Biometric');
      }

      setIsSupported(true);
      setLoading(false);

      // Auto-trigger authentication
      await handleAuthenticate();
    } catch (e: any) {
      console.error('Biometric check error:', e);
      setError('Failed to check biometric support');
      setIsSupported(false);
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setError(null);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your wallet',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow PIN/password fallback
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        onSuccess();
      } else {
        if (result.error === 'user_cancel') {
          setError('Authentication cancelled');
        } else if (result.error === 'lockout') {
          setError('Too many failed attempts. Please try again later.');
        } else {
          setError('Authentication failed. Please try again.');
        }
      }
    } catch (e: any) {
      console.error('Authentication error:', e);
      setError('Authentication failed. Please try again.');
    }
  };

  const handleDisableBiometrics = () => {
    Alert.alert(
      'Disable Biometric Authentication?',
      'You can re-enable it later in Settings',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await setBiometricEnabled(false);
            onSuccess(); // Continue to app
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking biometric support...</Text>
      </View>
    );
  }

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <Ionicons name="warning-outline" size={64} color="#FF9500" />
        <Text style={styles.title}>Biometric Not Available</Text>
        <Text style={styles.errorText}>{error}</Text>
        {onCancel && (
          <TouchableOpacity style={styles.button} onPress={onCancel}>
            <Text style={styles.buttonText}>Continue without biometrics</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {biometricType === 'Face ID' ? (
          <Ionicons name="scan-outline" size={80} color="#007AFF" />
        ) : (
          <Ionicons name="finger-print-outline" size={80} color="#007AFF" />
        )}
      </View>

      <Text style={styles.title}>Authentication Required</Text>
      <Text style={styles.subtitle}>
        Use {biometricType} to access your wallet
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleAuthenticate}
      >
        <Ionicons name="scan" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Authenticate</Text>
      </TouchableOpacity>

      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.cancelButton, { marginTop: 16 }]}
        onPress={handleDisableBiometrics}
      >
        <Text style={[styles.cancelButtonText, { color: '#FF3B30' }]}>
          Disable Biometric Authentication
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0C0F28',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  errorBox: {
    backgroundColor: '#FF3B3020',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
});
