# System Improvements Design

## Overview
Comprehensive improvements to the timesheet system including leave balance tracking, validation, pagination, audit trails, notifications, and reporting.

---

## Phase 1: Leave Balance System

### Data Models

#### LeaveBalance
```typescript
interface LeaveBalance {
  _id: ObjectId;
  userId: ObjectId;
  year: number;
  quotas: {
    sick: { total: number; used: number; };
    personal: { total: number; used: number; };
    annual: { total: number; used: number; };
  };
  createdAt: Date;
  updatedAt: Date;
}
// Index: { userId: 1, year: 1 } unique
```

#### LeaveSettings
```typescript
interface LeaveSettings {
  _id: ObjectId;
  defaultQuotas: {
    sick: number;      // default: 30
    personal: number;  // default: 3
    annual: number;    // default: 6
  };
  resetMonth: number;  // 1 = January
  updatedBy: ObjectId;
  updatedAt: Date;
}
```

### API Endpoints
- `GET /api/leave-balance` - Get own balance
- `GET /api/leave-balance/[userId]` - Admin: get user's balance
- `POST /api/admin/leave-settings` - Admin: set default quotas
- `PUT /api/admin/leave-balance/[userId]` - Admin: adjust user quota

### Logic
1. On leave request submit → check balance, warn if insufficient
2. On leave approve → deduct balance
3. On leave reject/cancel → restore balance

---

## Phase 2: Timesheet Validation

### Validation Rules (Basic)
1. Hours >= 0 (no negative)
2. Date within timesheet month/year
3. Date not in future

### Integration
- Save draft: validate + show warnings
- Submit: validate + block on errors
- Approve: re-validate for safety

---

## Phase 3: Pagination

### Helper
```typescript
interface PaginationParams {
  page?: number;    // default: 1
  limit?: number;   // default: 20, max: 100
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Endpoints to Update
- `/api/admin/timesheets/all`
- `/api/leave-requests`
- `/api/admin/users`
- `/api/admin/leaves`

---

## Phase 4: Audit Trail

### AuditLog Model
```typescript
interface AuditLog {
  _id: ObjectId;
  entityType: "timesheet" | "leave_request";
  entityId: ObjectId;
  action: "submit" | "approve" | "reject" | "cancel";
  fromStatus: string;
  toStatus: string;
  performedBy: ObjectId;
  reason?: string;
  createdAt: Date;
}
// Index: { entityType: 1, entityId: 1 }
```

---

## Phase 5: Notifications

### Events
| Event | Recipient | Channel |
|-------|-----------|---------|
| Leave submitted | Leader | Email |
| Leave approved/rejected | User | Email |
| Timesheet submitted | Leader | Email |
| Timesheet approved | User | Email |

---

## Phase 6: Input Validation (Zod)

### Schemas
- timesheetEntrySchema
- leaveRequestSchema
- userSchema

---

## Phase 7: Reports

### Available Reports
- Attendance Summary (monthly)
- Leave Usage by type
- Overtime Summary by team/user

### UI
- Admin page: `/admin/reports`
- Export: CSV

---

## Files to Create/Modify

### New Files
- `src/models/LeaveBalance.ts`
- `src/models/LeaveSettings.ts`
- `src/models/AuditLog.ts`
- `src/lib/validation/timesheet.ts`
- `src/lib/validation/leave.ts`
- `src/lib/validation/schemas.ts`
- `src/lib/pagination.ts`
- `src/lib/notifications.ts`
- `src/app/api/leave-balance/route.ts`
- `src/app/api/leave-balance/[userId]/route.ts`
- `src/app/api/admin/leave-settings/route.ts`
- `src/app/api/admin/leave-balance/[userId]/route.ts`
- `src/app/api/audit/[entityType]/[entityId]/route.ts`
- `src/app/(dashboard)/admin/leave-settings/page.tsx`
- `src/app/(dashboard)/admin/reports/page.tsx`

### Modified Files
- `src/app/api/leave-requests/route.ts` - Add balance check
- `src/app/api/leave-requests/[id]/route.ts` - Add balance update
- `src/app/api/timesheets/route.ts` - Add validation
- `src/app/api/timesheets/[id]/submit/route.ts` - Add validation
- `src/app/api/admin/timesheets/all/route.ts` - Add pagination
- `src/app/api/admin/users/route.ts` - Add pagination
- `src/app/api/admin/leaves/route.ts` - Add pagination
- `src/components/Sidebar.tsx` - Add new menu items
- `messages/en.json` - Add translations
- `messages/th.json` - Add translations
