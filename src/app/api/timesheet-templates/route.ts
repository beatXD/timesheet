import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimesheetTemplate } from "@/models";

// GET /api/timesheet-templates - Get all templates for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const templates = await TimesheetTemplate.find({ userId: session.user.id })
      .sort({ isDefault: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/timesheet-templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, entries, isDefault } = body;

    if (!name || !entries) {
      return NextResponse.json(
        { error: "Name and entries are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // If setting as default, unset other defaults
    if (isDefault) {
      await TimesheetTemplate.updateMany(
        { userId: session.user.id, isDefault: true },
        { isDefault: false }
      );
    }

    const template = await TimesheetTemplate.create({
      userId: session.user.id,
      name,
      description,
      entries,
      isDefault: isDefault || false,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);

    // Handle duplicate name error
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
