# 🚀 Production Deployment Checklist

**CRITICAL: Complete ALL items before enabling mainnet transactions**

## 📋 Pre-Deployment Checklist

### 1. Code Review & Testing

- [ ] **All tests passing**
  ```bash
  npm test
  npm run test:anvil
  npm run test:sepolia
  ```

- [ ] **Code review completed**
  - [ ] Security review by senior developer
  - [ ] Transaction logic reviewed
  - [ ] Error handling verified
  - [ ] No hardcoded private keys or secrets

- [ ] **Mainnet guard implemented**
  - [ ] `mainnet-guard.ts` integrated
  - [ ] Amount limits enforced
  - [ ] Confirmation dialogs implemented
  - [ ] Error messages user-friendly

### 2. Security Audit

- [ ] **Dependency audit passed**
  ```bash
  npm audit --audit-level=moderate
  npm run security:check
  ```

- [ ] **No known vulnerabilities**
  - [ ] Check `npm audit` output
  - [ ] Review dependency-check report
  - [ ] Update vulnerable packages

- [ ] **Private key security**
  - [ ] Keys stored in SecureStore/Keychain
  - [ ] No keys in logs or analytics
  - [ ] Biometric authentication enabled
  - [ ] Auto-lock implemented

- [ ] **Transaction security**
  - [ ] Address validation (checksum)
  - [ ] Amount validation (min/max)
  - [ ] Gas estimation with buffer
  - [ ] Nonce management tested

### 3. Configuration

- [ ] **Environment variables set**
  ```bash
  # In mobile/.env
  EXPO_PUBLIC_MAINNET_ENABLED=false  # Keep false until ready!
  EXPO_PUBLIC_MAINNET_MAX_AMOUNT=0.1
  EXPO_PUBLIC_MAINNET_REQUIRE_CONFIRMATION=true
  ```

- [ ] **RPC endpoints configured**
  - [ ] Primary RPC (Alchemy/Infura)
  - [ ] Fallback RPC (public node)
  - [ ] Rate limits understood
  - [ ] API keys secured

- [ ] **Network settings verified**
  - [ ] Default network: sepolia (for testing)
  - [ ] Mainnet available but disabled
  - [ ] Network switching tested

### 4. User Experience

- [ ] **Clear warnings implemented**
  - [ ] Mainnet transaction warning dialog
  - [ ] Amount confirmation
  - [ ] Recipient address confirmation
  - [ ] Gas fee display

- [ ] **Error handling**
  - [ ] User-friendly error messages
  - [ ] Localization (RU/EN)
  - [ ] Recovery instructions
  - [ ] Support contact info

- [ ] **Transaction feedback**
  - [ ] Pending state indicator
  - [ ] Confirmation count display
  - [ ] Success/failure notifications
  - [ ] Transaction history

### 5. Monitoring & Logging

- [ ] **Analytics configured**
  - [ ] Transaction success/failure tracking
  - [ ] Error logging (sanitized)
  - [ ] User flow tracking
  - [ ] Performance metrics

- [ ] **Alerting setup**
  - [ ] Failed transaction alerts
  - [ ] High gas price alerts
  - [ ] Unusual activity detection
  - [ ] Error rate monitoring

### 6. Documentation

- [ ] **User documentation**
  - [ ] How to send transactions
  - [ ] How to verify addresses
  - [ ] Gas fee explanation
  - [ ] Troubleshooting guide

- [ ] **Developer documentation**
  - [ ] Architecture overview
  - [ ] API documentation
  - [ ] Deployment process
  - [ ] Rollback procedure

### 7. Backup & Recovery

- [ ] **Backup tested**
  - [ ] Seed phrase backup flow
  - [ ] Private key export (if supported)
  - [ ] Wallet restoration tested
  - [ ] Multi-device sync (if supported)

- [ ] **Recovery plan**
  - [ ] Lost device procedure
  - [ ] Forgotten password recovery
  - [ ] Support escalation path
  - [ ] Emergency contacts

## 🔥 Mainnet Smoke Test

**ONLY proceed after completing ALL items above**

### Prerequisites

- [ ] All checklist items above completed
- [ ] Test wallet with ~0.002 ETH
- [ ] Mainnet RPC access verified
- [ ] Team notified of smoke test

