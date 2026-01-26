/**
 * BLIK Code Input Component
 * 6-digit code input with individual cells and paste support
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  Pressable,
  Text,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
  const hiddenInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (autoFocus && editable) {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus, editable]);

  useEffect(() => {
    if (value.length === CODE_LENGTH && onComplete) {
      onComplete(value);
      Keyboard.dismiss();
    }
  }, [value, onComplete]);

  const handleChangeText = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    onChange(digitsOnly);
  };

  const handlePress = async () => {
    if (!editable) return;

    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const digitsFromClipboard = clipboardContent.replace(/[^0-9]/g, '');
      if (digitsFromClipboard.length === CODE_LENGTH) {
        onChange(digitsFromClipboard);
        return;
      }
    } catch {
      // Clipboard access failed
    }

    hiddenInputRef.current?.focus();
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < CODE_LENGTH; i++) {
      const digit = value[i] || '';
      const isFilled = digit !== '';
      const isActive = editable && i === value.length && value.length < CODE_LENGTH;

      cells.push(
        <View
          key={i}
          style={[
            styles.cell,
            isFilled && styles.cellFilled,
            isActive && styles.cellActive,
            !editable && styles.cellDisabled,
          ]}
        >
          <Text style={[styles.cellText, !editable && styles.cellTextDisabled]}>
            {digit}
          </Text>
          {isActive && <View style={styles.cursor} />}
        </View>
      );
    }
    return cells;
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        ref={hiddenInputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        editable={editable}
        caretHidden
      />
      <Pressable style={styles.container} onPress={handlePress}>
        {renderCells()}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cell: {
    width: 46,
    height: 54,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cellFilled: {
    borderColor: theme.colors.textPrimary,
    borderWidth: 2,
  },
  cellActive: {
    borderColor: theme.colors.textPrimary,
    borderWidth: 2,
  },
  cellDisabled: {
    backgroundColor: theme.colors.surfaceHover,
  },
  cellText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cellTextDisabled: {
    color: theme.colors.textSecondary,
  },
  cursor: {
    position: 'absolute',
    bottom: 10,
    width: 20,
    height: 2,
    backgroundColor: theme.colors.textPrimary,
  },
});
