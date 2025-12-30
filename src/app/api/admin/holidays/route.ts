import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Holiday } from "@/models";

// Thai public holidays for seeding
const thaiHolidays2025 = [
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-02-12", name: "Makha Bucha Day" },
  { date: "2025-04-06", name: "Chakri Memorial Day" },
  { date: "2025-04-13", name: "Songkran Festival" },
  { date: "2025-04-14", name: "Songkran Festival" },
  { date: "2025-04-15", name: "Songkran Festival" },
  { date: "2025-05-01", name: "Labour Day" },
  { date: "2025-05-04", name: "Coronation Day" },
  { date: "2025-05-12", name: "Visakha Bucha Day" },
  { date: "2025-06-03", name: "Queen Suthida's Birthday" },
  { date: "2025-07-28", name: "King's Birthday" },
  { date: "2025-08-12", name: "Queen Mother's Birthday" },
  { date: "2025-10-13", name: "King Bhumibol Memorial Day" },
  { date: "2025-10-23", name: "Chulalongkorn Day" },
  { date: "2025-12-05", name: "King Bhumibol's Birthday" },
  { date: "2025-12-10", name: "Constitution Day" },
  { date: "2025-12-31", name: "New Year's Eve" },
];

// GET /api/admin/holidays - List holidays
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year") || new Date().getFullYear();

    const holidays = await Holiday.find({ year: parseInt(year.toString()) })
      .sort({ date: 1 })
      .lean();

    return NextResponse.json({ data: holidays });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}

// POST /api/admin/holidays - Create holiday or seed Thai holidays
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Check if seeding Thai holidays
    if (body.seed && body.year) {
      const year = body.year;
      const holidays = thaiHolidays2025.map((h) => ({
        date: new Date(h.date.replace("2025", year.toString())),
        name: h.name,
        year,
        createdBy: session.user.id,
      }));

      // Delete existing holidays for the year
      await Holiday.deleteMany({ year });

      // Insert new holidays
      await Holiday.insertMany(holidays);

      return NextResponse.json({ message: `Seeded ${holidays.length} holidays for ${year}` });
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
    if (!session?.user || session.user.role !== "admin") {
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
    if (!session?.user || session.user.role !== "admin") {
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

    await Holiday.findByIdAndDelete(id);

    return NextResponse.json({ message: "Holiday deleted" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: "Failed to delete holiday" },
      { status: 500 }
    );
  }
}
