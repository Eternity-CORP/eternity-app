# E-Y (Eternity Wallet)

> Mobile-first crypto wallet with BLIK-style P2P transfers, @username support, and AI-powered transactions.

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E.svg)](https://nestjs.com/)

## What is E-Y?

E-Y reimagines how people interact with crypto. Instead of copying long addresses and worrying about networks, you just:

- **Send via @username** — like Venmo, but on-chain
- **Use BLIK codes** — 6-digit codes for instant P2P transfers (inspired by the Polish BLIK system)
- **Talk to AI** — describe what you want in natural language, and the AI executes it

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 54+, TypeScript, Redux Toolkit |
| Web | Next.js 16, Tailwind CSS v4 |
| Backend | NestJS, PostgreSQL, WebSocket |
| Blockchain | ethers.js v6, Alchemy RPC, Solidity |
| Smart Contracts | Hardhat, OpenZeppelin |
| Monorepo | Turborepo + pnpm |

## Project Structure

```
e-y/
├── apps/
│   ├── api/            # NestJS backend
│   ├── mobile/         # Expo React Native app
│   ├── web/            # Next.js web app
│   └── website/        # Landing page
├── contracts/          # Solidity smart contracts
├── packages/
│   ├── shared/         # Shared types, constants, utils
│   ├── ui/             # Shared UI components
│   ├── crypto/         # Crypto utilities
│   └── storage/        # Storage abstraction
└── docs/               # Documentation
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)
- Expo Go app (iOS/Android)

### Setup

```bash
# Clone and install
git clone https://github.com/Eternity-CORP/eternity-app.git
cd eternity-app
pnpm install

# Start PostgreSQL
docker compose -f docker-compose.local.yml up -d

# Copy environment files
cp apps/api/.env.example apps/api/.env

# Start development (API + Mobile)
pnpm mobile:go
```

### Development Commands

```bash
# Start mobile only
pnpm mobile:only

# Start API only
pnpm api

# Start both (concurrent)
pnpm mobile:go

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run API tests
pnpm test:api
```

### Database

PostgreSQL 16 via Docker:

```bash
# Start
docker compose -f docker-compose.local.yml up -d

# Stop
docker compose -f docker-compose.local.yml down

# Reset (delete data)
docker compose -f docker-compose.local.yml down -v
```

## Features

### Personal Wallet
- HD wallet creation/import (BIP-39)
- Multi-network support (Ethereum, Polygon, Arbitrum, Optimism, Base)
- Send to address, @username, or BLIK code
- QR code scanning for receiving
- Real-time transaction tracking via WebSocket
- Contact book with favorites
- Token management (ERC-20)

### AI Assistant
- Natural language transaction execution
- Wallet analysis and insights
- Smart suggestions based on activity

### BLIK System
- 6-digit codes for instant P2P transfers
- 2-minute expiration for security
- Real-time matching via WebSocket

## Architecture

E-Y follows a **shared-first** architecture:

- All business logic lives in `packages/shared/` first
- Platform-specific code stays in respective apps
- Zero runtime dependencies in shared packages
- Dependency injection for platform-specific implementations

For detailed architecture documentation, see [`docs/v1.0/architecture.md`](./docs/v1.0/architecture.md).

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request.

By contributing, you agree to our [Contributor License Agreement](./CONTRIBUTING.md#contributor-license-agreement-cla) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

If you discover a security vulnerability, please follow our [Security Policy](./SECURITY.md). **Do not open a public issue.**

## License

This project is licensed under the **Business Source License 1.1** (BSL 1.1).

- **You can**: read, fork, modify, learn from, and use for non-commercial purposes
- **You cannot**: use commercially as a competing service without written permission
- **On February 27, 2030**: the license automatically converts to Apache 2.0

See the [LICENSE](./LICENSE) file for full terms.

### Trademarks

"E-Y", "Eternity Wallet", "Eternity" (in crypto/fintech context), and "eternaki" are trademarks of Danylo Lohachov. See [NOTICE](./NOTICE) for details.

## Author

**Danylo Lohachov** ([@eternaki](https://github.com/eternaki))

- Email: eternity.shard.business@gmail.com
- Project: [Eternity Corp](https://github.com/Eternity-CORP)

---

<sub>Copyright 2025-2026 Danylo Lohachov. All rights reserved.</sub>
