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
