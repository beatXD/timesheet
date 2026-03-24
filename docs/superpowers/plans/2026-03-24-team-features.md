# Team Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Comment/Feedback, Activity Log, and Team Dashboard features to improve team collaboration and visibility.

**Architecture:** Three features built on shared Activity Log foundation. Activity Log model + helper is created first, then Comment and Team Dashboard are built in parallel since both depend on the activity log helper but not on each other.

**Tech Stack:** Next.js 16 App Router, MongoDB/Mongoose, NextAuth v5, Zod validation, shadcn/ui, Tailwind CSS 4, next-intl, Zustand

**Spec:** `docs/superpowers/specs/2026-03-24-team-features-design.md`

---

## Chunk 1: Activity Log Foundation

### Task 1: ActivityLog Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add ActivityLog types to types/index.ts**

Add after the existing notification types:

```typescript
// Activity Log
export type ActivityAction =
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
  | "member_removed";

export type ActivityTargetType = "timesheet" | "leave_request" | "team";

export interface IActivityLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: Types.ObjectId;
  metadata?: Record<string, unknown>;
  teamId?: Types.ObjectId;
  createdAt: Date;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors related to new types

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ActivityLog types"
```

---

### Task 2: ActivityLog Mongoose Model

**Files:**
- Create: `src/models/ActivityLog.ts`
- Modify: `src/models/index.ts`

- [ ] **Step 1: Create ActivityLog model**

Create `src/models/ActivityLog.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";
import type { IActivityLog, ActivityAction, ActivityTargetType } from "@/types";

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "timesheet_created",
        "timesheet_updated",
        "timesheet_submitted",
        "timesheet_approved",
        "timesheet_rejected",
        "comment_added",
        "comment_deleted",
        "leave_requested",
        "leave_approved",
        "leave_rejected",
        "member_added",
        "member_removed",
      ] as ActivityAction[],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["timesheet", "leave_request", "team"] as ActivityTargetType[],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index: auto-delete after 1 year
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Query indexes
ActivityLogSchema.index({ teamId: 1, createdAt: -1 });
ActivityLogSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
```

- [ ] **Step 2: Export from models/index.ts**

Add to `src/models/index.ts`:

```typescript
export { default as ActivityLog } from "./ActivityLog";
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/ActivityLog.ts src/models/index.ts
git commit -m "feat: add ActivityLog model with TTL and query indexes"
```

---

### Task 3: Activity Log Helper

**Files:**
- Create: `src/lib/activity-log.ts`

- [ ] **Step 1: Create helper function**

Create `src/lib/activity-log.ts`:

```typescript
import { ActivityLog } from "@/models";
import type { ActivityAction, ActivityTargetType } from "@/types";
import { Types } from "mongoose";

interface LogActivityParams {
  userId: string | Types.ObjectId;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
  teamId?: string | Types.ObjectId;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await ActivityLog.create({
      userId: params.userId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      teamId: params.teamId,
    });
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error("Failed to log activity:", error);
  }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/activity-log.ts
git commit -m "feat: add logActivity helper (fire-and-forget)"
```

---

### Task 4: Team Activity API Endpoint

**Files:**
- Create: `src/app/api/team/activity/route.ts`

- [ ] **Step 1: Create team activity endpoint**

Create `src/app/api/team/activity/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityLog, Team } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const memberId = searchParams.get("memberId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Get team member IDs for permission scoping
    let memberIds: string[] = [];

    if (session.user.role === "super_admin") {
      // super_admin sees all activity — no member filter needed
    } else {
      const teams = await Team.find({ adminId: session.user.id }).lean();
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((id: { toString: () => string }) => id.toString())
      );
      allMemberIds.push(session.user.id);
      memberIds = [...new Set(allMemberIds)];
    }

    // Build query
    const query: Record<string, unknown> = {};

    if (session.user.role !== "super_admin") {
      query.userId = { $in: memberIds };
    }
    if (action) {
      query.action = action;
    }
    if (memberId) {
      query.userId = memberId;
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      query.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      ActivityLog.find(query)
        .populate("userId", "name email image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching team activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch team activity" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/team/activity/route.ts
git commit -m "feat: add team activity log API endpoint"
```

