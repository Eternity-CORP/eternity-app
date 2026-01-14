# @Username System Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** Enable users to send crypto to @username instead of wallet address, with username registration and lookup.

**Features Covered:** FR-2.2, FR-5.1, FR-5.2, FR-5.3

**Date:** 2026-01-14

---

## 1. Architecture Overview

### Storage
- **PostgreSQL** via NestJS API (Railway deployment)
- Centralized registry for MVP (decentralized planned for v3.0)

### Database Schema

```sql
CREATE TABLE usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) NOT NULL UNIQUE,
  address VARCHAR(42) NOT NULL UNIQUE,
  signature TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usernames_username ON usernames(username);
CREATE INDEX idx_usernames_address ON usernames(address);
```

**Constraints:**
- `username` — unique, lowercase, 3-20 characters
- `address` — unique, one address = one username
- `signature` — proof of address ownership

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/username/:name` | Lookup: username → address |
| `GET` | `/api/username/address/:address` | Reverse lookup: address → username |
| `POST` | `/api/username` | Register username (with signature) |
| `PUT` | `/api/username` | Update username (with signature) |
| `DELETE` | `/api/username` | Delete username (with signature) |

---

## 2. Username Format & Validation

### Rules
- **Pattern:** `^[a-z][a-z0-9_]{2,19}$`
- **Length:** 3-20 characters
- **Characters:** lowercase letters, digits, underscore
- **Start:** Must start with a letter
- **Case:** Case-insensitive (stored lowercase)

### Reserved Words
```typescript
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'support', 'help',
  'eternity', 'eternaki', 'blik', 'system',
  'root', 'api', 'www', 'app', 'wallet'
];
```

---

## 3. Signature-Based Verification

### Message Format
```
E-Y:claim:@{username}:{address}:{timestamp}
```

### Registration Flow
1. Client creates message with username, address, current timestamp
2. Client signs message with private key
3. Client sends `{ username, address, signature, timestamp }` to API
4. Server validates:
   - Username format matches regex
   - Username not in reserved list
   - Username not already taken
   - Address doesn't have a username
   - Signature is valid (ethers.verifyMessage)
   - Timestamp not older than 5 minutes
5. Server saves to DB → returns success

### Signature Verification (Server)
```typescript
import { verifyMessage } from 'ethers';

function verifyUsernameSignature(
  username: string,
  address: string,
  signature: string,
  timestamp: number
): boolean {
  const message = `E-Y:claim:@${username}:${address}:${timestamp}`;
  const recoveredAddress = verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
}
```

---

## 4. Mapping Rules

- **1:1 relationship:** One username ↔ one address
- **Username change:** Old username released immediately
- **Address change:** Must re-register username
- **Deletion:** Username released immediately

---

## 5. Backend Implementation

### Module Structure
```
apps/api/src/username/
├── username.module.ts
├── username.controller.ts
├── username.service.ts
├── username.entity.ts
├── dto/
│   ├── register-username.dto.ts
│   ├── update-username.dto.ts
│   └── lookup-username.dto.ts
└── username.service.test.ts
```

### Error Codes
```typescript
'USERNAME_INVALID_FORMAT'    // Doesn't match regex
'USERNAME_RESERVED'          // In reserved list
'USERNAME_TAKEN'             // Already registered
'ADDRESS_HAS_USERNAME'       // Address already has username
'SIGNATURE_INVALID'          // Signature verification failed
'TIMESTAMP_EXPIRED'          // Timestamp > 5 minutes old
'USERNAME_NOT_FOUND'         // Lookup failed
```

### Response Format
```typescript
// Success
{ success: true, data: { username: string, address: string } }

// Error
{ success: false, error: { code: string, message: string } }
```

---

## 6. Mobile App Integration

### New Files
```
apps/mobile/src/services/username-service.ts
apps/mobile/src/store/slices/username-slice.ts
apps/mobile/app/settings/username.tsx
```

### username-service.ts Functions
```typescript
// Lookup username → address
async function lookupUsername(username: string): Promise<string | null>

