import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveSettings } from "@/models";
import { leaveSettingsSchema, validateRequest } from "@/lib/validation/schemas";

// GET /api/admin/leave-settings - Get leave settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const settings = await LeaveSettings.getSettings();

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Error fetching leave settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave settings" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/leave-settings - Update leave settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = validateRequest(leaveSettingsSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { defaultQuotas, resetMonth } = validation.data;

    await connectDB();

    const settings = await LeaveSettings.getSettings();

    // Update settings with validated data
    settings.defaultQuotas.sick = defaultQuotas.sick;
    settings.defaultQuotas.personal = defaultQuotas.personal;
    settings.defaultQuotas.annual = defaultQuotas.annual;
    settings.resetMonth = resetMonth;

    settings.updatedBy = session.user.id as any;
    await settings.save();

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Error updating leave settings:", error);
    return NextResponse.json(
      { error: "Failed to update leave settings" },
      { status: 500 }
    );
  }
}
