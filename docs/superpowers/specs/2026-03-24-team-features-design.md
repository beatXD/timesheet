# Team Features Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Scope:** 3 features — Comment/Feedback, Activity Log, Team Dashboard & Insights

---

## Context

Timesheet project ใช้ภายในองค์กร ยังอยู่ในช่วงพัฒนา ต้องการเพิ่ม feature สำหรับทีม เพื่อให้ admin (team leader) บริหารทีมได้ดีขึ้น และเพิ่มการสื่อสารระหว่าง admin กับ member

**Role mapping:** ในระบบจริง role คือ `super_admin | admin | user` — spec นี้ใช้ "admin" แทน team leader, "user" แทน member

**Timesheet statuses ในระบบ:** `draft | submitted | approved | rejected`

---

## Feature 1: Comment/Feedback บน Timesheet

### Problem

Approval flow ปัจจุบัน admin ทำได้แค่ approve หรือ reject ไม่มีทางสื่อสารกับ user โดยตรง ถ้ามีปัญหาเล็กน้อยต้อง reject ทั้งฉบับ

### Design

**Data Model — Embedded ใน Timesheet document:**

```typescript
interface TimesheetComment {
  _id: ObjectId
  userId: ObjectId        // ใครเขียน
  message: string         // ข้อความ (max 500 chars)
  entryDate?: number      // วันที่ของ entry (1-31), ถ้ามี = comment เจาะจง entry วันนั้น, ถ้าไม่มี = comment ภาพรวม
  createdAt: Date
}
```

เพิ่ม field `comments: TimesheetComment[]` ใน Timesheet model (max 100 comments per timesheet)

> **Note:** ใช้ `entryDate` (วันที่) แทน `entryIndex` เพราะ entry อาจถูกเพิ่ม/ลบ/สลับลำดับ แต่วันที่เป็น identifier ที่เสถียร

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/timesheets/[id]/comments` | เพิ่ม comment |
| DELETE | `/api/timesheets/[id]/comments/[commentId]` | ลบ comment (เจ้าของเท่านั้น) |

**Input Validation (Zod):**

```typescript
const commentSchema = z.object({
  message: z.string().min(1).max(500),
  entryDate: z.number().int().min(1).max(31).optional(),
})
```

**Concurrency:** ใช้ `findOneAndUpdate` กับ `$push` เพื่อ atomic update หลีกเลี่ยง version conflict กับการแก้ไข entry พร้อมกัน

**UI:**

- Timesheet detail page: ช่อง comment ด้านล่าง + ปุ่ม comment icon ข้างแต่ละ entry
- Comment แสดงเป็น flat list เรียงตามเวลา
- Entry-level comment แสดง badge count บน entry นั้น
- Comment ใหม่ trigger notification ให้อีกฝ่าย

**Constraints:**

- Text only (ไม่มี attachment)
- Flat list ไม่มี thread/reply ซ้อน
- ลบได้เฉพาะเจ้าของ comment
- เฉพาะ Timesheet เท่านั้น (ไม่รวม PersonalTimesheet เพราะไม่มี approval flow)
- Max 100 comments per timesheet

---

## Feature 2: Activity Log

### Problem

ไม่มีประวัติการกระทำในระบบ ตรวจสอบย้อนหลังไม่ได้ว่าใครทำอะไรเมื่อไหร่

### Design

**Data Model — Collection ใหม่ `activitylogs`:**

```typescript
type ActivityAction =
  | "timesheet_created"
  | "timesheet_updated"
  | "timesheet_submitted"
  | "timesheet_approved"
  | "timesheet_rejected"
  | "comment_added"
  | "comment_deleted"
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "member_added"
  | "member_removed"

type ActivityTargetType = "timesheet" | "leave_request" | "team"

