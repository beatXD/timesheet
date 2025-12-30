# API Documentation

## Overview

Base URL: `https://your-domain.com/api`

All endpoints require authentication unless noted otherwise.

## Authentication

Authentication uses NextAuth.js with JWT tokens stored in HTTP-only cookies.

### Login

```
POST /api/auth/callback/credentials
```

### Session

```
GET /api/auth/session
```

Returns current user session or null.

---

## Health Check

### Get Health Status

```
GET /api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "connected",
      "latency": 5
    },
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    }
  }
}
```

---

## Timesheets

### List Timesheets

```
GET /api/timesheets
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| month | number | Month (1-12) |
| year | number | Year (e.g., 2024) |

**Response**:
```json
{
  "data": [
    {
      "_id": "...",
      "userId": "...",
      "month": 1,
      "year": 2024,
      "status": "draft",
      "entries": [...]
    }
  ]
}
```

### Create/Update Timesheet

```
POST /api/timesheets
```

**Body**:
```json
{
  "month": 1,
  "year": 2024,
  "entries": [
    {
      "date": "2024-01-15",
      "type": "working",
      "hours": 8,
      "task": "Development work"
    }
  ]
}
```

### Get Timesheet by ID

```
GET /api/timesheets/:id
```

### Submit Timesheet

```
POST /api/timesheets/:id/submit
```

Changes status from `draft` to `submitted`.

### Approve Timesheet (Leader)

```
POST /api/timesheets/:id/approve
```

Changes status from `submitted` to `approved`.

### Reject Timesheet

```
POST /api/timesheets/:id/reject
```

**Body**:
```json
{
  "reason": "Please fix the hours for Jan 15"
}
```

### Export Timesheet

```
GET /api/timesheets/:id/export/pdf
GET /api/timesheets/:id/export/excel
```

---

## Leave Requests

### List Leave Requests

```
GET /api/leave-requests
```

### Create Leave Request

```
POST /api/leave-requests
```

**Body**:
```json
{
  "type": "annual",
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "reason": "Family vacation"
}
```

### Get Leave Request

```
GET /api/leave-requests/:id
```

### Update Leave Request

```
PATCH /api/leave-requests/:id
```

### Delete Leave Request

```
DELETE /api/leave-requests/:id
```

---

## Team Management (Leader/Admin)

### Get Team Members

```
GET /api/team/members
```

### Get Team Timesheets

```
GET /api/team/timesheets
```

### Get Team Statistics

```
GET /api/team/stats
```

### Submit Team Timesheets to Admin

```
POST /api/team/submit
```

---

## Admin Endpoints

### Users

```
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

### Teams

```
GET    /api/admin/teams
POST   /api/admin/teams
PATCH  /api/admin/teams/:id
DELETE /api/admin/teams/:id
```

### Projects

```
GET    /api/admin/projects
POST   /api/admin/projects
PATCH  /api/admin/projects/:id
DELETE /api/admin/projects/:id
```

### Vendors

```
GET    /api/admin/vendors
POST   /api/admin/vendors
PATCH  /api/admin/vendors/:id
DELETE /api/admin/vendors/:id
```

### Holidays

```
GET    /api/admin/holidays
POST   /api/admin/holidays
DELETE /api/admin/holidays/:id
```

### Audit Logs

```
GET /api/admin/audit-logs
```

### All Timesheets

```
GET /api/admin/timesheets/all
```

### Final Approve Timesheet

```
POST /api/admin/timesheets/approve
```

---

## Reports

### Summary Report

```
GET /api/reports/summary
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (YYYY-MM-DD) |
| endDate | string | End date (YYYY-MM-DD) |

### Team Report

```
GET /api/reports/team
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 requests / 15 minutes |
| Standard API | 100 requests / minute |
| Read operations | 200 requests / minute |
| Export/Reports | 10 requests / minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## Webhooks (Future)

Planned webhook events:
- `timesheet.submitted`
- `timesheet.approved`
- `leave_request.created`
- `leave_request.approved`
