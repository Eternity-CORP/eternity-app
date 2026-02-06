import { Bot, Context } from 'grammy';
import { config } from './config.js';
import { callClaude, callGrowth, callContent, callOpportunities } from './claude.js';
import { parseMessage, getHelpText } from './parser.js';

// Create bot instance
export const bot = new Bot(config.botToken);

// /start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    `👋 Привет! Я Growth-помощник E-Y.

Я помогу тебе с:
• 📊 Планированием и статусом (/growth)
• ✍️ Созданием контента (/content)
• 🎯 Поиском грантов (/opportunities)

Напиши /help для списка команд.
    `,
    { parse_mode: 'Markdown' }
  );
});

// /help command
bot.command('help', async (ctx) => {
  await ctx.reply(getHelpText(), { parse_mode: 'Markdown' });
});

// /growth command
bot.command('growth', async (ctx) => {
  await handleSkillCommand(ctx, 'growth', ctx.match);
});

// /content command
bot.command('content', async (ctx) => {
  const args = ctx.match || 'twitter';
  await handleSkillCommand(ctx, 'content', args);
});

// /opportunities command
bot.command('opportunities', async (ctx) => {
  await handleSkillCommand(ctx, 'opportunities', ctx.match);
});

// Handle all text messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // Skip if it's a command (already handled above)
  if (text.startsWith('/')) return;

  // Try to parse as a known command
  const parsed = parseMessage(text);

  if (parsed) {
    await handleSkillCommand(ctx, parsed.skill, parsed.args);
  } else {
    // Unknown message - send directly to Claude
    await handleFreeformMessage(ctx, text);
  }
});

/**
 * Handle a skill command
 */
async function handleSkillCommand(
  ctx: Context,
  skill: 'growth' | 'content' | 'opportunities',
  args?: string
): Promise<void> {
  const skillNames = {
    growth: '📊 Growth Lead',
    content: '✍️ Content Creator',
    opportunities: '🎯 Opportunity Hunter',
  };

  const statusMsg = await ctx.reply(`${skillNames[skill]} думает...`);

  try {
    let response: string;

    switch (skill) {
      case 'growth':
        response = await callGrowth();
        break;
      case 'content':
        response = await callContent(args);
        break;
      case 'opportunities':
        response = await callOpportunities();
        break;
    }

    // Delete "thinking" message
    await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);

    // Send response (split if too long)
    await sendLongMessage(ctx, response);
  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Handle freeform message (send to Claude as-is)
 */
async function handleFreeformMessage(ctx: Context, text: string): Promise<void> {
  const statusMsg = await ctx.reply('🤔 Думаю...');

  try {
    const response = await callClaude(text);

    await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
    await sendLongMessage(ctx, response);
  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Send a long message, splitting if necessary
 * Uses MarkdownV2 for formatting
 */
async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  const MAX_LENGTH = 4096; // Telegram limit

  // Escape special characters for MarkdownV2
  // But preserve ** for bold and ` for code
  const escapeMarkdownV2 = (str: string): string => {
    // First, protect bold and code markers
    let result = str
      .replace(/\*\*(.+?)\*\*/g, '⟦BOLD⟧$1⟦/BOLD⟧')
      .replace(/`([^`]+)`/g, '⟦CODE⟧$1⟦/CODE⟧');

    // Escape special chars
    result = result.replace(/([_\[\]()~>#+=|{}.!-])/g, '\\$1');

    // Restore bold and code
    result = result
      .replace(/⟦BOLD⟧/g, '*')
      .replace(/⟦\/BOLD⟧/g, '*')
      .replace(/⟦CODE⟧/g, '`')
      .replace(/⟦\/CODE⟧/g, '`');

    return result;
  };

  const formattedText = escapeMarkdownV2(text);

  if (formattedText.length <= MAX_LENGTH) {
    try {
      await ctx.reply(formattedText, { parse_mode: 'MarkdownV2' });
    } catch {
      // Fallback to plain text if markdown fails
      await ctx.reply(text);
    }
    return;
  }

  // Split by paragraphs or newlines
  const chunks: string[] = [];
  let current = '';

  for (const line of formattedText.split('\n')) {
    if (current.length + line.length + 1 > MAX_LENGTH) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current);

  // Send each chunk
  for (const chunk of chunks) {
    try {
      await ctx.reply(chunk, { parse_mode: 'MarkdownV2' });
    } catch {
      await ctx.reply(chunk.replace(/\\/g, ''));
    }
  }
}

// Error handling
bot.catch((err) => {
  console.error('❌ Bot error:', err);
});
