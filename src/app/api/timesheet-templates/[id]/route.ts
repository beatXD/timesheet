import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimesheetTemplate } from "@/models";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/timesheet-templates/[id] - Get a specific template
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const template = await TimesheetTemplate.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT /api/timesheet-templates/[id] - Update a template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, entries, isDefault } = body;

    await connectDB();

    // Check ownership
    const existing = await TimesheetTemplate.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await TimesheetTemplate.updateMany(
        { userId: session.user.id, _id: { $ne: id }, isDefault: true },
        { isDefault: false }
      );
    }

    const updated = await TimesheetTemplate.findByIdAndUpdate(
      id,
      {
        name,
        description,
        entries,
        isDefault,
      },
      { new: true }
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating template:", error);

    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE /api/timesheet-templates/[id] - Delete a template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const deleted = await TimesheetTemplate.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
