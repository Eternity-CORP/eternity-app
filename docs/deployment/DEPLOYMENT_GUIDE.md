# Deployment Guide
# Eternity Wallet - Production Deployment

**Version:** 1.0
**Last Updated:** 2025-10-29

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Backend Deployment](#2-backend-deployment)
3. [Database Setup](#3-database-setup)
4. [Mobile App Deployment](#4-mobile-app-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Monitoring & Maintenance](#6-monitoring--maintenance)
7. [Rollback Procedures](#7-rollback-procedures)

---

## 1. Pre-Deployment Checklist

### Security Audit
- [ ] Complete security audit of backend code
- [ ] Penetration testing completed
- [ ] Dependency vulnerability scan passed
- [ ] Private key handling reviewed
- [ ] API authentication implemented (JWT)

### Code Quality
- [ ] All tests passing (70%+ coverage)
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Logging configured properly
- [ ] Code review completed

### Configuration
- [ ] Production environment variables set
- [ ] Database connection strings secured
- [ ] API keys rotated for production
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled

### Documentation
- [ ] API documentation up-to-date
- [ ] Deployment procedures documented
- [ ] Rollback plan prepared
- [ ] Monitoring dashboards configured
- [ ] Incident response plan ready

---

## 2. Backend Deployment

### 2.1 Docker Deployment (Recommended)

**Create Dockerfile:**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
```

**Build and Run:**
```bash
# Build image
docker build -t eternity-wallet-backend:1.0 .

# Run container
docker run -d \
  --name eternity-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NODE_ENV="production" \
  eternity-wallet-backend:1.0
```

### 2.2 AWS Deployment

**Using AWS Elastic Beanstalk:**

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize EB:**
```bash
cd backend
eb init -p docker eternity-wallet-backend
```

3. **Create Environment:**
```bash
eb create eternity-production \
  --database.engine postgres \
  --database.size db.t3.micro \
  --envvars DATABASE_URL=...,NODE_ENV=production
```

4. **Deploy:**
```bash
eb deploy
```

**Using AWS ECS (Fargate):**

1. **Create ECR Repository:**
```bash
aws ecr create-repository --repository-name eternity-wallet-backend
```

2. **Build and Push:**
```bash
$(aws ecr get-login --no-include-email)
docker build -t eternity-wallet-backend .
docker tag eternity-wallet-backend:latest \
  <account-id>.dkr.ecr.<region>.amazonaws.com/eternity-wallet-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/eternity-wallet-backend:latest
```

3. **Create ECS Task Definition:**
```json
{
  "family": "eternity-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.<region>.amazonaws.com/eternity-wallet-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ]
    }
  ]
}
```

### 2.3 DigitalOcean Deployment

**Using App Platform:**

1. **Create `app.yaml`:**
```yaml
name: eternity-wallet-backend
services:
- name: api
  github:
    repo: your-org/eternity-wallet
    branch: main
    deploy_on_push: true
  build_command: npm run build
  run_command: npm run start:prod
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  http_port: 3000
  instance_count: 2
  instance_size_slug: basic-xxs

databases:
- name: db
  engine: PG
  version: "14"
  size: db-s-1vcpu-1gb
```

2. **Deploy:**
```bash
doctl apps create --spec app.yaml
```

### 2.4 Environment Variables (Production)

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/eternity_wallet
DATABASE_SSL=true
DATABASE_POOL_SIZE=20

# Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRATION=24h

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=error

# External Services
EXPO_ACCESS_TOKEN=<your-expo-token>
ALCHEMY_API_KEY=<your-alchemy-key>
```

---

## 3. Database Setup

### 3.1 Production Database (AWS RDS)

**Create PostgreSQL Instance:**
```bash
aws rds create-db-instance \
  --db-instance-identifier eternity-wallet-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible false
```

### 3.2 Run Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://admin:password@db.amazonaws.com:5432/eternity_wallet"

# Run migrations
npm run migration:run

# Verify
psql $DATABASE_URL -c "\dt"
```

### 3.3 Database Backup Strategy

**Automated Backups:**
- AWS RDS: 7-day retention
- Daily snapshots at 3 AM UTC
- Cross-region replication enabled

**Manual Backup:**
```bash
# Backup database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://eternity-backups/
```

### 3.4 Database Monitoring

**Key Metrics:**
- Connection count
- Query latency (P50, P95, P99)
- Slow queries (> 1 second)
- Database size growth
- CPU/Memory usage

**Alerts:**
- Connection pool exhaustion
- Disk space < 20%
- Replication lag > 5 minutes
- Failed queries > 1%

---

## 4. Mobile App Deployment

### 4.1 iOS Deployment

**Prerequisites:**
- Apple Developer Account ($99/year)
- Xcode installed
- Certificates and Provisioning Profiles

**Build for App Store:**
```bash
cd mobile

# Update app.json
# Set version, bundleIdentifier

# Build
eas build --platform ios --profile production

# Submit
eas submit --platform ios
```

**App Store Configuration:**
- Screenshots (6.5", 5.5" displays)
- App description and keywords
- Privacy policy URL
- Support URL
- Age rating

### 4.2 Android Deployment

**Prerequisites:**
- Google Play Developer Account ($25 one-time)
- Android Studio installed
- Keystore file

**Build for Play Store:**
```bash
cd mobile

# Update app.json
# Set version, package name

# Build
eas build --platform android --profile production

# Submit
eas submit --platform android
```

**Play Store Configuration:**
- Screenshots (Phone, 7" Tablet, 10" Tablet)
- Feature graphic (1024x500)
- App description
- Privacy policy
- Content rating questionnaire

### 4.3 Over-The-Air (OTA) Updates

**Configure EAS Update:**
```json
// app.json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/<your-project-id>"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

**Publish Update:**
```bash
eas update --branch production --message "Bug fixes and improvements"
```

**Rollback Update:**
```bash
eas update:republish --branch production --group <previous-group-id>
```

---

## 5. Environment Configuration

### 5.1 Backend Environment

**Production .env:**
```bash
# Never commit this file
# Use secret management service

NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...
DATABASE_SSL=true

# Security
JWT_SECRET=<secret>
CORS_ORIGIN=https://app.eternitywallet.com

# Services
EXPO_ACCESS_TOKEN=<token>
ALCHEMY_API_KEY=<key>

# Monitoring
SENTRY_DSN=<dsn>
```

### 5.2 Mobile Environment

**production.ts:**
```typescript
export const config = {
  apiUrl: 'https://api.eternitywallet.com',
  alchemyApiKey: process.env.ALCHEMY_API_KEY,
  transakApiKey: process.env.TRANSAK_API_KEY,
  environment: 'production',
  logLevel: 'error',
};
```

### 5.3 Secret Management

**AWS Secrets Manager:**
```bash
# Store secret
aws secretsmanager create-secret \
  --name eternity/production/database-url \
  --secret-string "postgresql://..."

# Retrieve in app
const secret = await secretsManager.getSecretValue({
  SecretId: 'eternity/production/database-url'
}).promise();
```

---

## 6. Monitoring & Maintenance

### 6.1 Application Monitoring

**Sentry Integration:**
```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Key Metrics to Monitor:**
- API response times
- Error rates by endpoint
- Database query performance
- Memory/CPU usage
- Request throughput

### 6.2 Logging

**Winston Configuration:**
```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

WinstonModule.forRoot({
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'combined.log',
    }),
  ],
});
```

### 6.3 Alerting

**CloudWatch Alarms:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name eternity-api-errors \
  --alarm-description "API error rate high" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### 6.4 Maintenance Windows

**Scheduled Maintenance:**
- Weekly: Database optimization (vacuum, analyze)
- Monthly: Dependency updates
- Quarterly: Security patches

**Zero-Downtime Deployment:**
```bash
# Blue-Green deployment
# 1. Deploy new version to "green" environment
# 2. Run health checks
# 3. Switch traffic to "green"
# 4. Keep "blue" for rollback
```

---

## 7. Rollback Procedures

### 7.1 Backend Rollback

**Docker:**
```bash
# Stop current
docker stop eternity-backend

