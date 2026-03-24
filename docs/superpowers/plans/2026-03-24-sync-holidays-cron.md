# Sync Holidays Cron — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Vercel cron job that auto-seeds next year's Thai holidays on December 1st, with merge-only behavior.

**Architecture:** Extract shared holiday data/functions into `lib/holidays.ts`, shared cron auth into `lib/cron.ts`, then build the cron route. Refactor existing routes to use shared modules.

**Tech Stack:** Next.js App Router, Mongoose, Vercel Cron, Calendarific API

**Spec:** `docs/superpowers/specs/2026-03-24-sync-holidays-cron-design.md`

---

## Chunk 1: Shared Utilities

### Task 1: Create shared cron auth utility

**Files:**
- Create: `src/lib/cron.ts`

- [ ] **Step 1: Create `src/lib/cron.ts`**

```typescript
import { NextRequest } from "next/server";

export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}
```

- [ ] **Step 2: Update `deadline-reminder` to use shared utility**

Modify: `src/app/api/cron/deadline-reminder/route.ts`

Remove the inline `verifyCronSecret` function (lines 8-17). Add import:

```typescript
import { verifyCronSecret } from "@/lib/cron";
```

- [ ] **Step 3: Update `reset-leave-balance` to use shared utility**

Modify: `src/app/api/cron/reset-leave-balance/route.ts`

Remove the inline `verifyCronSecret` function (lines 6-16). Add import:

```typescript
import { verifyCronSecret } from "@/lib/cron";
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cron.ts src/app/api/cron/deadline-reminder/route.ts src/app/api/cron/reset-leave-balance/route.ts
git commit -m "refactor: extract shared verifyCronSecret into lib/cron.ts"
```

---

### Task 2: Extract shared holiday logic

**Files:**
- Create: `src/lib/holidays.ts`
- Modify: `src/app/api/admin/holidays/route.ts`

- [ ] **Step 1: Create `src/lib/holidays.ts`**

Move the following from `src/app/api/admin/holidays/route.ts` into this new file:
- `CalendarificHoliday` interface (lines 9-15)
- `CalendarificResponse` interface (lines 18-22)
- `fixedThaiHolidays` constant (lines 25-41)
- `buddhistHolidaysApprox` constant (lines 45-76)
- `generateThaiHolidays(year)` function (lines 79-112)
- `fetchFromCalendarific(year)` function (lines 115-143)

Add new orchestrator function:

```typescript
export async function fetchHolidayData(
  year: number
): Promise<{ holidays: { date: string; name: string }[]; source: string }> {
  // Try Calendarific first
  const calendarificData = await fetchFromCalendarific(year);
  if (calendarificData && calendarificData.length > 0) {
    return { holidays: calendarificData, source: "Calendarific API" };
  }

  // Fallback to built-in Thai holidays
  if (calendarificData !== null) {
    console.warn(`[Holidays] Calendarific returned empty for ${year}, using built-in`);
  }
  return { holidays: generateThaiHolidays(year), source: "Built-in Thai holidays" };
}
```

Export all functions and constants that admin route needs.

- [ ] **Step 2: Update admin holidays route to import from `lib/holidays.ts`**

Modify: `src/app/api/admin/holidays/route.ts`

Remove all moved code (interfaces, constants, functions — lines 8-143). Add imports:

```typescript
import {
  fetchFromCalendarific,
  generateThaiHolidays,
  fetchHolidayData,
} from "@/lib/holidays";
```

The POST handler's seed logic (lines 194-199) should use `fetchHolidayData(year)` instead of calling `fetchFromCalendarific` and `generateThaiHolidays` separately:

```typescript
// Replace lines 194-199:
const { holidays: holidayData } = await fetchHolidayData(year);

const holidays = holidayData.map((h) => ({
  date: new Date(h.date),
  name: h.name,
  year,
  createdBy: new Types.ObjectId(session.user.id),
}));
```

The rest of POST (delete + bulkWrite + cache invalidation) stays the same.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/holidays.ts src/app/api/admin/holidays/route.ts
git commit -m "refactor: extract shared holiday logic into lib/holidays.ts"
```

---

## Chunk 2: Cron Route & Config

### Task 3: Create sync-holidays cron route

**Files:**
- Create: `src/app/api/cron/sync-holidays/route.ts`

- [ ] **Step 1: Create the cron route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Holiday } from "@/models";
import { verifyCronSecret } from "@/lib/cron";
import { fetchHolidayData } from "@/lib/holidays";
import { invalidateCache, CacheKeys } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Calculate next year in Bangkok timezone (UTC+7)
    const nowUTC = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(nowUTC.getTime() + bangkokOffset);
    const nextYear = bangkokNow.getFullYear() + 1;

    // Fetch holiday data (Calendarific → fallback to built-in)
    const { holidays: holidayData, source } = await fetchHolidayData(nextYear);

    // Query existing holidays for next year
    const existingHolidays = await Holiday.find({ year: nextYear }).lean();
    const existingDates = new Set(
      existingHolidays.map((h) =>
        new Date(h.date).toISOString().split("T")[0]
      )
    );

    // Filter to only new holidays
    const newHolidays = holidayData.filter(
      (h) => !existingDates.has(h.date)
    );

    if (newHolidays.length === 0) {
      console.log(
        `[Cron] All holidays for ${nextYear} already exist, skipped`
      );
      return NextResponse.json({
        data: {
          message: `All holidays for ${nextYear} already exist`,
          year: nextYear,
          added: 0,
          skipped: holidayData.length,
          total: holidayData.length,
        },
      });
    }

    // Insert only new holidays
    const bulkOps = newHolidays.map((h) => ({
      insertOne: {
        document: {
          date: new Date(h.date),
          name: h.name,
          year: nextYear,
        },
      },
    }));
    await Holiday.bulkWrite(bulkOps);

    // Invalidate cache
    invalidateCache(CacheKeys.holidays(nextYear));

    const added = newHolidays.length;
    const skipped = holidayData.length - added;

    console.log(
      `[Cron] Synced ${added} holidays for ${nextYear} from ${source}`
    );

    return NextResponse.json({
      data: {
        message: `Synced holidays for ${nextYear}`,
        year: nextYear,
        source,
        added,
        skipped,
        total: holidayData.length,
      },
    });
  } catch (error) {
    console.error("[Cron] Error in sync-holidays:", error);
    return NextResponse.json(
      { error: "Failed to sync holidays" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/sync-holidays/route.ts
git commit -m "feat: add sync-holidays cron route"
```

---

### Task 4: Add Vercel cron config

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add cron entry to `vercel.json`**

Add to the `crons` array:

```json
{
  "path": "/api/cron/sync-holidays",
  "schedule": "0 0 1 12 *"
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add sync-holidays cron schedule to vercel.json"
```

---

## Chunk 3: Lint & Final Verification

### Task 5: Final verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Fix any issues and commit if needed**

If lint or build fails, fix the issues and commit.
