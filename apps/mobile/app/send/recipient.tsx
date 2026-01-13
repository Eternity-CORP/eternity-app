/**
 * Send Screen 2: Recipient Address Input
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setRecipient, validateRecipient, setStep } from '@/src/store/slices/send-slice';
import { validateAddress } from '@/src/services/send-service';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function RecipientScreen() {
  const dispatch = useAppDispatch();
  const send = useAppSelector((state) => state.send);
  const [address, setAddress] = useState(send.recipient);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    
    if (!validateAddress(address.trim())) {
      setError('Invalid address format');
      return;
    }
    
    setError(null);
    dispatch(setRecipient(address.trim()));
    dispatch(setStep('amount'));
    router.push('/send/amount');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <FontAwesome name="arrow-left" size={16} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.title, theme.typography.title]}>Send</Text>
        <TouchableOpacity style={styles.backButton}>
          <FontAwesome name="qrcode" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, theme.typography.body]}
            placeholder="Enter address or @username"
            placeholderTextColor={theme.colors.textTertiary}
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error && (
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              {error}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!address.trim() || !validateAddress(address.trim())) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!address.trim() || !validateAddress(address.trim())}
        >
          <Text style={[styles.continueButtonText, theme.typography.heading]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginTop: theme.spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  errorText: {
    marginTop: theme.spacing.sm,
  },
  continueButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  continueButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
