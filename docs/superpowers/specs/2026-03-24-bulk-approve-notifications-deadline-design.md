# Bulk Approve, Notification Reminders & Deadline Indicator

**Date:** 2026-03-24
**Approach:** B — Notification-driven (notification + deadline รวมเป็นระบบเดียว, bulk approve แยกอิสระ)

---

## Feature 1: Bulk Approve

### Overview
ให้ admin (team leader role) สามารถเลือก timesheet หลายรายการที่ status = `submitted` แล้ว approve พร้อมกันได้ในคลิกเดียว

> **Role clarification:** ระบบมี 3 roles: `super_admin`, `admin`, `user` โดย `admin` ทำหน้าที่เป็น team leader ที่ approve timesheet ได้ (ตาม `canApproveTimesheet` ใน permissions)

### UI Changes — Team Page (`src/app/(dashboard)/team/page.tsx`)
- เพิ่ม checkbox ในแต่ละแถว สำหรับ timesheet ที่ status = `submitted` เท่านั้น
- เพิ่ม checkbox "เลือกทั้งหมด" ที่ table header (เลือกเฉพาะ submitted ที่แสดงอยู่)
- เมื่อเลือก >= 1 รายการ แสดง **floating action bar** ด้านล่างหน้าจอ:
  - แสดงจำนวนที่เลือก เช่น "เลือก 5 รายการ"
  - ปุ่ม "Approve Selected" (แสดง spinner + disabled ระหว่าง API call)
  - ปุ่ม "ยกเลิก" (deselect ทั้งหมด)
- กด "Approve Selected" → แสดง confirmation dialog → ยืนยัน → เรียก API
- **ระหว่าง API call:** ปุ่ม disabled + spinner, checkbox locked
- **เมื่อสำเร็จ:** toast success, refresh table, clear selection
- **Partial success:** toast warning แสดงจำนวนสำเร็จ/ล้มเหลว, refresh table

### API
- **`POST /api/team/timesheets/bulk-approve`**
  - Auth: ต้องเป็น role `admin` เท่านั้น (ตรวจด้วย `auth()`)
  - Request body: `{ timesheetIds: string[] }`
  - **Max limit:** สูงสุด 50 รายการต่อ request — return 400 ถ้าเกิน
  - Logic: loop approve แต่ละ timesheet ใน server โดยใช้ logic เดียวกับ approve route เดิม
  - ตรวจสิทธิ์แต่ละรายการ (ผู้ใช้เป็น admin ของทีมที่ timesheet นั้นอยู่)
  - สร้าง notification ให้ user แต่ละคนที่ถูก approve
  - ส่ง email notification เหมือน single approve (ใช้ `sendTimesheetStatusEmail()`)
  - Response: `{ approved: number, failed: number, approvedIds: string[], errors?: string[] }`
  - ถ้ามีบางรายการล้มเหลว จะ approve ที่เหลือต่อ (partial success) — return `approvedIds` เพื่อให้ client reconcile ได้

> **API path rationale:** ใช้ `/api/team/timesheets/bulk-approve` แทน `/api/timesheets/bulk-approve` เพราะเป็น team-level action ที่ต้องตรวจ team membership ซึ่งต่างจาก single approve ที่อยู่ใต้ `/api/timesheets/[id]/approve`

### Constraints
- เฉพาะ timesheet ที่ status = `submitted` เท่านั้นที่เลือกได้
- Checkbox ไม่แสดงสำหรับ status อื่น
- สูงสุด 50 รายการต่อ request

---

## Feature 2: Notification System Enhancement (Deadline Reminders)

### Overview
เพิ่มระบบ auto-reminder ที่เตือน user เมื่อใกล้ deadline (วันสิ้นเดือน) ว่ายังไม่ส่ง timesheet ใช้ระบบ notification ที่มีอยู่แล้ว

