# Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Options](#deployment-options)
- [SSL/TLS Configuration](#ssltls-configuration)
- [CDN Setup](#cdn-setup)
- [Database Configuration](#database-configuration)
- [Monitoring](#monitoring)
- [Backup Strategy](#backup-strategy)

---

## Prerequisites

- Node.js 22+
- MongoDB 7+ (replica set recommended for production)
- Docker (optional, for containerized deployment)

---

## Environment Variables

Create a `.env.production` file:

```bash
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/timesheet?retryWrites=true&w=majority
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-domain.com

# OAuth (optional)
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
AUTH_GITHUB_ID=<github-client-id>
AUTH_GITHUB_SECRET=<github-client-secret>

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

### Generating AUTH_SECRET

```bash
openssl rand -base64 32
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

```bash
# Manual deploy
npm install -g vercel
vercel --prod
```

### Option 2: Docker

```bash
# Build and run
docker compose up -d

# Or manually
docker build -t timesheet .
docker run -p 3000:3000 --env-file .env.production timesheet
```

### Option 3: Traditional VPS

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "timesheet" -- start
pm2 save
pm2 startup
```

---

## SSL/TLS Configuration

### Using Cloudflare (Recommended)

1. Add domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

### Using Let's Encrypt with Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security headers (additional to Next.js)
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Generate certificates:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## CDN Setup

### Cloudflare CDN

1. **Caching Rules**:
   - Cache static assets: `/_next/static/*`
   - Bypass cache: `/api/*`

2. **Page Rules**:
   ```
   *your-domain.com/_next/static/*
   Cache Level: Cache Everything
   Edge Cache TTL: 1 month
   ```

3. **Recommended Settings**:
   - Auto Minify: JavaScript, CSS, HTML
   - Brotli: On
   - HTTP/3: On

### Vercel Edge Network

Automatic when deployed to Vercel. Static assets served from edge locations globally.

---

## Database Configuration

### MongoDB Atlas (Recommended)

1. Create M10+ cluster for production
2. Enable replica set (automatic on Atlas)
3. Configure IP whitelist or use VPC peering
4. Enable backups (daily snapshots)

### Connection String Options

```
mongodb+srv://user:pass@cluster.mongodb.net/timesheet?
  retryWrites=true&
  w=majority&
  maxPoolSize=50&
  readPreference=secondaryPreferred
```

### Indexes

Indexes are created automatically via `scripts/mongo-init.js`. Verify with:

```javascript
db.users.getIndexes()
db.timesheets.getIndexes()
```

---

## Monitoring

### Health Check

```bash
# Check application health
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": { "status": "connected", "latency": 5 },
    "memory": { "percentage": 45 }
  }
}
```

### Recommended Tools

1. **Uptime Monitoring**: UptimeRobot, Pingdom
2. **Error Tracking**: Sentry
3. **APM**: DataDog, New Relic
4. **Log Aggregation**: Logtail, Papertrail

### Alert Configuration

Set alerts for:
- Health check failures
- Response time > 2s
- Error rate > 1%
- Memory usage > 90%
- Database connection failures

---

## Backup Strategy

### Database Backups

**MongoDB Atlas**:
- Continuous backups with point-in-time recovery
- Daily snapshots retained for 7 days

**Self-hosted**:
```bash
# Daily backup script
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Compress
tar -czvf /backups/backup-$(date +%Y%m%d).tar.gz /backups/$(date +%Y%m%d)

# Upload to S3
aws s3 cp /backups/backup-$(date +%Y%m%d).tar.gz s3://your-bucket/backups/
```

### Application Backups

- Code: Git repository (GitHub/GitLab)
- Environment: Store encrypted in password manager
- Uploads: If any, sync to S3/Cloud Storage

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 24 hours

Recovery steps:
1. Restore database from latest backup
2. Deploy application from main branch
3. Verify health check
4. Update DNS if needed

---

## Checklist Before Go-Live

- [ ] Environment variables set correctly
- [ ] AUTH_SECRET is unique and secure
- [ ] SSL certificate configured
- [ ] Database indexes created
- [ ] Backups configured and tested
- [ ] Monitoring and alerts set up
- [ ] Health check endpoint responding
- [ ] Rate limiting tested
- [ ] Error pages working (404, 500)
- [ ] OAuth providers configured (if used)
- [ ] DNS propagated
