# Bulk Approve, Notification Reminders & Deadline Indicator

**Date:** 2026-03-24
**Approach:** B — Notification-driven (notification + deadline รวมเป็นระบบเดียว, bulk approve แยกอิสระ)

---

## Feature 1: Bulk Approve

### Overview
ให้ leader/admin สามารถเลือก timesheet หลายรายการที่ status = `submitted` แล้ว approve พร้อมกันได้ในคลิกเดียว

### UI Changes — Team Page (`src/app/(dashboard)/team/page.tsx`)
- เพิ่ม checkbox ในแต่ละแถว สำหรับ timesheet ที่ status = `submitted` เท่านั้น
- เพิ่ม checkbox "เลือกทั้งหมด" ที่ table header (เลือกเฉพาะ submitted ที่แสดงอยู่)
- เมื่อเลือก >= 1 รายการ แสดง **floating action bar** ด้านล่างหน้าจอ:
  - แสดงจำนวนที่เลือก เช่น "เลือก 5 รายการ"
  - ปุ่ม "Approve Selected"
  - ปุ่ม "ยกเลิก" (deselect ทั้งหมด)
- กด "Approve Selected" → แสดง confirmation dialog → ยืนยัน → เรียก API

### API
- **`POST /api/team/timesheets/bulk-approve`**
  - Request body: `{ timesheetIds: string[] }`
  - Logic: loop approve แต่ละ timesheet ใน server โดยใช้ logic เดียวกับ approve route เดิม
  - ตรวจสิทธิ์แต่ละรายการ (ผู้ใช้เป็น leader/admin ของทีมที่ timesheet นั้นอยู่)
  - สร้าง notification ให้ user แต่ละคนที่ถูก approve
  - Response: `{ approved: number, failed: number, errors?: string[] }`
  - ถ้ามีบางรายการล้มเหลว จะ approve ที่เหลือต่อ (partial success)

### Constraints
- เฉพาะ timesheet ที่ status = `submitted` เท่านั้นที่เลือกได้
- Checkbox ไม่แสดงสำหรับ status อื่น

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

#### 2. Cron API Route — `POST /api/cron/deadline-reminder`
- ทำงานวันละครั้ง (เรียกผ่าน Vercel Cron หรือ external scheduler)
- ตรวจสอบว่าวันนี้เหลือ **3 วัน** หรือ **1 วัน** ก่อนสิ้นเดือน
- ถ้าตรง → query users ที่ยังไม่มี timesheet submitted/approved สำหรับเดือนปัจจุบัน
- สร้าง notification ให้ user เหล่านั้น:
  - Type: `deadline_reminder`
  - Category: `system`
  - Title: "Timesheet Deadline Reminder"
  - Message: "เหลืออีก X วันก่อนสิ้นเดือน กรุณาส่ง timesheet ของเดือน [month]"
  - Link: `/timesheet`
- **ป้องกันซ้ำ:** เช็คว่า user นั้นได้รับ `deadline_reminder` สำหรับเดือน/ปีนี้ ในวันเดียวกัน หรือยัง (ใช้ metadata `{ month, year, reminderDay }`)

#### 3. Vercel Cron Config (`vercel.json`)
```json
{
  "crons": [{
    "path": "/api/cron/deadline-reminder",
    "schedule": "0 9 * * *"
  }]
}
```
ทำงานทุกวัน 09:00 UTC — route ตรวจเองว่าวันนี้ต้องเตือนหรือไม่

---

## Feature 3: Deadline Indicator

### Overview
แสดง visual indicator บน UI ว่า timesheet ใกล้/เลย deadline (วันสิ้นเดือน)

### Deadline Rule
- Deadline = วันสุดท้ายของเดือนที่ timesheet นั้นเป็นของ
- คำนวณฝั่ง client จาก `month`/`year` ของ timesheet เทียบกับวันปัจจุบัน
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
| `vercel.json` | เพิ่ม cron config |

---

## Testing Strategy
- **Bulk Approve:** ทดสอบ approve หลายรายการ, partial failure, สิทธิ์ไม่ถูกต้อง
- **Deadline Reminder:** ทดสอบ cron ด้วย mock date (3 วัน, 1 วัน ก่อนสิ้นเดือน), ป้องกันซ้ำ
- **Deadline Badge:** ทดสอบ utility function กับวันต่างๆ (ปกติ, ใกล้, เลย)
