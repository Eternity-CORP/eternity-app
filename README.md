# E-Y: Crypto Wallet with BLIK Payments

A mobile-first crypto wallet with BLIK-style P2P transfers, @username support, and scheduled payments.

## Tech Stack

- **Mobile**: Expo SDK 54+, TypeScript, Redux Toolkit
- **Backend**: NestJS, PostgreSQL, WebSocket
- **Blockchain**: ethers.js v6, Alchemy RPC

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

# Build development client
cd apps/mobile && eas build --profile development --platform ios
```

## Project Structure

```
apps/
├── api/          # NestJS backend
│   ├── src/
│   │   ├── blik/        # BLIK code system
│   │   ├── username/    # @username registry
│   │   └── transaction/ # Transaction WebSocket
│   └── Dockerfile
├── mobile/       # Expo React Native app
│   ├── app/             # Expo Router screens
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── services/    # API services
│   │   └── store/       # Redux store
│   └── eas.json
└── shared/       # Shared types and constants
```

## Database

PostgreSQL 16 via Docker:

```bash
# Start
docker compose -f docker-compose.local.yml up -d

# Stop
docker compose -f docker-compose.local.yml down

# Reset (delete data)
docker compose -f docker-compose.local.yml down -v
```

### Environment Variables

```env
# apps/api/.env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=ey
DATABASE_PASSWORD=ey_dev_password
DATABASE_NAME=ey_dev
```

## Features

- Wallet creation/import (BIP-39)
- Send to address, @username, or BLIK code
- Receive via QR, address, or BLIK
- Real-time transaction tracking
- Contact book
- Split bill requests
- Scheduled/recurring payments

## License

Proprietary - Eternity Corp
