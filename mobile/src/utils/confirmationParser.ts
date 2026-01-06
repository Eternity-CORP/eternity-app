/**
 * Text command parser for confirmation actions
 * Supports EN and RU locales
 */

const CONFIRM_COMMANDS: Record<string, string[]> = {
  en: ['ok', 'send', 'send it', 'confirm', 'yes', 'do it', 'go', 'proceed', 'approve'],
  ru: ['ок', 'окей', 'отправь', 'отправить', 'подтвердить', 'да', 'давай', 'подтверждаю', 'согласен'],
};

const CANCEL_COMMANDS: Record<string, string[]> = {
  en: ['cancel', 'no', 'stop', 'wait', 'nevermind', 'abort', 'reject', 'decline'],
  ru: ['отмена', 'нет', 'стоп', 'подожди', 'отменить', 'отклонить', 'не надо'],
};

const WAIT_COMMANDS: Record<string, string[]> = {
  en: ['wait', 'hold', 'pause', 'later'],
  ru: ['подожди', 'погоди', 'позже', 'пауза'],
};

export type ConfirmationResult = 'confirm' | 'cancel' | 'wait' | 'unknown';

/**
 * Parse user text input to determine confirmation intent
 * @param text User input text
 * @param locale Current locale (en or ru)
 * @returns ConfirmationResult
 */
export const parseConfirmationCommand = (
  text: string,
  locale: 'en' | 'ru' = 'en'
): ConfirmationResult => {
  const normalized = text.toLowerCase().trim();

  // Check for wait first (takes priority over cancel)
  if (WAIT_COMMANDS[locale]?.some(cmd => normalized.includes(cmd))) {
    return 'wait';
  }

  // Check confirm commands
  if (CONFIRM_COMMANDS[locale]?.some(cmd => normalized.includes(cmd))) {
    return 'confirm';
  }

  // Check cancel commands
  if (CANCEL_COMMANDS[locale]?.some(cmd => normalized.includes(cmd))) {
    return 'cancel';
  }

  // Fallback: check other locale as well
  const otherLocale = locale === 'en' ? 'ru' : 'en';
  
  if (CONFIRM_COMMANDS[otherLocale]?.some(cmd => normalized.includes(cmd))) {
    return 'confirm';
  }

  if (CANCEL_COMMANDS[otherLocale]?.some(cmd => normalized.includes(cmd))) {
    return 'cancel';
  }

  return 'unknown';
};

/**
 * Check if text is a valid confirmation command
 */
export const isConfirmationCommand = (text: string, locale: 'en' | 'ru' = 'en'): boolean => {
  return parseConfirmationCommand(text, locale) !== 'unknown';
};

/**
 * Get all valid commands for display
 */
export const getConfirmCommands = (locale: 'en' | 'ru' = 'en'): string[] => {
  return CONFIRM_COMMANDS[locale] || CONFIRM_COMMANDS.en;
};

export const getCancelCommands = (locale: 'en' | 'ru' = 'en'): string[] => {
  return CANCEL_COMMANDS[locale] || CANCEL_COMMANDS.en;
};
