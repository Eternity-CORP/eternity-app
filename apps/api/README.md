# E-Y API

NestJS backend for E-Y crypto wallet.

## Setup

```bash
# From project root
docker compose -f docker-compose.local.yml up -d
cp apps/api/.env.example apps/api/.env
pnpm api
```

## Endpoints

### REST

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/username/:name | Lookup username |
| GET | /api/username/address/:address | Get username by address |
| POST | /api/username | Register username |
| PUT | /api/username | Update username |

### WebSocket

| Namespace | Events |
|-----------|--------|
| /blik | create-code, lookup-code, cancel-code, confirm-payment |
| /transactions | subscribe, unsubscribe |

## Database

PostgreSQL 16 with TypeORM.

Entities auto-sync in development mode (`synchronize: true`).

For production, use migrations:
```bash
pnpm typeorm migration:generate -n MigrationName
pnpm typeorm migration:run
```
