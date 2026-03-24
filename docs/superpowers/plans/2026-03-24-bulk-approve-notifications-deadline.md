# Bulk Approve, Notification Reminders & Deadline Indicator — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk approve for team timesheets, deadline reminder notifications via cron, and deadline indicator badges on timesheet lists.

**Architecture:** Three independent features sharing existing notification infrastructure. Bulk approve adds a new API route + checkbox UI on team page. Deadline reminders use a cron-triggered API route that creates notifications for users with draft/missing timesheets. Deadline badge is a pure client-side component using a shared utility function.

**Tech Stack:** Next.js 16 App Router, MongoDB/Mongoose, NextAuth v5, shadcn/ui, Tailwind CSS 4, next-intl, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-03-24-bulk-approve-notifications-deadline-design.md`

---

## Chunk 1: Deadline Utility + Badge Component

### Task 1: Add `deadline_reminder` to NotificationType

**Files:**
- Modify: `src/types/index.ts:230-239`
- Modify: `src/models/Notification.ts:9-19`
- Modify: `src/lib/notifications.ts:14-24`

- [ ] **Step 1: Add `deadline_reminder` to NotificationType union**

In `src/types/index.ts`, add `"deadline_reminder"` to the union:

```typescript
export type NotificationType =
  | "timesheet_approved"
  | "timesheet_rejected"
  | "timesheet_pending"
  | "leave_approved"
  | "leave_rejected"
  | "leave_pending"
  | "team_leave"
  | "system_announcement"
  | "holiday_added"
  | "deadline_reminder";
```

- [ ] **Step 2: Add to Notification model enum**

In `src/models/Notification.ts`, add `"deadline_reminder"` to the enum array (line 10-19):

```typescript
enum: [
  "timesheet_approved",
  "timesheet_rejected",
  "timesheet_pending",
  "leave_approved",
  "leave_rejected",
  "leave_pending",
  "team_leave",
  "system_announcement",
  "holiday_added",
  "deadline_reminder",
] as NotificationType[],
```

- [ ] **Step 3: Add to categoryMap in notifications.ts**

In `src/lib/notifications.ts`, add mapping (line 14-24):

```typescript
const categoryMap: Record<NotificationType, NotificationCategory> = {
  timesheet_approved: "approval",
  timesheet_rejected: "approval",
  timesheet_pending: "approval",
  leave_approved: "approval",
  leave_rejected: "approval",
  leave_pending: "approval",
  team_leave: "team",
  system_announcement: "system",
  holiday_added: "system",
  deadline_reminder: "system",
};
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/models/Notification.ts src/lib/notifications.ts
git commit -m "feat: add deadline_reminder notification type"
```

---

### Task 2: Create deadline utility function

**Files:**
- Create: `src/lib/deadline.ts`

- [ ] **Step 1: Create `src/lib/deadline.ts`**

```typescript
export type DeadlineStatus = "normal" | "warning" | "urgent" | "overdue";

export interface DeadlineInfo {
  status: DeadlineStatus;
  daysLeft: number;
}

/**
 * Calculate deadline status for a timesheet based on its month/year.
 * Deadline = last day of the given month.
 */
export function getDeadlineStatus(month: number, year: number): DeadlineInfo {
  // Last day of the month (month is 1-indexed, so new Date(year, month, 0) gives last day)
  const lastDay = new Date(year, month, 0);
  lastDay.setHours(23, 59, 59, 999);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());

  const diffMs = deadlineDay.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: "overdue", daysLeft };
  }
  if (daysLeft === 0) {
    return { status: "urgent", daysLeft: 0 };
  }
  if (daysLeft <= 7) {
    return { status: "warning", daysLeft };
  }
  return { status: "normal", daysLeft };
}

/**
 * Server-side version using Asia/Bangkok timezone.
 * Used by cron jobs.
 */
export function getDeadlineStatusTH(month: number, year: number): DeadlineInfo {
  const lastDay = new Date(year, month, 0);
  const nowUTC = new Date();
  // Convert to Bangkok time (UTC+7)
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(nowUTC.getTime() + bangkokOffset);
  const today = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth(), bangkokNow.getDate());
  const deadlineDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());

  const diffMs = deadlineDay.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: "overdue", daysLeft };
  }
  if (daysLeft === 0) {
    return { status: "urgent", daysLeft: 0 };
  }
  if (daysLeft <= 7) {
    return { status: "warning", daysLeft };
  }
  return { status: "normal", daysLeft };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/deadline.ts
