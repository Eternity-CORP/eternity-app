import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
};

export default function Input({ label, value, onChangeText, placeholder, secureTextEntry, error }: Props) {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      {!!label && (
        <Text style={[styles.label, { color: theme.colors.muted, fontFamily: theme.typography.fontFamilies.medium }]}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
        ]}
      />
      {!!error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 16, // More rounded like TON Wallet
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    // Soft shadow for depth
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
  },
});
