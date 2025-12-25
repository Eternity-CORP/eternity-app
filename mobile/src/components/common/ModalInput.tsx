import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface ModalInputProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChangeText: (text: string) => void;
  onConfirm?: () => void;
  title?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  maxLength?: number;
  secureTextEntry?: boolean;
  editable?: boolean;
  selectTextOnFocus?: boolean;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  autoFocus?: boolean;
  helperText?: string;
  errorText?: string;
}

export default function ModalInput({
  visible,
  onClose,
  value,
  onChangeText,
  onConfirm,
  title,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  maxLength,
  secureTextEntry = false,
  editable = true,
  selectTextOnFocus = true,
  returnKeyType = 'done',
  autoFocus = true,
  helperText,
  errorText,
}: ModalInputProps) {
  const { theme } = useTheme();
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleConfirm = () => {
    onChangeText(localValue);
    if (onConfirm) {
      onConfirm();
    }
    Keyboard.dismiss();
    onClose();
  };

  const handleCancel = () => {
    setLocalValue(value); // Reset to original value
    Keyboard.dismiss();
    onClose();
  };

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    // Also update parent in real-time
    onChangeText(text);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {title || 'Enter Value'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Input Field */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: errorText ? theme.colors.error : theme.colors.border,
                      },
                      multiline && styles.inputMultiline,
                    ]}
                    value={localValue}
                    onChangeText={handleChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    multiline={multiline}
                    maxLength={maxLength}
                    secureTextEntry={secureTextEntry}
                    editable={editable}
                    selectTextOnFocus={selectTextOnFocus}
                    returnKeyType={returnKeyType}
                    autoFocus={autoFocus}
                    onSubmitEditing={handleConfirm}
                  />

                  {/* Helper Text */}
                  {helperText && !errorText && (
                    <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                      {helperText}
                    </Text>
                  )}

                  {/* Error Text */}
                  {errorText && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                      <Text style={[styles.errorText, { color: theme.colors.error }]}>
                        {errorText}
                      </Text>
                    </View>
                  )}

                  {/* Character Count */}
                  {maxLength && (
                    <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                      {localValue.length}/{maxLength}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { backgroundColor: theme.colors.background },
                    ]}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.confirmButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleConfirm}
                  >
                    <Text style={[styles.buttonText, styles.confirmButtonText]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Lighter overlay for TON Wallet style
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 28, // More rounded
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    // Softer shadow
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16, // More rounded like TON Wallet
    borderWidth: 1,
    minHeight: 52,
    // Soft shadow
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  helperText: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20, // More rounded
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
