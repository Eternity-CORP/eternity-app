import { Injectable } from '@nestjs/common';

export interface ParsedIntent {
  tool: string;
  args: Record<string, unknown>;
}

@Injectable()
export class IntentParser {
  parse(message: string): ParsedIntent | null {
    const text = message.trim().toLowerCase();

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
      const amountMatch = text.match(/(\d+\.?\d*)\s*(eth|эфир)?/);
      if (amountMatch) {
        return { tool: 'blik_generate', args: { amount: amountMatch[1], token: 'ETH' } };
      }
      return null;
    }

    const sendMatch = text.match(
      /(?:отправь|отправить|send|переведи)\s+(\d+\.?\d*)\s*(eth|эфир|ether)?\s*(?:на|to|к|@)?\s*(@?\w+)/,
    );
    if (sendMatch) {
      const recipient = sendMatch[3].startsWith('@') ? sendMatch[3] : `@${sendMatch[3]}`;
      return { tool: 'prepare_send', args: { amount: sendMatch[1], token: 'ETH', recipient } };
    }

    return null;
  }

  private matchesAny(text: string, patterns: string[]): boolean {
    return patterns.some((p) => text.includes(p) || text === p);
  }
}
