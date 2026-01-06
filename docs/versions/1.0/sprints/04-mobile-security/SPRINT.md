# Sprint 04: Mobile Security

**Sprint ID:** SPRINT-04
**Status:** ✅ 80% Done
**Priority:** HIGH
**Duration:** 1 week

---

## Goal

Implement biometric and PIN authentication with secure transaction approval.

## Stories

| ID | Title | Status | Estimate |
|----|-------|--------|----------|
| [Story-4.1](./stories/Story-4.1-auth-app-launch.md) | Auth on app launch | ✅ Done | 4h |
| [Story-4.2](./stories/Story-4.2-auth-transaction.md) | Auth for transactions | ⏳ Pending | 4h |
| [Story-4.3](./stories/Story-4.3-auth-seed-phrase.md) | Auth for seed phrase view | ✅ Done | 2h |
| [Story-4.4](./stories/Story-4.4-security-settings.md) | Security settings screen | ✅ Done | 4h |
| [Story-4.5](./stories/Story-4.5-pin-lockout.md) | PIN lockout mechanism | ✅ Done | 3h |
| [Story-4.6](./stories/Story-4.6-seed-recovery.md) | Seed phrase recovery | ✅ Done | 4h |

## Definition of Done

- [x] Biometric auth on app launch
- [x] PIN fallback when biometric unavailable
- [x] Seed phrase protected by auth
- [x] Security settings configurable
- [x] PIN lockout after failed attempts
- [ ] Transaction auth integrated

## Security Features

- FaceID/TouchID via `expo-local-authentication`
- Secure storage via `expo-secure-store`
- PIN hashing with salt
- 5 failed attempts → 5 minute lockout