---

### Task 5: Timesheet Activity API Endpoint

**Files:**
- Create: `src/app/api/timesheets/[id]/activity/route.ts`

- [ ] **Step 1: Create timesheet-specific activity endpoint**

Create `src/app/api/timesheets/[id]/activity/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityLog, Timesheet, Team } from "@/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    // Check timesheet exists and user has access
    const timesheet = await Timesheet.findById(id).lean();
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    // Permission: owner, team admin, or super_admin
    const isOwner = timesheet.userId.toString() === session.user.id;
    let hasAccess = isOwner || session.user.role === "super_admin";

    if (!hasAccess && session.user.role === "admin") {
      const teams = await Team.find({ adminId: session.user.id }).lean();
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((id: { toString: () => string }) => id.toString())
      );
      hasAccess = allMemberIds.includes(timesheet.userId.toString());
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await ActivityLog.find({
      targetId: id,
      targetType: "timesheet",
    })
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error("Error fetching timesheet activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheet activity" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/timesheets/[id]/activity/route.ts
git commit -m "feat: add timesheet-specific activity log endpoint"
```

---

### Task 6: Integrate Activity Logging into Existing API Routes

**Files:**
- Modify: `src/app/api/timesheets/route.ts` (timesheet_created)
- Modify: `src/app/api/timesheets/[id]/route.ts` (timesheet_updated)
- Modify: `src/app/api/timesheets/[id]/submit/route.ts` (timesheet_submitted)
- Modify: `src/app/api/timesheets/[id]/approve/route.ts` (timesheet_approved)
- Modify: `src/app/api/timesheets/[id]/reject/route.ts` (timesheet_rejected)
- Modify: `src/app/api/leave-requests/route.ts` (leave_requested)
- Modify: `src/app/api/leave-requests/[id]/route.ts` (leave_approved, leave_rejected via PATCH)
- Modify: `src/app/api/team/members/route.ts` (member_added, member_removed)

- [ ] **Step 1: Add logActivity calls to each route**

For each route, add `import { logActivity } from "@/lib/activity-log";` and call `logActivity()` after the successful operation (fire-and-forget, no await needed in response path — but use await to ensure it runs before response):

Example pattern for timesheet submit:
```typescript
// After successful status update, before returning response:
logActivity({
  userId: session.user.id,
  action: "timesheet_submitted",
  targetType: "timesheet",
  targetId: timesheet._id.toString(),
  metadata: { month: timesheet.month, year: timesheet.year },
  teamId: team?._id?.toString(),
});
```

Apply the same pattern to all listed routes with the appropriate action type.

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat: integrate activity logging into existing API routes"
```

---

### Task 7: Activity Log i18n Keys

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add activity log translation keys**

Add to both translation files under a new `"activity"` section:

```json
{
  "activity": {
    "title": "ประวัติกิจกรรม",
    "noActivity": "ไม่มีกิจกรรม",
    "filterByAction": "กรองตามประเภท",
    "filterByMember": "กรองตามสมาชิก",
    "filterByDate": "กรองตามวันที่",
    "allActions": "ทั้งหมด",
    "actions": {
      "timesheet_created": "สร้าง Timesheet",
      "timesheet_updated": "แก้ไข Timesheet",
      "timesheet_submitted": "ส่ง Timesheet",
      "timesheet_approved": "อนุมัติ Timesheet",
      "timesheet_rejected": "ปฏิเสธ Timesheet",
      "comment_added": "เพิ่มความคิดเห็น",
      "comment_deleted": "ลบความคิดเห็น",
      "leave_requested": "ขอลา",
      "leave_approved": "อนุมัติใบลา",
      "leave_rejected": "ปฏิเสธใบลา",
      "member_added": "เพิ่มสมาชิก",
      "member_removed": "ลบสมาชิก"
    }
  }
}
```

English equivalent with `"title": "Activity Log"`, etc.

- [ ] **Step 2: Commit**

```bash
git add messages/th.json messages/en.json
git commit -m "feat: add activity log i18n keys"
```

---

## Chunk 2: Comment/Feedback Feature

### Task 8: Comment Types and Validation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/validation/schemas.ts`