# Start previous version
docker run -d --name eternity-backend \
  eternity-wallet-backend:0.9
```

**ECS:**
```bash
# Update service to previous task definition
aws ecs update-service \
  --cluster eternity-cluster \
  --service eternity-backend \
  --task-definition eternity-backend:5
```

### 7.2 Database Rollback

**Revert Migration:**
```bash
npm run migration:revert
```

**Restore from Backup:**
```bash
# Download backup
aws s3 cp s3://eternity-backups/backup-20251028.sql .

# Restore
psql $DATABASE_URL < backup-20251028.sql
```

### 7.3 Mobile App Rollback

**EAS Update Rollback:**
```bash
eas update:republish --branch production --group <previous-id>
```

**App Store Rollback:**
- Not possible instantly
- Submit new version with fixes
- Typical approval: 24-48 hours

---

## 8. Production Checklist

### Pre-Launch
- [ ] Load testing completed (1000 concurrent users)
- [ ] Disaster recovery plan tested
- [ ] Monitoring dashboards configured
- [ ] On-call rotation scheduled
- [ ] Documentation finalized
- [ ] Privacy policy published
- [ ] Terms of service published

### Launch Day
- [ ] Final production deploy
- [ ] Smoke tests passed
- [ ] Monitoring active
- [ ] Team on standby
- [ ] Communication channels ready

### Post-Launch
- [ ] Monitor error rates (first 24 hours)
- [ ] Review performance metrics
- [ ] Collect user feedback
- [ ] Plan hot-fixes if needed
- [ ] Schedule retrospective

---

## 9. Performance Optimization

### Backend Optimization
- [ ] Enable database connection pooling
- [ ] Add Redis caching layer
- [ ] Optimize database indexes
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets

### Mobile Optimization
- [ ] Enable Hermes engine
- [ ] Minimize bundle size
- [ ] Lazy load screens
- [ ] Optimize images
- [ ] Cache API responses

---

## 10. Security Hardening

### Backend Security
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Enable SQL injection protection
- [ ] Set secure headers (Helmet.js)
- [ ] Implement CSRF protection

### Mobile Security
- [ ] Certificate pinning
- [ ] Obfuscate JavaScript
- [ ] Secure storage for keys
- [ ] Jailbreak/root detection
- [ ] Biometric authentication

---

**Last Updated:** 2025-10-29
**Version:** 1.0
**Status:** Ready for Production Deployment
