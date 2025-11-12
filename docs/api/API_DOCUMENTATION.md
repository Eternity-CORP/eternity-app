# API Documentation
# Eternity Wallet Backend API

**Version:** 1.0
**Base URL:** `http://localhost:3000/api`
**Protocol:** HTTP/REST
**Data Format:** JSON

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Module](#user-module)
3. [Split Bill Module](#split-bill-module)
4. [Scheduled Payment Module](#scheduled-payment-module)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Authentication

**Current Status:** No authentication required (development)

**Future Enhancement:** JWT-based authentication
- Include `Authorization: Bearer <token>` header
- Tokens expire after 24 hours
- Refresh tokens for extended sessions

---

## User Module

### 1. Register User

Register a new user or get existing user by wallet address.

**Endpoint:** `POST /api/users/register`

**Request Body:**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response:** `200 OK`
```json
{
  "id": "8efa52be-aba3-4317-a0b3-a10f18a28b97",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "createdAt": "2025-10-29T21:10:09.679Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid wallet address format
- `500 Internal Server Error` - Database error

---

### 2. Register Push Token

Register an Expo push token for sending notifications.

**Endpoint:** `POST /api/users/push-token`

**Request Body:**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "platform": "IOS",
  "deviceId": "device-uuid-optional"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| walletAddress | string | Yes | Ethereum wallet address |
| expoPushToken | string | Yes | Expo push notification token |
| platform | enum | Yes | One of: IOS, ANDROID, WEB |
| deviceId | string | No | Unique device identifier |

**Response:** `200 OK`
```json
{
  "id": "35d56d67-092f-4541-a0e4-4968713b1864",
  "active": true,
  "platform": "IOS"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `404 Not Found` - User not registered

---

### 3. Get User by Wallet Address

Retrieve user information by wallet address.

**Endpoint:** `GET /api/users/:walletAddress`

**Example:** `GET /api/users/0x1234567890123456789012345678901234567890`

**Response:** `200 OK`
```json
{
  "found": true,
  "id": "8efa52be-aba3-4317-a0b3-a10f18a28b97",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "createdAt": "2025-10-29T21:10:09.679Z"
}
```

**Not Found Response:** `200 OK`
```json
{
  "found": false
}
```

---

### 4. Get User Push Tokens

Get all active push tokens for a user.

**Endpoint:** `GET /api/users/:walletAddress/push-tokens`

**Response:** `200 OK`
```json
[
  {
    "id": "35d56d67-092f-4541-a0e4-4968713b1864",
    "platform": "IOS",
    "active": true,
    "lastUsedAt": "2025-10-29T21:10:15.000Z"
  }
]
```

---

### 5. Deactivate Push Token

Deactivate a push token to stop receiving notifications.

**Endpoint:** `DELETE /api/users/push-token/:token`

**Example:** `DELETE /api/users/push-token/ExponentPushToken[xxx]`

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Split Bill Module

### 1. Create Split Bill

Create a new split bill and send notifications to all participants.

**Endpoint:** `POST /api/split-bills`

**Request Body:**
```json
{
  "creatorAddress": "0x1234567890123456789012345678901234567890",
  "totalAmount": "0.1",
  "currency": "ETH",
  "mode": "EQUAL",
  "participants": [
    {
      "address": "0xAABBCCDDEEFF00112233445566778899AABBCCDD",
      "amount": "0.05"
    },
    {
      "address": "0x1122334455667788990011223344556677889900",
      "amount": "0.05"
    }
  ],
  "message": "Pizza party 🍕",
  "emoji": "🍕",
  "shareableLink": "eternitywallet://pay-split-bill?..."
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| creatorAddress | string | Yes | Creator's wallet address |
| totalAmount | string | Yes | Total amount to split |
| currency | string | No | Default: ETH |
| mode | enum | Yes | EQUAL or CUSTOM |
| participants | array | Yes | Minimum 2 participants |
| message | string | No | Optional message |
| emoji | string | No | Optional emoji |
| shareableLink | string | No | Deep link for sharing |

**Response:** `201 Created`
```json
{
  "id": "d8abd7cd-69e7-4cdb-8696-3b16d1d8715f",
  "totalAmount": "0.100000000000000000",
  "currency": "ETH",
  "mode": "EQUAL",
  "participantsCount": 2,
  "status": "DRAFT",
  "message": "Pizza party 🍕",
  "emoji": "🍕",
  "participants": [
    {
      "id": "28e7f6ed-9c97-43a9-8b0e-f2178b51b934",
      "participantAddress": "0xaabbccddeeff00112233445566778899aabbccdd",
      "amount": "0.050000000000000000",
      "paid": false,
      "notificationSent": true
    }
  ],
  "creator": {
    "id": "8efa52be-aba3-4317-a0b3-a10f18a28b97",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data or amounts don't sum correctly
- `404 Not Found` - Creator not registered

---

### 2. Send Notifications

Manually resend notifications to split bill participants.

**Endpoint:** `POST /api/split-bills/:id/notify`

**Example:** `POST /api/split-bills/d8abd7cd-69e7-4cdb-8696-3b16d1d8715f/notify`

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Error Responses:**
- `404 Not Found` - Split bill not found

---

### 3. Mark Participant as Paid

Mark a participant as paid after transaction confirmation.

**Endpoint:** `PATCH /api/split-bills/participants/:participantId/mark-paid`

**Request Body:**
```json
{
  "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Side Effect:** Sends push notification to bill creator confirming payment received.

**Error Responses:**
- `404 Not Found` - Participant not found

---

## Scheduled Payment Module

### 1. Create Scheduled Payment

Create a new scheduled payment.

**Endpoint:** `POST /api/scheduled-payments`

**Request Body:**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "recipientAddress": "0xAABBCCDDEEFF00112233445566778899AABBCCDD",
  "amount": "0.5",
  "currency": "ETH",
  "message": "Monthly rent",
  "emoji": "🏠",
  "scheduledFor": "2025-10-30T10:00:00Z"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| walletAddress | string | Yes | User's wallet address |
| recipientAddress | string | Yes | Recipient's address |
| amount | string | Yes | Amount to send |
| currency | string | No | Default: ETH |
| scheduledFor | ISO 8601 | Yes | Future datetime |
| message | string | No | Optional message |
| emoji | string | No | Optional emoji |

**Response:** `201 Created`
```json
{
  "id": "6bebc674-45fb-4e44-9fb6-3f14f9faef2b",
  "recipientAddress": "0xaabbccddeeff00112233445566778899aabbccdd",
  "amount": "0.500000000000000000",
  "currency": "ETH",
  "message": "Monthly rent",
  "emoji": "🏠",
  "scheduledFor": "2025-10-30T10:00:00.000Z",
  "status": "PENDING",
  "createdAt": "2025-10-29T21:10:28.619Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data or past datetime
- `404 Not Found` - User not registered

---

### 2. Get User Scheduled Payments

Get all scheduled payments for a user.

**Endpoint:** `GET /api/scheduled-payments/:walletAddress`

**Example:** `GET /api/scheduled-payments/0x1234567890123456789012345678901234567890`

**Response:** `200 OK`
```json
[
  {
    "id": "6bebc674-45fb-4e44-9fb6-3f14f9faef2b",
    "recipientAddress": "0xaabbccddeeff00112233445566778899aabbccdd",
    "amount": "0.500000000000000000",
    "currency": "ETH",
    "scheduledFor": "2025-10-30T10:00:00.000Z",
    "status": "PENDING",
    "message": "Monthly rent",
    "emoji": "🏠"
  }
]
```

**Response:** `200 OK` (empty array if user not found)
```json
[]
```

---

### 3. Cancel Scheduled Payment

Cancel a pending scheduled payment.

**Endpoint:** `DELETE /api/scheduled-payments/:paymentId`

**Request Body:**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Error Responses:**
- `404 Not Found` - Payment not found or unauthorized
- `400 Bad Request` - Can only cancel PENDING payments

---

### 4. Mark Payment as Completed

Mark a scheduled payment as completed after execution.

**Endpoint:** `PATCH /api/scheduled-payments/:paymentId/complete`

**Request Body:**
```json
{
  "transactionHash": "0xabcdef1234567890..."
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### 5. Mark Payment as Failed

Mark a scheduled payment as failed with error message.

**Endpoint:** `PATCH /api/scheduled-payments/:paymentId/fail`

**Request Body:**
```json
{
  "errorMessage": "Insufficient funds"
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST creating resource |
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

---

## Rate Limiting

**Current:** 100 requests per minute per IP address

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1698624000
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Best Practices

### 1. Wallet Address Format
- Always use lowercase: `0xaabbccdd...`
- Include `0x` prefix
- Exactly 42 characters total

### 2. Amount Format
- Use string type for amounts: `"0.5"` not `0.5`
- Supports up to 18 decimal places
- Backend stores as `NUMERIC(30,18)`

### 3. Datetime Format
- Use ISO 8601: `2025-10-30T10:00:00Z`
- Always include timezone (UTC recommended)
- Backend stores as `TIMESTAMPTZ`

### 4. Push Token Validation
- Format: `ExponentPushToken[xxxxxxxxxxxxxx]`
- Re-register on app reinstall
- Deactivate old tokens when no longer needed

---

## Testing Examples

### cURL Examples

**Register User:**
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890"}'
```

**Create Split Bill:**
```bash
curl -X POST http://localhost:3000/api/split-bills \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x1234567890123456789012345678901234567890",
    "totalAmount": "0.1",
    "mode": "EQUAL",
    "participants": [
      {"address": "0xAABB...", "amount": "0.05"},
      {"address": "0x1122...", "amount": "0.05"}
    ]
  }'
```

---

**Last Updated:** 2025-10-29
**API Version:** 1.0