### Existing Infrastructure (ไม่ต้องสร้างใหม่)
- **Model:** `src/models/Notification.ts` — รองรับ type, category, read status, auto-delete 30 วัน
- **API:** `/api/notifications`, `/api/notifications/[id]`, `/api/notifications/mark-read`
- **UI:** `src/components/NotificationBell.tsx` — bell icon ใน header
- **Trigger points:** submit, approve, reject route สร้าง notification อยู่แล้ว

### Changes

#### 1. เพิ่ม notification type
เพิ่ม `deadline_reminder` ใน NotificationType enum (`src/types/`) และ Notification model enum list

#### 2. Cron API Route — `GET /api/cron/deadline-reminder`

- **HTTP Method: GET** (ตาม Vercel Cron convention และ consistent กับ existing cron route `reset-leave-balance`)
- **Authentication:** ใช้ `CRON_SECRET` bearer token เหมือน existing cron routes (ตรวจด้วย `verifyCronSecret()`)
- ทำงานวันละครั้ง (เรียกผ่าน Vercel Cron)
- ตรวจสอบว่าวันนี้เหลือ **3 วัน** หรือ **1 วัน** ก่อนสิ้นเดือน (คำนวณตาม **timezone Asia/Bangkok**)
- ถ้าตรง → query users ที่ยังไม่มี timesheet สำหรับเดือนปัจจุบัน หรือมี timesheet ที่ status = `draft` เท่านั้น (skip users ที่มี status `submitted`, `approved`, หรือ `rejected`)
- สร้าง notification ให้ user เหล่านั้น:
  - Type: `deadline_reminder`
  - Category: `system`
  - Title: "Timesheet Deadline Reminder"
  - Message: "เหลืออีก X วันก่อนสิ้นเดือน กรุณาส่ง timesheet ของเดือน [month]"
  - Link: `/timesheet`
- **ป้องกันซ้ำ:** เช็คว่า user นั้นได้รับ `deadline_reminder` สำหรับเดือน/ปีนี้ ด้วย `metadata.reminderDaysLeft` ค่าเดียวกัน หรือยัง
  - metadata: `{ month: number, year: number, reminderDaysLeft: 3 | 1 }`
  - Query: ตรวจ notification ที่มี type = `deadline_reminder` + metadata ตรงกัน + สร้างภายใน 24 ชั่วโมงล่าสุด → ถ้ามีแล้ว skip

#### 3. Vercel Cron Config (`vercel.json`)

เพิ่ม entry ใน `crons` array ที่มีอยู่แล้ว (ไม่ overwrite):
```json
{
  "path": "/api/cron/deadline-reminder",
  "schedule": "0 2 * * *"
}
```
ทำงานทุกวัน 02:00 UTC (= 09:00 เวลาไทย) — route ตรวจเองว่าวันนี้ต้องเตือนหรือไม่

### Timezone
- **Server (cron):** คำนวณวันสิ้นเดือนและ days left ตาม **Asia/Bangkok** timezone
- **Client (badge):** คำนวณตาม browser timezone ของ user (ซึ่งส่วนใหญ่จะเป็น Asia/Bangkok)
- ความแตกต่างของ timezone อาจทำให้ badge กับ notification ไม่ตรงกัน 1 วันในช่วงเที่ยงคืน ซึ่งยอมรับได้

---

## Feature 3: Deadline Indicator

### Overview
แสดง visual indicator บน UI ว่า timesheet ใกล้/เลย deadline (วันสิ้นเดือน)

### Deadline Rule
- Deadline = วันสุดท้ายของเดือนที่ timesheet นั้นเป็นของ
- คำนวณฝั่ง client จาก `month`/`year` ของ timesheet เทียบกับวันปัจจุบัน (browser timezone)
- แสดงเฉพาะ timesheet ที่ status = `draft`

### Display Rules