interface ActivityLog {
  _id: ObjectId
  userId: ObjectId              // ใครทำ
  action: ActivityAction        // ทำอะไร
  targetType: ActivityTargetType // กระทำกับอะไร
  targetId: ObjectId            // ID ของสิ่งที่ถูกกระทำ
  metadata: Record<string, any> // ข้อมูลเพิ่มเติม เช่น { month, year, reason }
  teamId?: ObjectId             // ทีมที่เกี่ยวข้อง
  createdAt: Date               // TTL index 1 ปี (ปรับได้ตาม policy)
}
```

**Action types:**

| Action | Target Type | เมื่อไหร่ |
|--------|-------------|-----------|
| `timesheet_created` | timesheet | สร้าง timesheet ใหม่ |
| `timesheet_updated` | timesheet | แก้ไข entry |
| `timesheet_submitted` | timesheet | ส่ง timesheet |
| `timesheet_approved` | timesheet | admin approve |
| `timesheet_rejected` | timesheet | admin reject |
| `comment_added` | timesheet | เพิ่ม comment |
| `comment_deleted` | timesheet | ลบ comment |
| `leave_requested` | leave_request | ขอลา |
| `leave_approved` | leave_request | อนุมัติลา |
| `leave_rejected` | leave_request | ปฏิเสธลา |
| `member_added` | team | เพิ่มสมาชิก |
| `member_removed` | team | ลบสมาชิก |

**Helper function:**

```typescript
// src/lib/activity-log.ts
async function logActivity(params: {
  userId: ObjectId
  action: ActivityAction
  targetType: ActivityTargetType
  targetId: ObjectId
  metadata?: Record<string, any>
  teamId?: ObjectId
}): Promise<void>
```

เรียกใช้จาก API route โดยตรง (fire-and-forget, ไม่ block response)

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/team/activity?action=&memberId=&from=&to=&page=&limit=` | Activity log ของทีม |
| GET | `/api/timesheets/[id]/activity` | Activity log เฉพาะ timesheet |

**UI:**

- Team page: tab "Activity" แสดง log ของทีม พร้อม filter (action type, สมาชิก, ช่วงเวลา)
- Timesheet detail: timeline ด้านข้างแสดงลำดับเหตุการณ์
- Pagination, เรียงจากใหม่ไปเก่า

**Constraints:**

- Read-only ไม่มีการแก้ไข/ลบ log
- TTL index 1 ปี auto cleanup (ปรับได้ตาม company policy)
- บันทึกจาก API route โดยตรง (helper function, fire-and-forget)

---

## Feature 3: Team Dashboard & Insights

### Problem

Admin ไม่มีหน้ารวมที่เห็นสถานะทีมทั้งหมด ต้องไปดูแต่ละหน้าแยก

### Design

**หน้า:** ปรับปรุง `/dashboard` เดิม โดยขยาย existing `/api/dashboard` endpoint ให้รวมข้อมูลทีมเพิ่มเติมเมื่อ user เป็น admin

**API Endpoint:**

ขยาย `GET /api/dashboard?year=YYYY&month=MM` เพิ่ม team data สำหรับ admin role

Response เพิ่มเติมสำหรับ admin:

```typescript
interface TeamDashboardData {
  timesheetSummary: {
    notCreated: number
    draft: number
    submitted: number
    approved: number
    rejected: number
  }
  members: {
    userId: string
    name: string
    timesheetStatus: "draft" | "submitted" | "approved" | "rejected" | null
    totalHours: number
    leaveDaysThisMonth: number
  }[]
  leaveOverview: {
    userId: string
    name: string
    leaves: { date: string; type: string }[]
    quotaRemaining: { sick: number; personal: number; annual: number }
  }[]
  recentActivity: ActivityLog[]  // 10 รายการล่าสุด
}
```

**UI Components:**

**A) Timesheet Status Summary Cards**
- 5 cards: ยังไม่สร้าง / draft / submitted / approved / rejected
- แสดงจำนวนสมาชิกในแต่ละสถานะ
- คลิก → filter ไปหน้า team timesheets

**B) Member Status Table**
- ตาราง: ชื่อ, สถานะ timesheet เดือนนี้, ชั่วโมงรวม, วันลาเดือนนี้
- Sort ได้ตามคอลัมน์
- Highlight แถวที่ยังไม่ส่ง timesheet

**C) Leave Overview**
- สรุปการลาของทีมเดือนนี้
- แสดงโควต้าคงเหลือแต่ละคน (sick/personal/annual)

**D) Recent Activity Feed**
- ดึงจาก Activity Log (Feature 2)
- แสดง 10 รายการล่าสุด

**Constraints:**

- ไม่มี chart/graph ในเฟสแรก เน้นตารางและ card
- Responsive รองรับ mobile
- ขยาย existing `/api/dashboard` แทนสร้าง endpoint ใหม่

---

## Dependencies Between Features

```
Activity Log ← Team Dashboard (ใช้ recent activity feed)
Activity Log ← Comment (บันทึก comment_added/comment_deleted action)
Comment ← standalone (ไม่พึ่ง feature อื่น)
```

**Build order ที่แนะนำ:**
1. Activity Log model + helper — เป็น foundation
2. Comment + Team Dashboard — ทำ parallel ได้ (ทั้งคู่เรียก activity log helper)

---

## i18n

เพิ่ม translation keys ใน `messages/th.json` และ `messages/en.json` สำหรับทั้ง 3 features

---

## Out of Scope

- File attachments ใน comment
- Thread/nested replies
- Charts/graphs ใน dashboard
- Email/LINE notification
- Activity log export
- PersonalTimesheet comments