### Smoke Test Procedure

1. **Enable Mainnet (Temporarily)**
   ```bash
   # In mobile/.env
   EXPO_PUBLIC_MAINNET_ENABLED=true
   ```

2. **Run Smoke Test**
   ```bash
   cd mobile
   npm run mainnet:smoke
   ```

3. **Verify Results**
   - [ ] Transaction sent successfully
   - [ ] 2+ confirmations received
   - [ ] Funds returned (minus gas)
   - [ ] No errors or warnings
   - [ ] Transaction visible on Etherscan

4. **Document Results**
   - [ ] Transaction hash recorded
   - [ ] Gas cost documented
   - [ ] Screenshots saved
   - [ ] Team notified

### Smoke Test Checklist

- [ ] **Before smoke test**
  - [ ] Backup test wallet seed phrase
  - [ ] Verify test wallet has ~0.002 ETH
  - [ ] Check current gas prices (use low traffic time)
  - [ ] Notify team of test

- [ ] **During smoke test**
  - [ ] Follow script prompts carefully
  - [ ] Verify all transaction details
  - [ ] Confirm checklist completion
  - [ ] Monitor transaction on Etherscan

- [ ] **After smoke test**
  - [ ] Transaction confirmed (2+ blocks)
  - [ ] Funds returned to sender
  - [ ] No errors in logs
  - [ ] Results documented

## ✅ Final Approval

### Sign-off Required

- [ ] **Technical Lead**
  - Name: _______________
  - Date: _______________
  - Signature: _______________

- [ ] **Security Lead**
  - Name: _______________
  - Date: _______________
  - Signature: _______________

- [ ] **Product Owner**
  - Name: _______________
  - Date: _______________
  - Signature: _______________

### Deployment Authorization

- [ ] **All checklist items completed**
- [ ] **Smoke test passed**
- [ ] **All sign-offs received**
- [ ] **Rollback plan documented**
- [ ] **Support team briefed**

## 🚀 Deployment Steps

**ONLY proceed after ALL approvals**

### 1. Enable Mainnet

```bash
# In mobile/.env
EXPO_PUBLIC_MAINNET_ENABLED=true
EXPO_PUBLIC_MAINNET_MAX_AMOUNT=0.1  # Adjust as needed
EXPO_PUBLIC_MAINNET_REQUIRE_CONFIRMATION=true
```

### 2. Build Production

```bash
npm run build:prod
```

### 3. Deploy

```bash
# Follow your deployment process
npm run submit:prod
```

### 4. Monitor

- [ ] Monitor error rates
- [ ] Check transaction success rates
- [ ] Review user feedback
- [ ] Watch gas costs

### 5. Post-Deployment

- [ ] Announce to users
- [ ] Update documentation
- [ ] Monitor for 24 hours
- [ ] Collect feedback

## 🔄 Rollback Plan

If issues occur:

1. **Immediate Actions**
   ```bash
   # Disable mainnet
   EXPO_PUBLIC_MAINNET_ENABLED=false
   
   # Deploy hotfix
   npm run build:prod
   npm run submit:prod
   ```

2. **Communication**
   - [ ] Notify users
   - [ ] Update status page
   - [ ] Contact support team

3. **Investigation**
   - [ ] Review error logs
   - [ ] Analyze failed transactions
   - [ ] Identify root cause
   - [ ] Document findings

4. **Resolution**
   - [ ] Fix identified issues
   - [ ] Re-run smoke test
   - [ ] Re-deploy if safe

## 📊 Success Metrics

Monitor these metrics post-deployment:

- **Transaction Success Rate**: > 99%
- **Average Confirmation Time**: < 2 minutes
- **Error Rate**: < 1%
- **User Satisfaction**: > 4.5/5
- **Support Tickets**: < 10/day

## 📝 Notes

Use this section for deployment-specific notes:

```
Date: _______________
Deployer: _______________
Version: _______________

Notes:
_____________________________________
_____________________________________
_____________________________________
_____________________________________
```

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER enable mainnet without completing this checklist**
2. **ALWAYS run smoke test before production**
3. **ALWAYS have rollback plan ready**
4. **ALWAYS monitor after deployment**
5. **ALWAYS document everything**

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
**Status:** ✅ Ready for Use
