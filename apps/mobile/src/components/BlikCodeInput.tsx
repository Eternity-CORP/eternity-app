/**
 * BLIK Code Input Component
 * 6-digit code input with auto-focus between boxes
 */

import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { theme } from '@/src/constants/theme';

interface BlikCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

const CODE_LENGTH = 6;

export function BlikCodeInput({
  value,
  onChange,
  onComplete,
  autoFocus = true,
  editable = true,
}: BlikCodeInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = value.padEnd(CODE_LENGTH, '').split('').slice(0, CODE_LENGTH);

  useEffect(() => {
    // Auto-focus first input on mount
    if (autoFocus && editable) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus, editable]);

  useEffect(() => {
    // Check if complete
    if (value.length === CODE_LENGTH && onComplete) {
      onComplete(value);
      Keyboard.dismiss();
    }
  }, [value, onComplete]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    if (digit) {
      // Update the value
      const newDigits = [...digits];
      newDigits[index] = digit;
      const newValue = newDigits.join('').replace(/ /g, '');
      onChange(newValue);

      // Move to next input
      if (index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index] === '' || digits[index] === ' ') {
        // Move to previous input and clear it
        if (index > 0) {
          const newDigits = [...digits];
          newDigits[index - 1] = '';
          onChange(newDigits.join('').replace(/ /g, ''));
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join('').replace(/ /g, ''));
      }
    }
  };

  const handleFocus = (index: number) => {
    // Select the text in the focused input
    inputRefs.current[index]?.setNativeProps({ selection: { start: 0, end: 1 } });
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.input,
            digit !== '' && digit !== ' ' && styles.inputFilled,
            !editable && styles.inputDisabled,
          ]}
          value={digit === ' ' ? '' : digit}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          editable={editable}
          caretHidden
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  input: {
    width: 48,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFilled: {
    borderColor: theme.colors.buttonPrimary,
  },
  inputDisabled: {
    backgroundColor: theme.colors.surfaceHover,
    color: theme.colors.textSecondary,
  },
});
