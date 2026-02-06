import 'dotenv/config';

export const config = {
  botToken: process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
  claudeTimeout: 120000, // 2 minutes for Claude to respond
};

// Validate required config
if (!config.botToken) {
  console.error('❌ BOT_TOKEN is required');
  process.exit(1);
}

// Check for Claude OAuth token
if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  console.warn('⚠️  CLAUDE_CODE_OAUTH_TOKEN not set - Claude CLI may not work');
}