| สถานะ | เงื่อนไข | Badge |
|-------|---------|-------|
| ปกติ | เหลือ > 7 วัน | ไม่แสดง |
| ใกล้ deadline | เหลือ 1-7 วัน | สีเหลือง/amber "เหลือ X วัน" |
| วันสุดท้าย | วันนี้ = วันสิ้นเดือน | สีแดง "วันสุดท้าย!" |
| เลยกำหนด | เลยสิ้นเดือนแล้ว | สีแดง "เลยกำหนด" |

### Implementation

#### 1. Utility Function — `src/lib/deadline.ts`
```typescript
type DeadlineStatus = "normal" | "warning" | "urgent" | "overdue";

interface DeadlineInfo {
  status: DeadlineStatus;
  daysLeft: number;
}

function getDeadlineStatus(month: number, year: number): DeadlineInfo
```
- คำนวณวันสิ้นเดือนจาก `month`/`year`
- เปรียบเทียบกับวันปัจจุบัน
- Return status + จำนวนวันที่เหลือ

#### 2. Deadline Badge Component — `src/components/DeadlineBadge.tsx`
- รับ `month`, `year`, `status` (timesheet status) เป็น props
- ถ้า status ไม่ใช่ `draft` → ไม่แสดงอะไร
- ใช้ `getDeadlineStatus()` คำนวณแล้วแสดง Badge ตามตาราง

#### 3. แสดงใน UI
- **Team Page** (`src/app/(dashboard)/team/page.tsx`) — เพิ่ม DeadlineBadge ในแถว timesheet ข้าง status badge
- **User Timesheet List** (`src/app/(dashboard)/timesheet/page.tsx`) — เพิ่ม DeadlineBadge เช่นกัน

---

## i18n

เพิ่ม translation keys ใน `messages/th.json` และ `messages/en.json`:

```
deadline.daysLeft: "เหลือ {days} วัน" / "{days} days left"
deadline.lastDay: "วันสุดท้าย!" / "Last day!"
deadline.overdue: "เลยกำหนด" / "Overdue"
deadline.reminder.title: "Timesheet Deadline Reminder"
deadline.reminder.message: "เหลืออีก {days} วัน..."
bulkApprove.selected: "เลือก {count} รายการ"
bulkApprove.approve: "Approve Selected"
bulkApprove.confirm: "ต้องการ approve {count} รายการ?"
bulkApprove.success: "Approve สำเร็จ {count} รายการ"
bulkApprove.partialSuccess: "Approve สำเร็จ {approved} จาก {total} รายการ"
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/team/timesheets/bulk-approve/route.ts` | Bulk approve API |
| `src/app/api/cron/deadline-reminder/route.ts` | Cron job สร้าง deadline reminder |
| `src/lib/deadline.ts` | Utility function คำนวณ deadline status |
| `src/components/DeadlineBadge.tsx` | Deadline badge component |

### Modified Files
| File | Change |
|------|--------|
| `src/app/(dashboard)/team/page.tsx` | เพิ่ม checkbox, floating action bar, DeadlineBadge |
| `src/app/(dashboard)/timesheet/page.tsx` | เพิ่ม DeadlineBadge |
| `src/models/Notification.ts` | เพิ่ม `deadline_reminder` ใน enum |
| `src/types/index.ts` (หรือ types ที่เกี่ยวข้อง) | เพิ่ม `deadline_reminder` ใน NotificationType |
| `messages/th.json` | เพิ่ม translation keys |
| `messages/en.json` | เพิ่ม translation keys |
| `vercel.json` | เพิ่ม entry ใน existing crons array |

---

## Testing Strategy

- **Bulk Approve:** ทดสอบ approve หลายรายการ, partial failure, สิทธิ์ไม่ถูกต้อง, เกิน limit 50 รายการ
- **Deadline Reminder:** ทดสอบ cron ด้วย mock date (3 วัน, 1 วัน ก่อนสิ้นเดือน), ป้องกันซ้ำ, CRON_SECRET auth
- **Deadline Badge:** ทดสอบ utility function กับวันต่างๆ (ปกติ, ใกล้, เลย, วันสิ้นเดือนของเดือนต่างๆ)
