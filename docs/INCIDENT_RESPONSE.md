# Incident Response Plan

## Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 - Critical | Service completely down | 15 minutes | Database unreachable, app won't start |
| P2 - High | Major feature broken | 1 hour | Login not working, timesheets can't save |
| P3 - Medium | Feature degraded | 4 hours | Slow performance, export failing |
| P4 - Low | Minor issue | 24 hours | UI bug, typo |

---

## Response Procedures

### P1 - Critical Incident

1. **Acknowledge** (within 15 min)
   - Check health endpoint: `GET /api/health`
   - Check error logs

2. **Assess**
   - Database connectivity?
   - Application running?
   - DNS/SSL issues?

3. **Communicate**
   - Post status update
   - Notify stakeholders

4. **Resolve**
   - Apply fix or rollback
   - Verify health check passes
   - Monitor for 30 minutes

5. **Post-mortem**
   - Document timeline
   - Root cause analysis
   - Prevention measures

### Quick Diagnosis Commands

```bash
# Check if app is responding
curl -I https://your-domain.com/api/health

# Check logs (Vercel)
vercel logs --follow

# Check logs (Docker)
docker compose logs -f app

# Check database connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Check memory usage
docker stats timesheet-app
```

---

## Rollback Procedures

### Vercel

```bash
# List deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Docker

```bash
# Rollback to previous image
docker compose down
docker tag timesheet:latest timesheet:broken
docker tag timesheet:previous timesheet:latest
docker compose up -d
```

### Database

```bash
# Restore from backup
mongorestore --uri="$MONGODB_URI" --drop /backups/YYYYMMDD
```

---

## Contact Information

| Role | Contact |
|------|---------|
| On-call Engineer | [Phone/Slack] |
| Team Lead | [Phone/Slack] |
| Infrastructure | [Phone/Slack] |

---

## Useful Links

- [Health Dashboard](/api/health)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [MongoDB Atlas](https://cloud.mongodb.com)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
