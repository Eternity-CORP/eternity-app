/**
 * Error Alert Component
 * 
 * Shows user-friendly error messages with hints
 */

import React from 'react';
import { Alert } from 'react-native';
import { getErrorMessage, type Language } from '../../utils/error-codes';

interface ErrorAlertOptions {
  error: Error | string;
  language?: Language;
  onAction?: () => void;
  onDismiss?: () => void;
}

/**
 * Show error alert with user-friendly message
 */
export function showErrorAlert({
  error,
  language = 'en',
  onAction,
  onDismiss,
}: ErrorAlertOptions): void {
  const errorMessage = getErrorMessage(error, language);

  const buttons: any[] = [];

  // Add action button if available
  if (errorMessage.action && onAction) {
    buttons.push({
      text: errorMessage.action,
      onPress: onAction,
    });
  }

  // Add dismiss button
  buttons.push({
    text: language === 'ru' ? 'OK' : 'OK',
    style: 'cancel',
    onPress: onDismiss,
  });

  Alert.alert(
    errorMessage.title,
    `${errorMessage.message}\n\n💡 ${errorMessage.hint}`,
    buttons
  );
}

/**
 * Show confirmation dialog before action
 */
export function showConfirmDialog(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  language: Language = 'en'
): void {
  Alert.alert(
    title,
    message,
    [
      {
        text: language === 'ru' ? 'Отмена' : 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: language === 'ru' ? 'Подтвердить' : 'Confirm',
        onPress: onConfirm,
      },
    ]
  );
}
