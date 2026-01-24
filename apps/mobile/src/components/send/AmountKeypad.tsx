/**
 * AmountKeypad Component
 * Reusable numeric keypad for entering amounts
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';

interface Props {
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export function AmountKeypad({ onNumberPress, onBackspace, disabled = false }: Props) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <View style={styles.keypad}>
      {keys.map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.keypadButton}
          onPress={() => {
            if (key === 'backspace') {
              onBackspace();
            } else {
              onNumberPress(key);
            }
          }}
          disabled={disabled}
        >
          {key === 'backspace' ? (
            <FontAwesome name="arrow-left" size={20} color={theme.colors.textPrimary} />
          ) : (
            <Text style={[styles.keypadText, theme.typography.title]}>{key}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  keypadText: {
    color: theme.colors.textPrimary,
  },
});
