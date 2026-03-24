# Team Features Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Scope:** 3 features — Comment/Feedback, Activity Log, Team Dashboard & Insights

---

## Context

Timesheet project ใช้ภายในองค์กร ยังอยู่ในช่วงพัฒนา ต้องการเพิ่ม feature สำหรับทีม เพื่อให้ leader บริหารทีมได้ดีขึ้น และเพิ่มการสื่อสารระหว่าง leader กับ member

## Feature 1: Comment/Feedback บน Timesheet

### Problem

Approval flow ปัจจุบัน leader ทำได้แค่ approve หรือ reject ไม่มีทางสื่อสารกับ member โดยตรง ถ้ามีปัญหาเล็กน้อยต้อง reject ทั้งฉบับ

### Design

**Data Model — Embedded ใน Timesheet document:**

```typescript
interface TimesheetComment {
  _id: ObjectId
  userId: ObjectId        // ใครเขียน
  message: string         // ข้อความ (max 500 chars)
  entryIndex?: number     // ถ้ามี = comment เจาะจง entry, ถ้าไม่มี = comment ภาพรวม
  createdAt: Date
}
```

เพิ่ม field `comments: TimesheetComment[]` ใน Timesheet model

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/timesheets/[id]/comments` | เพิ่ม comment |
| DELETE | `/api/timesheets/[id]/comments/[commentId]` | ลบ comment (เจ้าของเท่านั้น) |

**UI:**

- Timesheet detail page: ช่อง comment ด้านล่าง + ปุ่ม comment icon ข้างแต่ละ entry
- Comment แสดงเป็น flat list เรียงตามเวลา
- Entry-level comment แสดง badge count บน entry นั้น
- Comment ใหม่ trigger notification ให้อีกฝ่าย

**Constraints:**

- Text only (ไม่มี attachment)
- Flat list ไม่มี thread/reply ซ้อน
- ลบได้เฉพาะเจ้าของ comment
- ใช้ได้ทั้ง Timesheet และ PersonalTimesheet (PersonalTimesheet ไม่มี cross-user comment)

---

## Feature 2: Activity Log

### Problem

ไม่มีประวัติการกระทำในระบบ ตรวจสอบย้อนหลังไม่ได้ว่าใครทำอะไรเมื่อไหร่

### Design

**Data Model — Collection ใหม่ `activitylogs`:**

```typescript
interface ActivityLog {
  _id: ObjectId
  userId: ObjectId          // ใครทำ
  action: string            // ทำอะไร
  targetType: string        // กระทำกับอะไร
  targetId: ObjectId        // ID ของสิ่งที่ถูกกระทำ
  metadata: Record<string, any>  // ข้อมูลเพิ่มเติม
  teamId?: ObjectId         // ทีมที่เกี่ยวข้อง
  createdAt: Date
}
```

**Action types:**

| Action | Target Type | เมื่อไหร่ |
|--------|-------------|-----------|
| `timesheet_created` | timesheet | สร้าง timesheet ใหม่ |
| `timesheet_updated` | timesheet | แก้ไข entry |
| `timesheet_submitted` | timesheet | ส่ง timesheet |
| `timesheet_approved` | timesheet | leader approve |
| `timesheet_rejected` | timesheet | leader reject |
| `comment_added` | timesheet | เพิ่ม comment |
| `leave_requested` | leave_request | ขอลา |
| `leave_approved` | leave_request | อนุมัติลา |
| `leave_rejected` | leave_request | ปฏิเสธลา |
| `member_added` | team | เพิ่มสมาชิก |
| `member_removed` | team | ลบสมาชิก |

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/team/activity` | Activity log ของทีม (filter by action, member, date range) |
| GET | `/api/timesheets/[id]/activity` | Activity log เฉพาะ timesheet |

**UI:**

- Team page: tab "Activity" แสดง log ของทีม พร้อม filter
- Timesheet detail: timeline ด้านข้างแสดงลำดับเหตุการณ์
- Pagination, เรียงจากใหม่ไปเก่า

**Constraints:**

- Read-only ไม่มีการแก้ไข/ลบ log
- TTL index 1 ปี auto cleanup
- บันทึกจาก API route โดยตรง (helper function)

---

## Feature 3: Team Dashboard & Insights

### Problem

Leader ไม่มีหน้ารวมที่เห็นสถานะทีมทั้งหมด ต้องไปดูแต่ละหน้าแยก

### Design

**หน้า:** ปรับปรุง `/dashboard` เดิม แสดงข้อมูลทีมเมื่อ user เป็น leader/admin

**API Endpoint:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/team/dashboard` | รวมข้อมูล dashboard ทั้งหมด |

Response ประกอบด้วย:

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
    timesheetStatus: string | null
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
- ใช้ข้อมูลที่มีอยู่ + Activity Log ใหม่

---

## Dependencies Between Features

```
Activity Log ← Team Dashboard (ใช้ recent activity feed)
Activity Log ← Comment (บันทึก comment_added action)
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
