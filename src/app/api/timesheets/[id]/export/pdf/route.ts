import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, User, Vendor, Project } from "@/models";
import { generateTimesheetPDF } from "@/lib/export/pdf";
import { format } from "date-fns";

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

    const timesheet = await Timesheet.findById(id).lean();

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Check permission
    if (
      timesheet.userId.toString() !== session.user.id &&
      session.user.role === "user"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get related data
    const user = await User.findById(timesheet.userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const vendor = user.vendorId
      ? await Vendor.findById(user.vendorId).lean()
      : undefined;
    const project = user.teamId
      ? await Project.findOne({ _id: { $in: [user.teamId] } }).lean()
      : undefined;

    const buffer = await generateTimesheetPDF({
      timesheet: timesheet as any,
      user: user as any,
      vendor: vendor as any,
      project: project as any,
    });

    const monthYear = format(
      new Date(timesheet.year, timesheet.month - 1),
      "yyyy-MM"
    );
    const filename = `timesheet-${user.name.replace(/\s+/g, "-")}-${monthYear}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to export timesheet" },
      { status: 500 }
    );
  }
}
