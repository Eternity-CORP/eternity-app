# Eternity Wallet

**A privacy-first mobile cryptocurrency wallet with social payment features**

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg)]()

---

## 🚀 Quick Start

```bash
# Clone repository
git clone <repo-url>

# Start Backend
cd backend
npm install
npm run migration:run
npm run start:dev

# Start Mobile App
cd mobile
npm install
npx expo start
```

**Backend runs on:** http://localhost:3000

---

## 📚 Documentation

**Complete documentation is in the `/docs` folder:**

| Document | Description |
|----------|-------------|
| **[📖 Documentation Hub](./docs/README.md)** | Start here - Overview of all documentation |
| **[📋 SRS Document](./docs/SRS.md)** | Software Requirements Specification |
| **[🏗️ Architecture](./docs/ARCHITECTURE.md)** | System architecture and design |
| **[🔌 API Documentation](./docs/API_DOCUMENTATION.md)** | Complete API reference |
| **[🔐 Supply Chain Security](./docs/SUPPLY_CHAIN_SECURITY.md)** | CI/CD, artifact signing, SCA, SBOM |
| **[🚀 Security Quick Start](./docs/SECURITY_QUICKSTART.md)** | Quick guide to security tools |
| **[🛠️ Backend Guide](./backend/IMPLEMENTATION_GUIDE.md)** | Backend setup instructions |
| **[✅ System Status](./backend/SYSTEM_STATUS.md)** | Current system health |

---

## ✨ Features

### Core Wallet Features
- ✅ Create and import wallets
- ✅ Send/receive ETH and USDC
- ✅ Transaction history
- ✅ QR code receiving
- ✅ Secure key storage

### Social Payment Features
- ✅ **Split Bill** - Divide payments among friends
- ✅ **Scheduled Payments** - Set up future payments with reminders
- ✅ **Payment Requests** - Share via deep links
- ✅ **Push Notifications** - Real-time payment alerts

### Additional Features
- ✅ **Add Money** - Buy crypto via Transak
- ✅ **Swipe to Confirm** - Gesture-based transaction confirmation
- ✅ **Emoji Support** - Add personality to payments

---

## 🏗️ Project Structure

```
E-Y/
├── docs/               # 📚 Complete documentation
├── mobile/             # 📱 React Native + Expo app
├── backend/            # 🔧 NestJS API server
└── README.md          # You are here
```

---

## 🛠️ Technology Stack

**Mobile:** React Native (Expo SDK 54) + TypeScript
**Backend:** NestJS + TypeORM + PostgreSQL
**Blockchain:** ethers.js + Alchemy RPC
**Notifications:** Expo Push Notifications

---

## 🔐 Privacy & Security

**Privacy-First Design:**
- ✅ Only wallet addresses stored (public data)
- ❌ No names, emails, or phone numbers
- ❌ No private keys on server
- ❌ No personally identifiable information

**Security Measures:**
- Private keys in device secure storage
- HTTPS for all API calls
- Biometric/PIN protection
- Rate limiting on API

**Supply Chain Security:**
- ✅ Reproducible builds with deterministic artifacts
- ✅ Artifact signing with Cosign (Sigstore)
- ✅ Software Composition Analysis (SCA) with OWASP Dependency-Check
- ✅ SBOM generation (CycloneDX & SPDX)
- ✅ Automated vulnerability scanning
- ✅ Integrity guards and provenance attestations

📖 **[Supply Chain Security Documentation](./docs/SUPPLY_CHAIN_SECURITY.md)** | 🚀 **[Quick Start Guide](./docs/SECURITY_QUICKSTART.md)**

---

## 📊 System Status

**Current Status:** ✅ PRODUCTION READY

- Backend: Running on port 3000
- Database: 7 tables, migrations completed
- API: 13 endpoints active
- Workers: Cron job running every minute
- Tests: All endpoints verified

**Last Check:** 2025-10-29

See [System Status](./backend/SYSTEM_STATUS.md) for details.

---

## 🧪 Quick Test

Test the backend API:

```bash
# Register a user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890"}'

# Check health
curl http://localhost:3000/api/health
```

---

## 📝 API Endpoints

### User Module
- `POST /api/users/register`
- `POST /api/users/push-token`
- `GET /api/users/:walletAddress`

### Split Bill Module
- `POST /api/split-bills`
- `POST /api/split-bills/:id/notify`
- `PATCH /api/split-bills/participants/:participantId/mark-paid`

### Scheduled Payment Module
- `POST /api/scheduled-payments`
- `GET /api/scheduled-payments/:walletAddress`
- `DELETE /api/scheduled-payments/:paymentId`

**Full API docs:** [API Documentation](./docs/API_DOCUMENTATION.md)

---

## 🗺️ Roadmap

- ✅ Phase 1: Core wallet features
- ✅ Phase 2: Social payments (Split Bill, Scheduled)
- ✅ Phase 3: Backend API and notifications
- 🚧 Phase 4: Mobile app integration with backend
- 📅 Phase 5: NFT gallery, token swaps
- 🎯 Phase 6: Production deployment

---

## 🤝 Contributing

1. Read the [SRS Document](./docs/SRS.md)
2. Check [Architecture](./docs/ARCHITECTURE.md)
3. Follow code standards (TypeScript, ESLint, Prettier)
4. Write tests (70% coverage minimum)
5. Create pull request

---

## 📄 License

Copyright © 2025 Eternity Wallet Team

---

## 🔗 Links

- **[📚 Full Documentation](./docs/README.md)** - Start here for all docs
- **[🏗️ Architecture Guide](./docs/ARCHITECTURE.md)** - Technical design
- **[🔌 API Reference](./docs/API_DOCUMENTATION.md)** - Complete API docs

---

**Built with ❤️ using React Native, NestJS, and TypeScript**
