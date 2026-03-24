import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Holiday, Timesheet } from "@/models";
import { cachedFetch, CacheTTL, CacheKeys, invalidateCache } from "@/lib/cache";
import { fetchHolidayData } from "@/lib/holidays";

// GET /api/admin/holidays - List holidays
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    // Use cache for holiday queries (cache for 1 hour)
    const holidays = await cachedFetch(
      CacheKeys.holidays(year),
      CacheTTL.LONG,
      async () => {
        return Holiday.find({ year }).sort({ date: 1 }).lean();
      }
    );

    return NextResponse.json({ data: holidays });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}

// POST /api/admin/holidays - Create holiday or seed holidays
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Check if seeding holidays
    if (body.seed && body.year) {
      const year = parseInt(body.year);

      const { holidays: holidayData, source } = await fetchHolidayData(year);

      const holidays = holidayData.map((h) => ({
        date: new Date(h.date),
        name: h.name,
        year,
        createdBy: new Types.ObjectId(session.user.id),
      }));

      // Delete existing holidays for the year (by date range for safety)
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      await Holiday.deleteMany({
        date: { $gte: startOfYear, $lte: endOfYear },
      });

      // Insert new holidays using bulkWrite with upsert to handle any edge cases
      const bulkOps = holidays.map((h) => ({
        updateOne: {
          filter: { date: h.date },
          update: { $set: h },
          upsert: true,
        },
      }));
      await Holiday.bulkWrite(bulkOps);

      // Invalidate cache for this year after seeding
      invalidateCache(`holidays:${year}`);

      return NextResponse.json({
        message: `Imported ${holidays.length} holidays for ${year} from ${source}`,
        count: holidays.length,
        source,
      });
    }

    // Create single holiday
    const { date, name } = body;

    if (!date || !name) {
      return NextResponse.json(
        { error: "Date and name are required" },
        { status: 400 }
      );
    }

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    const holiday = await Holiday.create({
      date: holidayDate,
      name,
      year,
      createdBy: session.user.id,
    });

    // Invalidate cache for this year
    invalidateCache(`holidays:${year}`);

    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (error) {
    console.error("Error creating holiday:", error);
    return NextResponse.json(
      { error: "Failed to create holiday" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/holidays - Update holiday
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { _id, date, name } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Holiday ID is required" },
        { status: 400 }
      );
    }

    const holidayDate = date ? new Date(date) : undefined;

    // Check for duplicate holiday on the same date (if date is being updated)
    if (holidayDate) {
      const existingHoliday = await Holiday.findOne({
        date: holidayDate,
        _id: { $ne: _id },
      });
      if (existingHoliday) {
        return NextResponse.json(
          { error: "A holiday already exists on this date" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = { name };
    if (holidayDate) {
      updateData.date = holidayDate;
      updateData.year = holidayDate.getFullYear();
    }

    const holiday = await Holiday.findByIdAndUpdate(_id, updateData, {
      new: true,
    });

    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    // Invalidate cache for this year
    invalidateCache(`holidays:${holiday.year}`);

    return NextResponse.json({ data: holiday });
  } catch (error) {
    console.error("Error updating holiday:", error);
    return NextResponse.json(
      { error: "Failed to update holiday" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/holidays - Delete holiday
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Holiday ID is required" },
        { status: 400 }
      );
    }

    // Find the holiday to get its date
    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return NextResponse.json(
        { error: "Holiday not found" },
        { status: 404 }
      );
    }

    // Check if any timesheets reference this holiday date
    const holidayDate = new Date(holiday.date);
    const affectedTimesheets = await Timesheet.countDocuments({
      month: holidayDate.getMonth() + 1,
      year: holidayDate.getFullYear(),
      "entries.date": holidayDate.getDate(),
      "entries.type": "holiday",
    });

    if (affectedTimesheets > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete. This holiday is referenced in ${affectedTimesheets} timesheet(s). Consider updating those timesheets first.`,
        },
        { status: 400 }
      );
    }

    await Holiday.findByIdAndDelete(id);

    // Invalidate cache for this year
    invalidateCache(`holidays:${holidayDate.getFullYear()}`);

    return NextResponse.json({ message: "Holiday deleted" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: "Failed to delete holiday" },
      { status: 500 }
    );
  }
}
