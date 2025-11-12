# 🚀 Mainnet Release Checklist: Scheduled Payments & Split Bills

Comprehensive checklist for safe mainnet rollout of scheduled payments and split bill features.

## 📋 Pre-Release Checklist

### Code Quality

- [ ] **All unit tests passing**
  ```bash
  npm test
  ```
  - [ ] Feature flag tests
  - [ ] Error mapper tests
  - [ ] Retry policy tests
  - [ ] Transaction tests

- [ ] **All integration tests passing**
  ```bash
  npm run test:sepolia
  ```
  - [ ] Schedule one-time tests
  - [ ] Schedule recurring tests
  - [ ] Split payment tests
  - [ ] Split collection tests

- [ ] **Code review completed**
  - [ ] At least 2 reviewers approved
  - [ ] Security review completed
  - [ ] No unresolved comments

- [ ] **Linting and formatting**
  ```bash
  npm run lint
  npm run format
  ```

### Security

- [ ] **Feature flags configured**
  - [ ] `SCHEDULE_MAINNET_ENABLED=false` (default)
  - [ ] `SPLIT_MAINNET_ENABLED=false` (default)
  - [ ] Kill-switch mechanism tested

- [ ] **Private key security**
  - [ ] Smoke test wallet created (dedicated)
  - [ ] Funded with minimal ETH only (< 0.01 ETH)
  - [ ] Never used for mainnet before
  - [ ] Private key stored securely

- [ ] **Smart contract audits** (if applicable)
  - [ ] Audit report reviewed
  - [ ] Critical issues resolved
  - [ ] Medium issues addressed or accepted

- [ ] **Rate limiting configured**
  - [ ] RPC rate limits set
  - [ ] Retry policies tested
  - [ ] Error handling verified

### Documentation

- [ ] **User documentation updated**
  - [ ] Feature descriptions
  - [ ] Usage instructions
  - [ ] Screenshots/videos
  - [ ] FAQ updated

- [ ] **Technical documentation**
  - [ ] Architecture documented
  - [ ] API documentation
  - [ ] Error codes documented
  - [ ] Troubleshooting guide

- [ ] **Release notes prepared**
  - [ ] Features listed
  - [ ] Known limitations
  - [ ] Breaking changes (if any)

## 🧪 Smoke Test Checklist

### Preparation

- [ ] **Environment configured**
  - [ ] `.env` file created from `.env.example`
  - [ ] `MAINNET_PRIVKEY` set (dedicated test wallet)
  - [ ] `SPLIT_RECIPIENT_1` and `SPLIT_RECIPIENT_2` set
  - [ ] `MAINNET_RPC_URL` configured

- [ ] **Wallet funded**
  - [ ] Test wallet has sufficient ETH
  - [ ] Balance checked: `cast balance ADDRESS --rpc-url https://eth.llamarpc.com`
  - [ ] Minimum 0.01 ETH recommended

- [ ] **Team notified**
  - [ ] Smoke test scheduled
  - [ ] Team members on standby
  - [ ] Communication channel ready

### Schedule Payment Smoke Test

Run: `npx ts-node scripts/mainnet/schedule-smoke.ts`

#### First Run

- [ ] **Execution**
  - [ ] Script started
  - [ ] Configuration validated
  - [ ] Connected to mainnet (chain ID 1)
  - [ ] Balance sufficient
  - [ ] Gas price reasonable (< 100 Gwei)
  - [ ] Manual confirmation provided (typed "YES")

- [ ] **Transaction**
  - [ ] Transaction sent successfully
  - [ ] Transaction hash logged: `_____________________`
  - [ ] Etherscan link: `https://etherscan.io/tx/_____________________`
  - [ ] Confirmed in 1-2 blocks
  - [ ] Status: Success (not reverted)

- [ ] **Verification**
  - [ ] Amount sent: 0.0001 ETH
  - [ ] Recipient: Own address (safe)
  - [ ] Gas cost logged: `_________` ETH
  - [ ] Total cost: `_________` ETH
  - [ ] Balance change verified

#### Second Run (Confirmation)

- [ ] **Execution**
  - [ ] Script started
  - [ ] All checks passed
  - [ ] Manual confirmation provided

- [ ] **Transaction**
  - [ ] Transaction sent successfully
  - [ ] Transaction hash logged: `_____________________`
  - [ ] Etherscan link: `https://etherscan.io/tx/_____________________`
  - [ ] Confirmed successfully

- [ ] **Verification**
  - [ ] Consistent behavior with first run
  - [ ] No errors or warnings
  - [ ] Gas cost within expected range

### Split Bill Smoke Test

Run: `npx ts-node scripts/mainnet/split-smoke.ts`

#### First Run

- [ ] **Execution**
  - [ ] Script started
  - [ ] Configuration validated
  - [ ] Both recipients validated
  - [ ] Connected to mainnet
  - [ ] Balance sufficient
  - [ ] Manual confirmation provided

- [ ] **Transactions**
  - [ ] Payment 1/2 sent successfully
    - [ ] TX hash: `_____________________`
    - [ ] Etherscan: `https://etherscan.io/tx/_____________________`
  - [ ] Payment 2/2 sent successfully
    - [ ] TX hash: `_____________________`
    - [ ] Etherscan: `https://etherscan.io/tx/_____________________`
  - [ ] Both confirmed in 1-2 blocks

- [ ] **Verification**
  - [ ] Amount per recipient: 0.00005 ETH
  - [ ] Total amount: 0.0001 ETH
  - [ ] Total gas cost: `_________` ETH
  - [ ] Both recipients received funds
  - [ ] No nonce conflicts

#### Second Run (Confirmation)

- [ ] **Execution**
  - [ ] Script started
  - [ ] All checks passed
  - [ ] Manual confirmation provided

