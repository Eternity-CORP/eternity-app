import * as Haptics from 'expo-haptics';

export type RiskLevel = 'safe' | 'caution' | 'warning';

/**
 * Triggers haptic feedback based on risk level
 * - safe: light impact
 * - caution: medium impact
 * - warning: notification warning
 */
export const triggerHaptic = (riskLevel: RiskLevel): void => {
  switch (riskLevel) {
    case 'safe':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'caution':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
};

/**
 * Trigger success haptic feedback
 */
export const triggerSuccessHaptic = (): void => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Trigger error haptic feedback
 */
export const triggerErrorHaptic = (): void => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * Trigger selection haptic (for buttons, toggles)
 */
export const triggerSelectionHaptic = (): void => {
  Haptics.selectionAsync();
};
