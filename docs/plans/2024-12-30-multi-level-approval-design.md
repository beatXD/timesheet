# Multi-Level Timesheet Approval Workflow

## Overview
เปลี่ยน approval flow จาก User → Leader → Done เป็น User → Leader → Admin

## Status Flow

```
User: draft → submitted → approved → team_submitted → final_approved
         ↑        ↓                        ↓
         │   Leader reject          Admin reject
         └────────┴────────────────────────┘
                  (ทั้งคู่กลับไป draft)
```

### Status Types

| Status | คำอธิบาย | Action ต่อไป |
|--------|----------|-------------|
| `draft` | กำลังกรอก | User แก้ไข → submit |
| `submitted` | รอ Leader | Leader approve/reject |
| `approved` | Leader อนุมัติ | รอส่งทีมให้ Admin |
| `rejected` | ถูก reject (legacy) | - |
| `team_submitted` | รอ Admin | Admin approve/reject |
| `final_approved` | เสร็จสมบูรณ์ | Done |

### Rejection Flow
- **Leader reject**: เฉพาะคนนั้น → `draft`
- **Admin reject**: ทั้งทีม → ทุกคน `draft`

---

## Leader Features (หน้า /team)

### UI Layout
- Progress bar แสดง X/Y คน approved
- ตารางแสดงสมาชิกทีมและสถานะ
- ปุ่ม Approve/Reject สำหรับ `submitted`
- ปุ่ม "Submit Team to Admin" (เปิดใช้เมื่อทุกคน `approved`)

### Features
| Feature | คำอธิบาย |
|---------|----------|
| Progress bar | แสดง X/Y คน approved |
| Approve/Reject | ทำได้เฉพาะ `submitted` |
| Submit Team | เปิดใช้เมื่อทุกคน `approved` |
| Auto-submit | Option: ส่งอัตโนมัติเมื่อครบ |

---

## Admin Features (หน้า /admin/timesheets)

### UI Layout - Team List
- Filter by month/year และ team
- แสดง card ของแต่ละทีมที่มี status `team_submitted`
- ปุ่ม View Details, Approve All, Reject All

### UI Layout - Team Details
- ตารางแสดงสมาชิกทีม
- Checkbox สำหรับเลือกหลายคน
- ปุ่ม Approve Selected, Reject Selected

### Admin Actions
| Action | คำอธิบาย |
|--------|----------|
| Approve All | ทุกคนในทีม → `final_approved` |
| Approve Selected | เฉพาะที่เลือก → `final_approved` |
| Reject All | ทุกคนในทีม → `draft` |
| Reject Individual | คนนั้น → `draft` |

---

## Database Changes

### Update TimesheetStatus type
```typescript
// src/types/index.ts
export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "team_submitted"
  | "final_approved";
```

### Add fields to Timesheet schema
```typescript
// src/models/Timesheet.ts
{
  teamSubmittedAt?: Date,
  teamSubmittedBy?: ObjectId,
  finalApprovedAt?: Date,
  finalApprovedBy?: ObjectId,
}
```

---

## API Changes

### New Endpoints
| Endpoint | Method | ใครใช้ | คำอธิบาย |
|----------|--------|-------|----------|
| `/api/team/submit` | POST | Leader | ส่งทีมให้ Admin |
| `/api/admin/timesheets` | GET | Admin | ดู team_submitted ทั้งหมด |
| `/api/admin/timesheets/approve` | POST | Admin | Approve (bulk/individual) |
| `/api/admin/timesheets/reject` | POST | Admin | Reject (ทีม/individual) |

### Update Existing Endpoints
- `POST /api/timesheets/[id]/approve` - เปลี่ยน status เป็น `approved`
- `POST /api/timesheets/[id]/reject` - เปลี่ยน status เป็น `draft`

---

## Implementation Checklist

### Phase 1: Database & Types
- [ ] Update `TimesheetStatus` type
- [ ] Update Timesheet model with new fields
- [ ] Update status enum in schema

### Phase 2: API - Leader
- [ ] Update `/api/timesheets/[id]/approve`
- [ ] Update `/api/timesheets/[id]/reject`
- [ ] Create `/api/team/submit`
- [ ] Add auto-submit logic

### Phase 3: API - Admin
- [ ] Create `/api/admin/timesheets` (GET)
- [ ] Create `/api/admin/timesheets/approve` (POST)
- [ ] Create `/api/admin/timesheets/reject` (POST)

### Phase 4: UI - Leader
- [ ] Update `/team` page with progress bar
- [ ] Add "Submit Team to Admin" button
- [ ] Add auto-submit toggle

### Phase 5: UI - Admin
- [ ] Create `/admin/timesheets` page
- [ ] Add team list view
- [ ] Add team detail view with bulk actions

### Phase 6: Translations & Sidebar
- [ ] Add new translations (en.json, th.json)
- [ ] Add admin timesheets menu to sidebar

### Phase 7: Testing
- [ ] Test full flow: User → Leader → Admin
- [ ] Test rejection flows
- [ ] Test auto-submit feature
