import { Injectable } from '@nestjs/common';

export interface ParsedIntent {
  tool: string;
  args: Record<string, unknown>;
}

@Injectable()
export class IntentParser {
  /**
   * Action keywords that indicate a complex request.
   * When present in a long message, skip simple intent matching
   * to avoid false positives (e.g. "баланс" inside "баланса").
   */
  private readonly actionKeywords = [
    'отправь', 'переведи', 'send', 'платёж', 'платеж', 'запланируй',
    'schedule', 'split', 'раздели', 'swap', 'обменяй', 'создай',
    'зарегистрируй', 'register', 'cancel', 'отмени', 'через',
  ];

  parse(message: string): ParsedIntent | null {
    const text = message.trim().toLowerCase();

    // Complex messages with action verbs → let LLM handle everything
    if (this.isComplexMessage(text)) {
      return null;
    }

    if (this.matchesAny(text, [
      'баланс', 'balance', 'сколько', 'сколько у меня', 'мой баланс',
      'what is my balance', 'check balance', 'show balance',
    ])) {
      return { tool: 'get_balance', args: {} };
    }

    if (this.matchesAny(text, [
      'история', 'history', 'транзакции', 'transactions',
      'покажи историю', 'show history', 'recent transactions',
      'последние транзакции', 'мои транзакции',
    ])) {
      return { tool: 'get_history', args: {} };
    }

    if (this.matchesAny(text, [
      'получить', 'receive', 'мой адрес', 'my address',
      'покажи адрес', 'show address', 'qr', 'qr code',
      'адрес кошелька', 'wallet address',
    ])) {
      return { tool: 'receive_address', args: {} };
    }

    if (this.matchesAny(text, ['blik', 'блик', 'создай код', 'create code', 'generate blik', 'сгенерируй код', 'создай блик'])) {
      const amountMatch = text.match(/(\d+\.?\d*)\s*(eth|usdc|usdt|dai|matic|эфир)?/i);
      if (amountMatch) {
        const token = amountMatch[2] ? amountMatch[2].toUpperCase().replace('ЭФИР', 'ETH') : 'ETH';
        return { tool: 'blik_generate', args: { amount: amountMatch[1], token } };
      }
      return null;
    }

    const sendMatch = text.match(
      /(?:отправь|отправить|send|переведи)\s+(\d+\.?\d*)\s*(eth|usdc|usdt|dai|matic|эфир|ether)?\s*(?:на|to|к|@)?\s*(@?\w+)/i,
    );
    if (sendMatch) {
      const recipientRaw = sendMatch[3];
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(recipientRaw);
      const isUsername = recipientRaw.startsWith('@');

      // If recipient is neither an address nor a @username, it might be a contact name
      // Let the LLM handle name resolution with contacts context
      if (!isAddress && !isUsername) {
        return null;
      }

      const recipient = isAddress ? recipientRaw : recipientRaw;
      const token = sendMatch[2] ? sendMatch[2].toUpperCase().replace('ЭФИР', 'ETH') : 'ETH';
      return { tool: 'prepare_send', args: { amount: sendMatch[1], token, recipient } };
    }

    return null;
  }

  /**
   * Word-boundary aware matching.
   * Prevents "баланс" from matching inside "баланса" (genitive).
   */
  private matchesAny(text: string, patterns: string[]): boolean {
    // Pad text so patterns at start/end of string match boundaries
    const padded = ` ${text} `;
    return patterns.some((p) => {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Word boundary: not preceded/followed by word characters (Latin + Cyrillic)
      const regex = new RegExp(
        `(?<=[^a-zа-яёA-ZА-ЯЁ0-9_])${escaped}(?=[^a-zа-яёA-ZА-ЯЁ0-9_])`,
      );
      return regex.test(padded);
    });
  }

  /**
   * Detect complex multi-intent messages that should go to LLM.
   * E.g. "сделай платёж на половину нашего баланса" contains both
   * action verb and "баланс" — intent parser would wrongly match balance.
   */
  private isComplexMessage(text: string): boolean {
    if (text.length <= 30) return false;
    return this.actionKeywords.some((k) => text.includes(k));
  }
}