- [ ] **Step 1: Add TimesheetComment type**

Add to `src/types/index.ts`:

```typescript
// Timesheet Comment
export interface ITimesheetComment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  message: string;
  entryDate?: number; // day of month (1-31), links to specific entry
  createdAt: Date;
}
```

Update `ITimesheet` interface to add:
```typescript
comments?: ITimesheetComment[];
```

- [ ] **Step 2: Add comment validation schema**

Add to `src/lib/validation/schemas.ts`:

```typescript
export const timesheetCommentSchema = z.object({
  message: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be 500 characters or less"),
  entryDate: z.number().int().min(1).max(31).optional(),
});
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/validation/schemas.ts
git commit -m "feat: add TimesheetComment type and validation schema"
```

---

### Task 9: Update Timesheet Model with Comments

**Files:**
- Modify: `src/models/Timesheet.ts`

- [ ] **Step 1: Add comment embedded schema to Timesheet model**

Add before `TimesheetSchema` definition:

```typescript
const TimesheetCommentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, maxlength: 500 },
    entryDate: { type: Number, min: 1, max: 31 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);
```

Add to `TimesheetSchema` fields:

```typescript
comments: { type: [TimesheetCommentSchema], default: [] },
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/Timesheet.ts
git commit -m "feat: add comments embedded schema to Timesheet model"
```

---

### Task 10: Comment API Endpoints

**Files:**
- Create: `src/app/api/timesheets/[id]/comments/route.ts`
- Create: `src/app/api/timesheets/[id]/comments/[commentId]/route.ts`

- [ ] **Step 1: Create POST comment endpoint**

