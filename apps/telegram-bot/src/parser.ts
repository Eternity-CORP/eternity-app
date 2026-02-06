/**
 * Parse natural language messages into skill commands
 */

export interface ParsedCommand {
  skill: 'growth' | 'content' | 'opportunities';
  args?: string;
  raw: string;
}

// Pattern definitions for each skill
const GROWTH_PATTERNS = [
  /^\/growth(?:\s+(.+))?$/i,
  /^\/ey-growth(?:\s+(.+))?$/i,
  /план(?:\s+на\s+(.+))?/i,
  /статус/i,
  /что\s+делать/i,
  /приоритет/i,
  /прогресс/i,
];

const CONTENT_PATTERNS = [
  /^\/content\s+(\w+)(?:\s+(.+))?$/i,
  /^\/ey-content\s+(\w+)(?:\s+(.+))?$/i,
  /напиши\s+твит(?:\s+про\s+(.+))?/i,
  /твит(?:\s+про\s+(.+))?/i,
  /пост\s+(?:для\s+)?(twitter|telegram|твиттер|телеграм)(?:\s+(.+))?/i,
  /напиши\s+пост(?:\s+(.+))?/i,
  /контент(?:\s+(.+))?/i,
  /email(?:\s+(.+))?/i,
  /письмо(?:\s+(.+))?/i,
];

const OPPORTUNITIES_PATTERNS = [
  /^\/opportunities(?:\s+(.+))?$/i,
  /^\/ey-opportunities(?:\s+(.+))?$/i,
  /гранты?/i,
  /дедлайн/i,
  /возможност/i,
  /акселератор/i,
  /фандрайзинг/i,
  /инвестиц/i,
];

/**
 * Try to match text against patterns
 */
function matchPatterns(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Return captured group if exists, otherwise empty string
      return match[1] || match[2] || '';
    }
  }
  return null;
}

/**
 * Parse a message into a command
 */
export function parseMessage(text: string): ParsedCommand | null {
  const trimmed = text.trim();

  // Check growth patterns
  const growthMatch = matchPatterns(trimmed, GROWTH_PATTERNS);
  if (growthMatch !== null) {
    return {
      skill: 'growth',
      args: growthMatch || undefined,
      raw: trimmed,
    };
  }

  // Check content patterns
  const contentMatch = matchPatterns(trimmed, CONTENT_PATTERNS);
  if (contentMatch !== null) {
    // Normalize content type
    let args = contentMatch.toLowerCase();
    if (args.includes('твит') || args.includes('twitter')) {
      args = 'twitter ' + args.replace(/твит|twitter|твиттер/gi, '').trim();
    } else if (args.includes('телеграм') || args.includes('telegram')) {
      args = 'telegram ' + args.replace(/телеграм|telegram/gi, '').trim();
    }

    return {
      skill: 'content',
      args: args.trim() || 'twitter',
      raw: trimmed,
    };
  }

  // Check opportunities patterns
  const oppsMatch = matchPatterns(trimmed, OPPORTUNITIES_PATTERNS);
  if (oppsMatch !== null) {
    return {
      skill: 'opportunities',
      args: oppsMatch || undefined,
      raw: trimmed,
    };
  }

  // No match found
  return null;
}

/**
 * Get help text
 */
export function getHelpText(): string {
  return `🤖 *E-Y Growth Bot*

*Команды:*
/growth — план и статус проекта
/content <тип> — создать контент
/opportunities — гранты и дедлайны
/help — эта справка

*Примеры:*
• "план на сегодня"
• "напиши твит про демо"
• "какие гранты есть?"
• "дедлайны"

Или просто напиши что нужно — я пойму 😊`;
}
