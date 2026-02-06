import { bot } from './bot.js';

console.log('🤖 Starting E-Y Growth Bot...');

// Start bot with long polling
bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot started as @${botInfo.username}`);
    console.log('📱 Open Telegram and message your bot!');
    console.log('');
    console.log('Commands:');
    console.log('  /growth - План и статус');
    console.log('  /content <type> - Создать контент');
    console.log('  /opportunities - Гранты и дедлайны');
    console.log('');
    console.log('Press Ctrl+C to stop');
  },
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n👋 Stopping bot...');
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('\n👋 Stopping bot...');
  bot.stop();
});