git commit -m "feat: add deadline utility functions"
```

---

### Task 3: Create DeadlineBadge component

**Files:**
- Create: `src/components/DeadlineBadge.tsx`

- [ ] **Step 1: Create `src/components/DeadlineBadge.tsx`**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getDeadlineStatus } from "@/lib/deadline";
import type { TimesheetStatus } from "@/types";

interface DeadlineBadgeProps {
  month: number;
  year: number;
  timesheetStatus: TimesheetStatus;
}

export function DeadlineBadge({ month, year, timesheetStatus }: DeadlineBadgeProps) {
  const t = useTranslations("deadline");

  // Only show for draft timesheets
  if (timesheetStatus !== "draft") {
    return null;
  }

  const { status, daysLeft } = getDeadlineStatus(month, year);

  if (status === "normal") {
    return null;
  }

  const config = {
    warning: {
      label: t("daysLeft", { days: daysLeft }),
      className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    },
    urgent: {
      label: t("lastDay"),
      className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
    overdue: {
      label: t("overdue"),
      className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
  } as const;

  const { label, className } = config[status];

  return (
    <Badge className={`text-[10px] px-1.5 py-0 font-normal ${className}`}>
      {label}
    </Badge>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeadlineBadge.tsx
git commit -m "feat: add DeadlineBadge component"
```

---

### Task 4: Add i18n keys for deadline and bulk approve

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add deadline + bulkApprove keys to `messages/th.json`**

Add these nested objects to the existing JSON:

```json
"deadline": {
  "daysLeft": "เหลือ {days} วัน",
  "lastDay": "วันสุดท้าย!",
  "overdue": "เลยกำหนด"
},
"bulkApprove": {
  "selected": "เลือก {count} รายการ",
  "approve": "อนุมัติที่เลือก",
  "cancel": "ยกเลิก",
  "confirm": "ต้องการอนุมัติ {count} รายการ?",
  "confirmDescription": "Timesheet ที่เลือกทั้งหมดจะถูกอนุมัติ",
  "success": "อนุมัติสำเร็จ {count} รายการ",
  "partialSuccess": "อนุมัติสำเร็จ {approved} จาก {total} รายการ"
}
```

- [ ] **Step 2: Add deadline + bulkApprove keys to `messages/en.json`**

```json
"deadline": {
  "daysLeft": "{days} days left",
  "lastDay": "Last day!",
  "overdue": "Overdue"
},
"bulkApprove": {
  "selected": "{count} selected",
  "approve": "Approve Selected",
  "cancel": "Cancel",
  "confirm": "Approve {count} timesheets?",
  "confirmDescription": "All selected timesheets will be approved",
  "success": "{count} timesheets approved",
  "partialSuccess": "{approved} of {total} approved"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/th.json messages/en.json
git commit -m "feat: add i18n keys for deadline and bulk approve"
```

---

### Task 5: Integrate DeadlineBadge into timesheet list page

**Files:**
- Modify: `src/app/(dashboard)/timesheet/page.tsx`

- [ ] **Step 1: Add import**

Add to imports section of `src/app/(dashboard)/timesheet/page.tsx`:

```typescript
import { DeadlineBadge } from "@/components/DeadlineBadge";
```

- [ ] **Step 2: Add DeadlineBadge next to status badge in the table**

Find the status Badge rendering in the table row (search for `statusColors[ts.status]` or similar) and add `<DeadlineBadge />` right after it:

```tsx
<DeadlineBadge
  month={ts.month}
  year={ts.year}
  timesheetStatus={ts.status}
/>
```