Create `src/app/api/timesheets/[id]/comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";
import { logActivity } from "@/lib/activity-log";
import { timesheetCommentSchema } from "@/lib/validation/schemas";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = timesheetCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    // Check timesheet exists
    const timesheet = await Timesheet.findById(id).lean();
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    // Permission: owner or team admin or super_admin
    const isOwner = timesheet.userId.toString() === session.user.id;
    let hasAccess = isOwner || session.user.role === "super_admin";

    if (!hasAccess && session.user.role === "admin") {
      const teams = await Team.find({ adminId: session.user.id }).lean();
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((mid: { toString: () => string }) => mid.toString())
      );
      hasAccess = allMemberIds.includes(timesheet.userId.toString());
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check max comments
    if (timesheet.comments && timesheet.comments.length >= 100) {
      return NextResponse.json(
        { error: "Maximum comments reached" },
        { status: 400 }
      );
    }

    // Add comment atomically
    const updated = await Timesheet.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            userId: session.user.id,
            message: validation.data.message,
            entryDate: validation.data.entryDate,
          },
        },
      },
      { new: true }
    )
      .populate("comments.userId", "name email image")
      .lean();

    // Log activity (fire-and-forget)
    logActivity({
      userId: session.user.id,
      action: "comment_added",
      targetType: "timesheet",
      targetId: id,
      metadata: { entryDate: validation.data.entryDate },
    });

    // Notify the other party
    // If commenter is owner → notify team admin; if commenter is admin → notify owner
    let notifyUserId: string | null = null;
    if (isOwner) {
      // Find team admin for this user
      const team = await Team.findOne({ memberIds: timesheet.userId }).lean();
      notifyUserId = team?.adminId?.toString() || null;
    } else {
      notifyUserId = timesheet.userId.toString();
    }

    if (notifyUserId && notifyUserId !== session.user.id) {
      createNotification({
        userId: notifyUserId,
        type: "timesheet_pending",
        title: "ความคิดเห็นใหม่",
        message: `${session.user.name} แสดงความคิดเห็นใน Timesheet เดือน ${timesheet.month}/${timesheet.year}`,
        link: `/timesheet/${id}`,
        metadata: { timesheetId: id },
      });
    }

    return NextResponse.json({ data: updated?.comments || [] });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create DELETE comment endpoint**

Create `src/app/api/timesheets/[id]/comments/[commentId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet } from "@/models";
import { logActivity } from "@/lib/activity-log";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id, commentId } = await params;

    // Find timesheet and check comment exists
    const timesheet = await Timesheet.findById(id).lean();
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    const comment = timesheet.comments?.find(
      (c: { _id: { toString: () => string } }) => c._id.toString() === commentId
    );
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only comment owner can delete
    if (comment.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove comment atomically
    await Timesheet.findByIdAndUpdate(id, {
      $pull: { comments: { _id: commentId } },
    });

    // Log activity
    logActivity({
      userId: session.user.id,
      action: "comment_deleted",
      targetType: "timesheet",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/timesheets/[id]/comments/
git commit -m "feat: add comment POST and DELETE API endpoints"
```

---

### Task 11: Comment UI Components

**Files:**
- Create: `src/components/timesheet/CommentSection.tsx`
- Create: `src/components/timesheet/CommentItem.tsx`
- Modify: Timesheet detail page (the page that renders timesheet entries)

- [ ] **Step 1: Create CommentItem component**

Create `src/components/timesheet/CommentItem.tsx` — displays a single comment with user avatar, name, message, timestamp, and delete button (if owner).

- [ ] **Step 2: Create CommentSection component**

Create `src/components/timesheet/CommentSection.tsx` — contains:
- List of comments (using CommentItem)
- Input field + submit button at bottom
- Optional `entryDate` prop to filter/scope comments to specific entry
- Uses `useTranslations("comments")` for i18n

- [ ] **Step 3: Integrate into timesheet detail page**

Add `<CommentSection timesheetId={id} comments={timesheet.comments} />` to the timesheet detail page, below the entries table.

Add comment badge icons next to entries that have comments.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/timesheet/
git commit -m "feat: add comment UI components and integrate into timesheet page"
```

---

### Task 12: Comment i18n Keys

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add comment translation keys**

Add to both files:

```json
{
  "comments": {
    "title": "ความคิดเห็น",
    "placeholder": "เขียนความคิดเห็น...",
    "submit": "ส่ง",
    "delete": "ลบ",
    "deleteConfirm": "ต้องการลบความคิดเห็นนี้?",
    "noComments": "ยังไม่มีความคิดเห็น",
    "maxReached": "ความคิดเห็นเต็มแล้ว",
    "entryComment": "ความคิดเห็นสำหรับวันที่ {date}",
    "generalComment": "ความคิดเห็นทั่วไป"
  }
}
```

English equivalent.

- [ ] **Step 2: Commit**

```bash
git add messages/th.json messages/en.json
git commit -m "feat: add comment i18n keys"
```

---

## Chunk 3: Team Dashboard Feature

### Task 13: Extend Dashboard API for Team Data

**Files:**
- Modify: `src/app/api/dashboard/route.ts`

- [ ] **Step 1: Add team dashboard data to existing endpoint**

In the existing dashboard route, add richer team data inside the `if (session.user.role === "admin")` block, after the existing `teamSummary` computation.

**Add imports** at top of file:
```typescript
import { LeaveRequest, LeaveBalance, ActivityLog } from "@/models";
```

Then add the team dashboard data:

```typescript
// Inside the existing `if (session.user.role === "admin" && leaderTeams.length > 0)` block,
// AFTER the existing teamSummary computation:
let teamDashboard = null;

if (session.user.role === "admin" && leaderTeams.length > 0) {
  // Get all team member IDs (deduplicated)
  const allMemberIds: string[] = [];
  const memberIdSet = new Set<string>();
  // ... (use existing member collection logic)

  // 1. Member status with timesheet info
  const memberTimesheets = await Timesheet.find({
    userId: { $in: Array.from(memberIdSet) },
    year: currentYear,
    month: currentMonth,
  }).lean();

  const timesheetMap = new Map(
    memberTimesheets.map((ts) => [ts.userId.toString(), ts])
  );

  const memberStatus = allMembers.map((member) => {
    const ts = timesheetMap.get(member._id);
    return {
      userId: member._id,
      name: member.name,
      timesheetStatus: ts?.status || null,
      totalHours: (ts?.totalBaseHours || 0) + (ts?.totalAdditionalHours || 0),
      leaveDaysThisMonth: ts?.entries?.filter(
        (e: { type: string }) => e.type === "leave"
      ).length || 0,
    };
  });

  // 2. Timesheet summary counts
  const statusCounts = { notCreated: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 };
  memberStatus.forEach((m) => {
    if (!m.timesheetStatus) statusCounts.notCreated++;
    else statusCounts[m.timesheetStatus as keyof typeof statusCounts]++;
  });

  // 3. Leave overview
  const leaveRequests = await LeaveRequest.find({
    userId: { $in: Array.from(memberIdSet) },
    status: "approved",
    $or: [
      { startDate: { $gte: new Date(currentYear, currentMonth - 1, 1) } },
      { endDate: { $lte: new Date(currentYear, currentMonth, 0) } },
    ],
  }).lean();

  const leaveBalances = await LeaveBalance.find({
    userId: { $in: Array.from(memberIdSet) },
    year: currentYear,
  }).lean();

  const balanceMap = new Map(
    leaveBalances.map((lb) => [lb.userId.toString(), lb])
  );

  const leaveOverview = allMembers.map((member) => {
    const memberLeaves = leaveRequests.filter(
      (lr) => lr.userId.toString() === member._id
    );
    const balance = balanceMap.get(member._id);
    return {
      userId: member._id,
      name: member.name,
      leaves: memberLeaves.map((lr) => ({
        startDate: lr.startDate,
        endDate: lr.endDate,
        type: lr.leaveType,
      })),
      quotaRemaining: balance ? {
        sick: (balance.quotas?.sick?.total || 0) - (balance.quotas?.sick?.used || 0),
        personal: (balance.quotas?.personal?.total || 0) - (balance.quotas?.personal?.used || 0),
        annual: (balance.quotas?.annual?.total || 0) - (balance.quotas?.annual?.used || 0),
      } : { sick: 0, personal: 0, annual: 0 },
    };
  });

  // 4. Recent activity
  const recentActivity = await ActivityLog.find({
    userId: { $in: Array.from(memberIdSet) },
  })
    .populate("userId", "name email image")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  teamDashboard = {
    timesheetSummary: statusCounts,
    members: memberStatus,
    leaveOverview,
    recentActivity,
  };
}
```

Add `teamDashboard` to the response object.

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/route.ts
git commit -m "feat: extend dashboard API with team data for admin role"
```

---

### Task 14: Team Dashboard UI Components

**Files:**
- Create: `src/components/dashboard/TimesheetStatusCards.tsx`
- Create: `src/components/dashboard/MemberStatusTable.tsx`
- Create: `src/components/dashboard/LeaveOverview.tsx`
- Create: `src/components/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: Create TimesheetStatusCards**

5 cards showing: notCreated / draft / submitted / approved / rejected counts. Each card clickable → navigates to `/team?status=<status>`.

Uses shadcn Card component, color-coded badges.

- [ ] **Step 2: Create MemberStatusTable**

Table with columns: Name, Timesheet Status, Total Hours, Leave Days. Sortable columns. Highlight rows where status is null (not created).

Uses shadcn Table component.

- [ ] **Step 3: Create LeaveOverview**

List of team members with their leave info this month and remaining quotas displayed as progress bars or numbers.

- [ ] **Step 4: Create ActivityFeed**

Simple list of 10 recent activities with: user avatar, action description (using i18n keys from Task 7), relative timestamp.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: add team dashboard UI components"
```

---

### Task 15: Integrate Team Dashboard into Dashboard Page

**Files:**
- Modify: Dashboard page component (the page that renders `/dashboard`)

- [ ] **Step 1: Add team dashboard section**

For admin users, render the new team components below existing dashboard content:

```tsx
{teamDashboard && (
  <>
    <TimesheetStatusCards summary={teamDashboard.timesheetSummary} />
    <MemberStatusTable members={teamDashboard.members} />
    <LeaveOverview data={teamDashboard.leaveOverview} />
    <ActivityFeed activities={teamDashboard.recentActivity} />
  </>
)}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat: integrate team dashboard components into dashboard page"
```

---

### Task 16: Team Dashboard i18n Keys

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add dashboard translation keys**

```json
{
  "teamDashboard": {
    "title": "ภาพรวมทีม",
    "timesheetStatus": "สถานะ Timesheet",
    "notCreated": "ยังไม่สร้าง",
    "memberStatus": "สถานะสมาชิก",
    "name": "ชื่อ",
    "status": "สถานะ",
    "totalHours": "ชั่วโมงรวม",
    "leaveDays": "วันลา",
    "leaveOverview": "ภาพรวมการลา",
    "quotaRemaining": "โควต้าคงเหลือ",
    "recentActivity": "กิจกรรมล่าสุด",
    "noMembers": "ไม่มีสมาชิกในทีม"
  }
}
```

English equivalent.

- [ ] **Step 2: Commit**

```bash
git add messages/th.json messages/en.json
git commit -m "feat: add team dashboard i18n keys"
```

---

## Chunk 4: Activity Log UI (Team Page Tab)

### Task 17: Activity Tab on Team Page

**Files:**
- Create: `src/components/team/ActivityTab.tsx`
- Modify: Team page to add Activity tab

- [ ] **Step 1: Create ActivityTab component**

Create `src/components/team/ActivityTab.tsx` — a full activity log view with:
- Filter by action type (dropdown using i18n keys)
- Filter by member (dropdown)
- Filter by date range (date picker)
- Paginated list of activities
- Each activity shows: user, action, target, timestamp

- [ ] **Step 2: Add Activity tab to team page**

Add a new tab to the existing team page using shadcn Tabs. The existing content becomes the first tab, Activity becomes the second.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/team/ src/app/
git commit -m "feat: add activity tab to team page with filters"
```

---

### Task 18: Timesheet Timeline on Detail Page

**Files:**
- Create: `src/components/timesheet/ActivityTimeline.tsx`
- Modify: Timesheet detail page

- [ ] **Step 1: Create ActivityTimeline component**

Create `src/components/timesheet/ActivityTimeline.tsx` — a vertical timeline showing:
- Each activity as a dot + description + timestamp
- Color-coded by action type
- Displayed on the side of the timesheet detail page

- [ ] **Step 2: Integrate into timesheet detail page**

Fetch activity from `/api/timesheets/[id]/activity` and render the timeline alongside the entries and comments.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/timesheet/ src/app/
git commit -m "feat: add activity timeline to timesheet detail page"
```

---

## Chunk 5: Final Verification

### Task 19: Full Build and Lint Check

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Fix any issues found**

Address any lint/build errors.

- [ ] **Step 4: Final commit**

```bash
git commit -m "fix: address lint and build issues for team features"
```