// Register username (with signature)
async function registerUsername(username: string, wallet: HDNodeWallet): Promise<void>

// Check username availability
async function checkUsernameAvailable(username: string): Promise<boolean>

// Get username for address
async function getUsernameByAddress(address: string): Promise<string | null>

// Delete username
async function deleteUsername(wallet: HDNodeWallet): Promise<void>
```

---

## 7. Send Flow Integration

### Updated recipient.tsx Logic
```typescript
const handleInputChange = async (text: string) => {
  setInput(text);

  if (text.startsWith('@') && text.length > 1) {
    // Username lookup
    setIsLookingUp(true);
    const username = text.slice(1).toLowerCase();
    const address = await debouncedLookup(username);
    setResolvedAddress(address);
    setIsLookingUp(false);
  } else if (isAddress(text)) {
    // Direct address
    setResolvedAddress(text);
  } else {
    setResolvedAddress(null);
  }
};
```

### UI States
| Input | State | Display |
|-------|-------|---------|
| `@dan...` | Looking up | "Searching..." |
| `@daniel` | Found | "✓ @daniel → 0x1234...5678" |
| `@unknown` | Not found | "✗ Username not found" |
| `0x1234...` | Valid address | Standard validation |

### Debounce
```typescript
const debouncedLookup = useMemo(
  () => debounce(lookupUsername, 300),
  []
);
```

---

## 8. Username Registration UI

### Screen: settings/username.tsx

```
┌─────────────────────────────────────┐
│ ← Your @username                    │
├─────────────────────────────────────┤
│                                     │
│  Claim your unique username to      │
│  receive payments easily.           │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ @  │ [input field]              ││
│  └─────────────────────────────────┘│
│                                     │
│  [availability status]              │
│                                     │
│  ┌─────────────────────────────────┐│
│  │         Claim @username         ││
│  └─────────────────────────────────┘│
│                                     │
│  You'll sign a message to prove     │
│  you own this wallet.               │
│                                     │
└─────────────────────────────────────┘
```

### States
- Empty → "Enter 3-20 characters"
- Checking → "Checking availability..."
- Available → "✓ Available" (green)
- Taken → "✗ Username taken" (red)
- Invalid → "Only letters, numbers, underscore"

---

## 9. Error Handling

### Network Errors
```typescript
try {
  const address = await lookupUsername(username);
  if (!address) {
    setError('Username not found');
  }
} catch (error) {
  setError('Connection error. Try again.');
  // Allow direct address input as fallback
}
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| API unavailable during send | Show error, allow direct address |
| Username deleted after lookup | Re-verify on confirm screen |
| Wallet address changed | Username unlinked, needs re-registration |
| Multiple accounts in wallet | Each account can have its own username |

### Confirm Screen
- Show both @username AND resolved address
- User sees where funds actually go
- Warning if discrepancy detected

---

## 10. Implementation Order

| # | Task | Files |
|---|------|-------|
| 1 | Database setup | TypeORM config, migration |
| 2 | Username entity | `username.entity.ts` |
| 3 | Username DTOs | `dto/*.ts` |
| 4 | Username service | `username.service.ts` |
| 5 | Username controller | `username.controller.ts` |
| 6 | Username module | `username.module.ts` |
| 7 | Mobile: username-service | `username-service.ts` |
| 8 | Mobile: update recipient | `recipient.tsx` |
| 9 | Mobile: registration screen | `settings/username.tsx` |
| 10 | Mobile: show in UI | Home, Receive screens |

---

## 11. Dependencies

### Backend (apps/api)
```bash
# Already have: @nestjs/common, @nestjs/core
# Need to add:
pnpm add @nestjs/typeorm typeorm pg
pnpm add class-validator class-transformer
pnpm add ethers
```

### Mobile (apps/mobile)
No new dependencies (ethers already installed).

---

## 12. Testing

### Unit Tests
- Username validation (format, reserved words)
- Signature verification
- Service methods

### Integration Tests
- Register → Lookup → Send flow
- Error scenarios (taken, invalid, network)

### Manual Testing
- Full flow on device
- Edge cases (offline, slow network)
