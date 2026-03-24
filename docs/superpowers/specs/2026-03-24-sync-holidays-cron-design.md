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
7. Invalidate holiday cache for `nextYear`
8. Return JSON summary: `{ added, skipped, total, source, year }`

**Merge logic detail:**
```
existingDates = Set of ISO date strings from Holiday.find({ year: nextYear })
newHolidays = holidayData.filter(h => !existingDates.has(h.date))
// Only insert newHolidays, skip the rest
```

### 3. Vercel cron config — `vercel.json`

Add entry:
```json
{
  "path": "/api/cron/sync-holidays",
  "schedule": "0 0 1 12 *"
}
```

Schedule: `0 0 1 12 *` = 00:00 UTC on December 1st

### 4. Files changed

| File | Action |
|------|--------|
| `src/lib/holidays.ts` | **Create** — shared holiday data & functions |
| `src/app/api/admin/holidays/route.ts` | **Modify** — import from `lib/holidays.ts`, remove inline definitions |
| `src/app/api/cron/sync-holidays/route.ts` | **Create** — cron handler |
| `vercel.json` | **Modify** — add cron entry |

### 5. What does NOT change

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
- Calendarific failure: silent fallback to built-in, logged as warning
- No built-in data for year: use approximation (existing behavior in `generateThaiHolidays`)
