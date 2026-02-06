# E-Y Telegram Bot — Design Document

> Created: 2026-01-31
> Status: Approved

## Overview

Telegram bot for managing E-Y growth activities via Claude Code CLI.

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Telegram   │ ──── │   Mac (local)    │ ──── │ Claude Code │
│  User       │      │   Node.js bot    │      │ CLI         │
└─────────────┘      └──────────────────┘      └─────────────┘
```

- Bot runs locally on Mac
- Uses long polling (not webhooks)
- Calls Claude Code CLI for responses
- CLI runs from apps/mobile to access skills

## Project Structure

```
apps/telegram-bot/
├── package.json
├── tsconfig.json
├── .env                    # BOT_TOKEN (gitignored)
├── .env.example
└── src/
    ├── index.ts            # Entry point
    ├── bot.ts              # Grammy bot setup
    ├── claude.ts           # Claude CLI integration
    ├── parser.ts           # Natural language → commands
    └── config.ts           # Configuration
```

## Commands

| Command | Natural Language Aliases |
|---------|--------------------------|
| `/growth` | "план", "статус", "что делать" |
| `/content <type>` | "напиши твит", "пост для телеграма" |
| `/opportunities` | "гранты", "дедлайны", "возможности" |
| `/help` | "помощь", "команды" |

## Dependencies

- `grammy` — Telegram Bot framework
- `tsx` — TypeScript execution
- `dotenv` — Environment variables

## Running

```bash
cd apps/telegram-bot
pnpm install
pnpm dev
```

## Future Improvements

- [ ] Deploy to VPS for 24/7 availability
- [ ] Add inline keyboards for options
- [ ] Scheduled notifications (morning plan)
- [ ] Claude API instead of CLI for speed
