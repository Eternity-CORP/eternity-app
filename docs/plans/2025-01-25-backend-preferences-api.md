# Backend API for Network Preferences

> Specification for the backend API endpoints needed by the Network Abstraction v2 feature.

**Date:** 2025-01-25
**Status:** Specification
**Related:** `2025-01-25-network-abstraction-v2-implementation.md`

---

## Overview

This document specifies the backend API endpoints required to support the Network Preferences feature. The mobile app uses these endpoints to:

1. Fetch recipient network preferences when sending
2. Save user's own preferences with authentication
3. Include preferences in username lookups

---

## Endpoints

### GET /api/address/:address/preferences

Returns network preferences for a given Ethereum address.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Ethereum address (0x...) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f1dE2B",
    "preferences": {
      "defaultNetwork": "base",
      "tokenOverrides": {
        "USDC": "polygon",
        "USDT": "arbitrum"
      },
      "updatedAt": "2025-01-25T10:30:00.000Z"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "PREFERENCES_NOT_FOUND",
    "message": "No preferences found for this address"
  }
}
```

**Notes:**
- Address should be normalized to lowercase before lookup
- Returns 404 if address has never saved preferences (not an error, just no data)
- Client should handle 404 gracefully (treat as "no preference")

---

### PUT /api/preferences

Save or update network preferences for an address. Requires signature authentication.

**Request Body:**
```json
{
  "defaultNetwork": "base",
  "tokenOverrides": {
    "USDC": "polygon"
  },
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f1dE2B",
  "signature": "0x1234...abcd",
  "timestamp": 1737801000000
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `defaultNetwork` | string \| null | Yes | Default receiving network (or null for "any") |
| `tokenOverrides` | object | Yes | Token symbol -> network ID mappings |
| `address` | string | Yes | User's Ethereum address |
| `signature` | string | Yes | EIP-191 signature of the message |
| `timestamp` | number | Yes | Unix timestamp in milliseconds |

**Signature Verification:**

The server must verify that the signature was created by the owner of the address.

**Message format:**
```
E-Y:preferences:{address}:{timestamp}
```

**Example:**
```
E-Y:preferences:0x742d35cc6634c0532925a3b844bc9e7595f1de2b:1737801000000
```

**Server verification (pseudo-code):**
```typescript
import { verifyMessage } from 'ethers';

function verifyPreferencesSignature(
  address: string,
  signature: string,
  timestamp: number
): boolean {
  // Check timestamp is not too old (5 minute window)
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const message = `E-Y:preferences:${address.toLowerCase()}:${timestamp}`;
  const recoveredAddress = verifyMessage(message, signature);

  return recoveredAddress.toLowerCase() === address.toLowerCase();
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f1dE2B",
    "preferences": {
      "defaultNetwork": "base",
      "tokenOverrides": {
        "USDC": "polygon"
      },
      "updatedAt": "2025-01-25T10:30:00.000Z"
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Signature verification failed"
  }
}
```

**Response (400 Bad Request - Timestamp):**
```json
{
  "success": false,
  "error": {
    "code": "TIMESTAMP_EXPIRED",
    "message": "Request timestamp is too old"
  }
}
```

**Validation Rules:**
- `defaultNetwork` must be a valid network ID or null
- `tokenOverrides` keys must be uppercase token symbols
- `tokenOverrides` values must be valid network IDs
- Address must be a valid Ethereum address (42 chars, starts with 0x)
- Timestamp must be within 5 minutes of server time

---

### GET /api/username/:username (Updated)

Returns username data including network preferences.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | Username (without @ prefix) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "username": "alice",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f1dE2B",
    "preferences": {
      "defaultNetwork": "base",
      "tokenOverrides": {
        "USDC": "polygon"
      }
    },
    "createdAt": "2025-01-10T08:00:00.000Z"
  }
}
```

**Response (200 OK - No preferences set):**
```json
{
  "success": true,
  "data": {
    "username": "bob",
    "address": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    "preferences": null,
    "createdAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "USERNAME_NOT_FOUND",
    "message": "Username not found"
  }
}
```

**Notes:**
- The `preferences` field is added to the existing username response
- If user has no preferences, `preferences` is `null` (not omitted)
- This allows fetching preferences in a single request during username resolution

---

## Database Schema

### New Table: address_preferences

```sql
CREATE TABLE address_preferences (
  address VARCHAR(42) PRIMARY KEY,
  default_network VARCHAR(20),
  token_overrides JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_address_preferences_updated ON address_preferences(updated_at);

-- Add constraint for valid network values
ALTER TABLE address_preferences
ADD CONSTRAINT valid_default_network
CHECK (default_network IS NULL OR default_network IN ('ethereum', 'polygon', 'arbitrum', 'base', 'optimism'));
```

### Updated Query: Get Username with Preferences

```sql
-- Join usernames with address_preferences
SELECT
  u.username,
  u.address,
  u.created_at,
  p.default_network,
  p.token_overrides
FROM usernames u
LEFT JOIN address_preferences p ON LOWER(u.address) = LOWER(p.address)
WHERE LOWER(u.username) = LOWER($1);
```

---

## Supported Network IDs

| Network ID | Network Name |
|------------|--------------|
| `ethereum` | Ethereum Mainnet |
| `polygon` | Polygon PoS |
| `arbitrum` | Arbitrum One |
| `base` | Base |
| `optimism` | Optimism |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PREFERENCES_NOT_FOUND` | 404 | No preferences for this address |
| `USERNAME_NOT_FOUND` | 404 | Username does not exist |
| `INVALID_SIGNATURE` | 400 | Signature verification failed |
| `TIMESTAMP_EXPIRED` | 400 | Request timestamp too old |
| `INVALID_ADDRESS` | 400 | Malformed Ethereum address |
| `INVALID_NETWORK` | 400 | Unknown network ID |
| `INVALID_TOKEN_SYMBOL` | 400 | Malformed token symbol |

---

## Implementation Notes

### NestJS Controller Example

```typescript
@Controller('api')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('address/:address/preferences')
  async getPreferences(@Param('address') address: string) {
    const preferences = await this.preferencesService.findByAddress(address);
    if (!preferences) {
      throw new NotFoundException({
        success: false,
        error: { code: 'PREFERENCES_NOT_FOUND', message: 'No preferences found' }
      });
    }
    return { success: true, data: { address, preferences } };
  }

  @Put('preferences')
  async savePreferences(@Body() dto: SavePreferencesDto) {
    // Verify signature
    const isValid = this.preferencesService.verifySignature(
      dto.address,
      dto.signature,
      dto.timestamp
    );
    if (!isValid) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed' }
      });
    }

    const result = await this.preferencesService.upsert(dto);
    return { success: true, data: result };
  }
}
```

### DTO Validation

```typescript
import { IsString, IsOptional, IsObject, IsNumber, Matches } from 'class-validator';

export class SavePreferencesDto {
  @IsOptional()
  @IsString()
  defaultNetwork: string | null;

  @IsObject()
  tokenOverrides: Record<string, string>;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  address: string;

  @IsString()
  signature: string;

  @IsNumber()
  timestamp: number;
}
```

---

## Security Considerations

1. **Signature Verification:** Always verify the signature before accepting preferences
2. **Timestamp Window:** Reject requests with timestamps older than 5 minutes
3. **Rate Limiting:** Implement rate limiting on PUT endpoint (suggest: 10 req/min per address)
4. **Input Validation:** Validate all input fields, especially network IDs and token symbols
5. **Address Normalization:** Always normalize addresses to lowercase before storage/lookup

---

## Migration Path

1. Create `address_preferences` table
2. Add preferences join to existing username lookup query
3. Deploy new endpoints
4. Mobile app begins using endpoints (backwards compatible)

---

*Specification created: 2025-01-25*