- [ ] **Transactions**
  - [ ] Payment 1/2 sent successfully
    - [ ] TX hash: `_____________________`
  - [ ] Payment 2/2 sent successfully
    - [ ] TX hash: `_____________________`
  - [ ] Both confirmed successfully

- [ ] **Verification**
  - [ ] Consistent behavior with first run
  - [ ] No errors or warnings
  - [ ] Sequential payments working

## 🔧 Kill-Switch Test

### Test Feature Flags

- [ ] **Schedule flag test**
  ```bash
  # Set flag to false
  export SCHEDULE_MAINNET_ENABLED=false
  
  # Try to create scheduled payment on mainnet
  # Expected: Blocked with error message
  ```
  - [ ] UI shows disabled banner
  - [ ] Transaction blocked
  - [ ] Error message clear

- [ ] **Split flag test**
  ```bash
  # Set flag to false
  export SPLIT_MAINNET_ENABLED=false
  
  # Try to create split bill on mainnet
  # Expected: Blocked with error message
  ```
  - [ ] UI shows disabled banner
  - [ ] Transaction blocked
  - [ ] Error message clear

- [ ] **Testnet still works**
  - [ ] Schedule works on Sepolia
  - [ ] Split works on Sepolia
  - [ ] No impact from mainnet flags

### Kill-Switch Activation

- [ ] **Emergency disable procedure documented**
  - [ ] Steps to disable features
  - [ ] Responsible team members identified
  - [ ] Communication plan ready

- [ ] **Kill-switch tested**
  - [ ] Feature disabled via flag
  - [ ] UI updated immediately
  - [ ] No pending transactions affected
  - [ ] Re-enable tested

## 📊 Monitoring Setup

### Metrics

- [ ] **Transaction monitoring**
  - [ ] Success rate tracked
  - [ ] Gas costs monitored
  - [ ] Confirmation times logged
  - [ ] Error rates tracked

- [ ] **Alerting configured**
  - [ ] High gas price alerts
  - [ ] Transaction failure alerts
  - [ ] Rate limit alerts
  - [ ] Error spike alerts

### Logging

- [ ] **Transaction logs**
  - [ ] All TX hashes logged
  - [ ] Gas costs logged
  - [ ] Errors logged with context
  - [ ] User actions logged

- [ ] **Analytics**
  - [ ] Feature usage tracked
  - [ ] User adoption metrics
  - [ ] Performance metrics
  - [ ] Error analytics

## 🚀 Go-Live Checklist

### Final Verification

- [ ] **All smoke tests passed**
  - [ ] Schedule smoke test: 2/2 ✅
  - [ ] Split smoke test: 2/2 ✅
  - [ ] No errors or warnings
  - [ ] Gas costs acceptable

- [ ] **Kill-switch verified**
  - [ ] Disable tested
  - [ ] Enable tested
  - [ ] UI updates correctly
  - [ ] Emergency procedure ready

- [ ] **Team ready**
  - [ ] On-call engineer assigned
  - [ ] Communication channels active
  - [ ] Escalation path defined
  - [ ] Rollback plan ready

### Enable Features

- [ ] **Update feature flags**
  ```bash
  # In production environment
  SCHEDULE_MAINNET_ENABLED=true
  SPLIT_MAINNET_ENABLED=true
  ```

- [ ] **Deploy configuration**
  - [ ] Flags deployed to production
  - [ ] Deployment verified
  - [ ] No errors in logs
  - [ ] Features available in UI

- [ ] **Gradual rollout** (optional)
  - [ ] Enable for internal users first
  - [ ] Monitor for 24 hours
  - [ ] Enable for beta users
  - [ ] Monitor for 48 hours
  - [ ] Enable for all users

### Post-Launch Monitoring

- [ ] **First 24 hours**
  - [ ] Monitor transaction success rate
  - [ ] Check error logs hourly
  - [ ] Verify gas costs reasonable
  - [ ] User feedback collected

- [ ] **First week**
  - [ ] Daily metrics review
  - [ ] User support tickets reviewed
  - [ ] Performance optimization if needed
  - [ ] Documentation updates

- [ ] **First month**
  - [ ] Weekly metrics review
  - [ ] Feature adoption analysis
  - [ ] Cost analysis
  - [ ] Optimization opportunities

## 🔄 Rollback Plan

### Trigger Conditions

Rollback if:
- [ ] Transaction failure rate > 5%
- [ ] Gas costs exceed 2x expected
- [ ] Critical security issue discovered
- [ ] User funds at risk
- [ ] Excessive errors in logs

### Rollback Procedure

1. [ ] **Immediate disable**
   ```bash
   SCHEDULE_MAINNET_ENABLED=false
   SPLIT_MAINNET_ENABLED=false
   ```

2. [ ] **Notify team**
   - [ ] Post in incident channel
   - [ ] Tag on-call engineer
   - [ ] Update status page

3. [ ] **Investigate**
   - [ ] Review error logs
   - [ ] Check transaction history
   - [ ] Identify root cause
   - [ ] Document findings

4. [ ] **Fix and re-test**
   - [ ] Apply fix
   - [ ] Run smoke tests again
   - [ ] Verify fix on testnet
   - [ ] Get approval to re-enable

## ✅ Sign-Off

### Approvals Required

- [ ] **Engineering Lead**: _________________ Date: _______
- [ ] **Security Lead**: _________________ Date: _______
- [ ] **Product Manager**: _________________ Date: _______
- [ ] **QA Lead**: _________________ Date: _______

### Final Confirmation

I confirm that:
- All checklist items completed
- Smoke tests passed twice
- Kill-switch verified working
- Team ready for launch
- Rollback plan understood

**Release Engineer**: _________________ Date: _______

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-12  
**Next Review:** Before each mainnet feature release
