# Sync Holidays Cron — Design Spec

## Overview

A Vercel cron job that automatically seeds next year's Thai public holidays into the database on December 1st each year. Uses Calendarific API with fallback to built-in Thai holidays data, and merges with existing records (add-only, no overwrite).

## Requirements

- **Schedule**: December 1st, 00:00 UTC (07:00 Bangkok time) — once per year
- **Target**: Next year (currentYear + 1)
- **Data source**: Calendarific API first, fallback to built-in Thai holidays
- **Merge behavior**: Insert only holidays with dates not already in DB; skip existing dates
- **Auth**: Verified via `CRON_SECRET` (same pattern as existing crons)

## Architecture

### 1. Shared holiday logic — `src/lib/holidays.ts` (new file)

Extract from `src/app/api/admin/holidays/route.ts` into a reusable module:

**Moved (not duplicated):**
- `CalendarificHoliday`, `CalendarificResponse` interfaces
- `fixedThaiHolidays` constant
- `buddhistHolidaysApprox` constant
- `generateThaiHolidays(year)` function
- `fetchFromCalendarific(year)` function

**New:**
- `fetchHolidayData(year)` — orchestrates: try Calendarific → fallback to generateThaiHolidays. Returns `{ holidays: { date: string; name: string }[], source: string }`

The admin route (`src/app/api/admin/holidays/route.ts`) will be updated to import from `lib/holidays.ts` instead of defining these inline.

### 2. Cron route — `src/app/api/cron/sync-holidays/route.ts` (new file)

```
GET /api/cron/sync-holidays
```

**Flow:**
1. Verify `CRON_SECRET` via Authorization header (same as deadline-reminder)
2. Calculate `nextYear` using Bangkok timezone (UTC+7)
3. Call `fetchHolidayData(nextYear)` from `lib/holidays.ts`
4. Query existing holidays for `nextYear` from DB → build Set of existing date strings
5. Filter holiday data to only dates NOT in the existing Set
6. `bulkWrite` with `insertOne` for new holidays only
7. Invalidate holiday cache using `invalidateCache(CacheKeys.holidays(nextYear))`
8. Return JSON summary: `{ added, skipped, total, source, year }`

**Merge logic detail:**
```
// Holidays are stored at midnight UTC. Convert Date objects to "YYYY-MM-DD" strings
// using toISOString().split('T')[0] for reliable comparison.
existingDates = Set of date strings from Holiday.find({ year: nextYear }).lean()
  → map each doc.date via toISOString().split('T')[0]
newHolidays = holidayData.filter(h => !existingDates.has(h.date))
// Only insert newHolidays, skip the rest
```

**Insert document shape:** Each inserted holiday includes `{ date, name, year }`. The `createdBy` field is omitted (it is optional in the schema) since the cron has no user session. This distinguishes cron-seeded holidays from admin-created ones.

**Note on admin seed vs cron merge:** The admin seed operation (POST with `seed: true`) deletes all existing holidays for the year before re-inserting — a "replace all" operation. The cron is intentionally "fill gaps" only, preserving any holidays that admins have manually added or edited.

### 3. Shared cron auth — `src/lib/cron.ts` (new file)

Extract `verifyCronSecret(request)` from existing cron routes into a shared utility. All three cron routes will import from this file instead of defining the function inline.

### 4. Vercel cron config — `vercel.json`

Add entry:
```json
{
  "path": "/api/cron/sync-holidays",
  "schedule": "0 0 1 12 *"
}
```

Schedule: `0 0 1 12 *` = 00:00 UTC on December 1st

### 5. Files changed

| File | Action |
|------|--------|
| `src/lib/holidays.ts` | **Create** — shared holiday data & functions |
| `src/lib/cron.ts` | **Create** — shared `verifyCronSecret` utility |
| `src/app/api/admin/holidays/route.ts` | **Modify** — import from `lib/holidays.ts`, remove inline definitions |
| `src/app/api/cron/sync-holidays/route.ts` | **Create** — cron handler |
| `src/app/api/cron/deadline-reminder/route.ts` | **Modify** — import `verifyCronSecret` from `lib/cron.ts` |
| `src/app/api/cron/reset-leave-balance/route.ts` | **Modify** — import `verifyCronSecret` from `lib/cron.ts` |
| `vercel.json` | **Modify** — add cron entry |

### 6. What does NOT change

- Holiday Mongoose model (`src/models/Holiday.ts`)
- Holiday TypeScript interface (`src/types/index.ts`)
- Admin holiday UI components
- Timesheet sync-holidays routes
- Other cron routes

## Response Format

Success:
```json
{
  "data": {
    "message": "Synced holidays for 2027",
    "year": 2027,
    "source": "Calendarific API",
    "added": 15,
    "skipped": 5,
    "total": 20
  }
}
```

No new holidays to add:
```json
{
  "data": {
    "message": "All holidays for 2027 already exist",
    "year": 2027,
    "added": 0,
    "skipped": 20,
    "total": 20
  }
}
```

## Error Handling

- Missing/invalid `CRON_SECRET`: 401
- DB connection failure: 500 with error log
- Calendarific API key missing: treated as "not configured", fallback to built-in (not an error)
- Calendarific API key present but request fails: fallback to built-in, logged as warning
- Calendarific returns empty results: fallback to built-in
- No built-in data for year: use approximation (existing behavior in `generateThaiHolidays`)

## Logging

Use `[Cron]` prefix consistent with existing cron routes:

- `[Cron] Synced 15 holidays for 2027 from Calendarific API`
- `[Cron] All holidays for 2027 already exist, skipped`
- `[Cron] Calendarific failed, using built-in Thai holidays`

## Limitations

- Buddhist holiday approximations (`buddhistHolidaysApprox`) are hardcoded for 2024-2028. For years beyond 2028, the fallback uses 2025 dates with adjusted year — these will be inaccurate for lunar holidays and should be verified by admin after sync.