- [ ] **Step 3: Verify the page renders correctly**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/timesheet/page.tsx
git commit -m "feat: add deadline badge to user timesheet list"
```

---

### Task 6: Integrate DeadlineBadge into team page

**Files:**
- Modify: `src/app/(dashboard)/team/page.tsx`

- [ ] **Step 1: Add import**

Add to imports in `src/app/(dashboard)/team/page.tsx`:

```typescript
import { DeadlineBadge } from "@/components/DeadlineBadge";
```

- [ ] **Step 2: Add DeadlineBadge next to status badge in team table**

Find the status Badge in the table row (around line 475, search for `statusColors[ts.status]`) and add DeadlineBadge right after it:

```tsx
<DeadlineBadge
  month={ts.month}
  year={ts.year}
  timesheetStatus={ts.status}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/team/page.tsx
git commit -m "feat: add deadline badge to team timesheet page"
```

---

## Chunk 2: Bulk Approve API + UI

### Task 7: Create bulk approve API route

**Files:**
- Create: `src/app/api/team/timesheets/bulk-approve/route.ts`

Reference: `src/app/api/timesheets/[id]/approve/route.ts` for approve logic pattern.

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";
import { sendTimesheetStatusEmail } from "@/lib/email";
import { notifyTimesheetApproved } from "@/lib/notifications";

const MAX_BULK_SIZE = 50;

// POST /api/team/timesheets/bulk-approve
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { timesheetIds } = await request.json();

    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      return NextResponse.json(
        { error: "timesheetIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (timesheetIds.length > MAX_BULK_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BULK_SIZE} timesheets per request` },
        { status: 400 }
      );
    }

    await connectDB();

    // Get leader's teams once
    const teams = await Team.find({ adminId: session.user.id });
    const allMemberIds = teams.flatMap((t: { memberIds: { toString: () => string }[] }) =>
      t.memberIds.map((id) => id.toString())
    );

    const approvedIds: string[] = [];
    const errors: string[] = [];

    for (const tsId of timesheetIds) {
      try {
        const timesheet = await Timesheet.findById(tsId);

        if (!timesheet) {
          errors.push(`${tsId}: not found`);
          continue;
        }

        if (timesheet.status !== "submitted") {
          errors.push(`${tsId}: status is ${timesheet.status}, not submitted`);
          continue;
        }

        // Check authorization
        const isOwnTimesheet = timesheet.userId.toString() === session.user.id;
        if (!isOwnTimesheet && !allMemberIds.includes(timesheet.userId.toString())) {
          errors.push(`${tsId}: not in your team`);
          continue;
        }

        // Approve
        timesheet.status = "approved";
        timesheet.approvedAt = new Date();
        timesheet.approvedBy = session.user.id as any;
        await timesheet.save();
        approvedIds.push(tsId);

        // Send email (non-blocking)
        try {
          const timesheetUser = await User.findById(timesheet.userId).lean();
          if (timesheetUser?.email) {
            await sendTimesheetStatusEmail({
              to: timesheetUser.email,
              userName: timesheetUser.name || "User",
              month: timesheet.month,
              year: timesheet.year,
              status: "approved",
              reviewerName: session.user.name || "Manager",
            });
          }
        } catch (emailError) {
          console.error(`Failed to send email for ${tsId}:`, emailError);
        }

        // Send in-app notification (non-blocking)
        try {
          await notifyTimesheetApproved(
            timesheet.userId.toString(),
            timesheet.month,
            timesheet.year
          );
        } catch (notifError) {
          console.error(`Failed to send notification for ${tsId}:`, notifError);
        }
      } catch (err) {
        console.error(`Error processing ${tsId}:`, err);
        errors.push(`${tsId}: internal error`);
      }
    }

    return NextResponse.json({
      data: {
        approved: approvedIds.length,
        failed: errors.length,
        approvedIds,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error in bulk approve:", error);
    return NextResponse.json(
      { error: "Failed to bulk approve timesheets" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/team/timesheets/bulk-approve/route.ts
git commit -m "feat: add bulk approve API endpoint"
```

---

### Task 8: Add bulk approve UI to team page

**Files:**
- Modify: `src/app/(dashboard)/team/page.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports:

```typescript
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
```

- [ ] **Step 2: Add state variables**

Add after existing state declarations (around line 120, after `searchQuery` state):

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [showConfirm, setShowConfirm] = useState(false);
const [bulkApproving, setBulkApproving] = useState(false);
```

- [ ] **Step 3: Add helper functions**

Add after the `rejectTimesheet` function (around line 227):

```typescript
// Bulk approve helpers
const selectableTimesheets = useMemo(
  () => filteredTimesheets.filter((ts) => ts.status === "submitted"),
  [filteredTimesheets]
);

const allSubmittedSelected =
  selectableTimesheets.length > 0 &&
  selectableTimesheets.every((ts) => selectedIds.has(ts._id));

const toggleSelect = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const toggleSelectAll = () => {
  if (allSubmittedSelected) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(selectableTimesheets.map((ts) => ts._id)));
  }
};

const bulkApprove = async () => {
  setBulkApproving(true);
  try {
    const res = await fetch("/api/team/timesheets/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timesheetIds: Array.from(selectedIds) }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || t("errors.failedToApprove"));
      return;
    }

    if (data.data.failed > 0) {
      toast.warning(
        t("bulkApprove.partialSuccess", {
          approved: data.data.approved,
          total: data.data.approved + data.data.failed,
        })
      );
    } else {
      toast.success(t("bulkApprove.success", { count: data.data.approved }));
    }

    setSelectedIds(new Set());
    fetchData();
  } catch {
    toast.error(t("errors.failedToApprove"));
  } finally {
    setBulkApproving(false);
    setShowConfirm(false);
  }
};
```

- [ ] **Step 4: Add checkbox to table header**

Find the `<TableHeader>` section (around line 428). Add a new `<TableHead>` as the first column:

```tsx
<TableHead className="w-10 text-xs font-medium">
  {selectableTimesheets.length > 0 && (
    <Checkbox
      checked={allSubmittedSelected}
      onCheckedChange={toggleSelectAll}
      aria-label="Select all submitted"
    />
  )}
</TableHead>
```

- [ ] **Step 5: Add checkbox to each table row**

Find the `<TableBody>` map (around line 438-521). Add a new `<TableCell>` as the first cell in each row:

```tsx
<TableCell className="py-2 w-10">
  {ts.status === "submitted" ? (
    <Checkbox
      checked={selectedIds.has(ts._id)}
      onCheckedChange={() => toggleSelect(ts._id)}
      aria-label={`Select ${ts.userId.name}`}
    />
  ) : null}
</TableCell>
```

- [ ] **Step 6: Update the empty state colSpan**

Find the empty state `<TableCell colSpan=...>` (around line 523) and add +1 to the colSpan calculation to account for the new checkbox column:

Add 1 to the existing colSpan to account for the new checkbox column:

```tsx
<TableCell colSpan={(teams.length > 1 ? 7 : 6) + (filterMonth === "all" ? 1 : 0)} ...>
```

(Current value is `(teams.length > 1 ? 6 : 5)` → becomes `(teams.length > 1 ? 7 : 6)`)

- [ ] **Step 7: Add floating action bar + confirmation dialog**

Add right before the closing `</div>` of the return (before line 534):

```tsx
{/* Floating Bulk Action Bar */}
{selectedIds.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
    <span className="text-sm font-medium">
      {t("bulkApprove.selected", { count: selectedIds.size })}
    </span>
    <Button
      size="sm"
      onClick={() => setShowConfirm(true)}
      disabled={bulkApproving}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      {bulkApproving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
      {t("bulkApprove.approve")}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setSelectedIds(new Set())}
      disabled={bulkApproving}
    >
      {t("bulkApprove.cancel")}
    </Button>
  </div>
)}

{/* Bulk Approve Confirmation Dialog */}
<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {t("bulkApprove.confirm", { count: selectedIds.size })}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {t("bulkApprove.confirmDescription")}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={bulkApproving}>
        {t("bulkApprove.cancel")}
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={bulkApprove}
        disabled={bulkApproving}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        {bulkApproving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
        {t("bulkApprove.approve")}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 9: Commit**

```bash
git add src/app/(dashboard)/team/page.tsx
git commit -m "feat: add bulk approve UI with checkbox selection and floating action bar"
```

---

## Chunk 3: Deadline Reminder Cron Job

### Task 9: Add notifyDeadlineReminder helper

**Files:**
- Modify: `src/lib/notifications.ts`

- [ ] **Step 1: Add helper function**

Add at the end of `src/lib/notifications.ts`:

```typescript
export async function notifyDeadlineReminder(
  userId: string | Types.ObjectId,
  month: number,
  year: number,
  daysLeft: number
) {
  return createNotification({
    userId,
    type: "deadline_reminder",
    title: "Timesheet Deadline Reminder",
    message:
      daysLeft === 0
        ? `วันนี้เป็นวันสุดท้ายของการส่ง Timesheet เดือน ${month}/${year}`
        : `เหลืออีก ${daysLeft} วันก่อนสิ้นเดือน กรุณาส่ง Timesheet เดือน ${month}/${year}`,
    link: "/timesheet",
    metadata: { month, year, reminderDaysLeft: daysLeft },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: add notifyDeadlineReminder helper"
```

---

### Task 10: Create deadline reminder cron API route

**Files:**
- Create: `src/app/api/cron/deadline-reminder/route.ts`

Reference: `src/app/api/cron/reset-leave-balance/route.ts` for cron pattern.

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Timesheet, Notification } from "@/models";
import { notifyDeadlineReminder } from "@/lib/notifications";
import { getDeadlineStatusTH } from "@/lib/deadline";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// GET /api/cron/deadline-reminder
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Calculate current month/year in Bangkok timezone
    const nowUTC = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(nowUTC.getTime() + bangkokOffset);
    const currentMonth = bangkokNow.getMonth() + 1;
    const currentYear = bangkokNow.getFullYear();

    // Check if we should send reminders today
    const { status, daysLeft } = getDeadlineStatusTH(currentMonth, currentYear);

    // Only send reminders at 3 days and 1 day before deadline
    if (daysLeft !== 3 && daysLeft !== 1) {
      return NextResponse.json({
        data: {
          message: `No reminder needed today (${daysLeft} days left)`,
          sent: 0,
        },
      });
    }

    // Find all users (excluding super_admin)
    const users = await User.find({ role: { $in: ["admin", "user"] } }).lean();

    // Find timesheets for current month that are already submitted/approved/rejected
    const existingTimesheets = await Timesheet.find({
      month: currentMonth,
      year: currentYear,
      status: { $in: ["submitted", "approved", "rejected"] },
    }).lean();

    const submittedUserIds = new Set(
      existingTimesheets.map((ts: any) => ts.userId.toString())
    );

    // Filter users who need reminders (no submitted/approved/rejected timesheet)
    const usersToRemind = users.filter(
      (user: any) => !submittedUserIds.has(user._id.toString())
    );

    // Check for existing reminders to prevent duplicates
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingReminders = await Notification.find({
      type: "deadline_reminder",
      "metadata.month": currentMonth,
      "metadata.year": currentYear,
      "metadata.reminderDaysLeft": daysLeft,
      createdAt: { $gte: oneDayAgo },
    }).lean();

    const alreadyRemindedUserIds = new Set(
      existingReminders.map((n: any) => n.userId.toString())
    );

    let sent = 0;
    let skipped = 0;

    for (const user of usersToRemind) {
      const userId = (user as any)._id.toString();
      if (alreadyRemindedUserIds.has(userId)) {
        skipped++;
        continue;
      }

      try {
        await notifyDeadlineReminder(userId, currentMonth, currentYear, daysLeft);
        sent++;
      } catch (err) {
        console.error(`[Cron] Failed to send reminder to ${userId}:`, err);
      }
    }

    return NextResponse.json({
      data: {
        message: `Deadline reminders sent (${daysLeft} days left)`,
        month: currentMonth,
        year: currentYear,
        daysLeft,
        sent,
        skipped,
        totalUsersToRemind: usersToRemind.length,
      },
    });
  } catch (error) {
    console.error("[Cron] Error in deadline-reminder:", error);
    return NextResponse.json(
      { error: "Failed to process deadline reminders" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/deadline-reminder/route.ts
git commit -m "feat: add deadline reminder cron API route"
```

---

### Task 11: Add cron config to vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add deadline-reminder cron entry**

Update `vercel.json` to add the new cron entry:

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-leave-balance",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/deadline-reminder",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add deadline-reminder cron schedule to vercel.json"
```

---

### Task 12: Final build verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit any fixes if needed**

If lint/build reveals issues, fix and commit.
