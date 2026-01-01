import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PersonalTimesheet, User, Vendor, Project, Team } from "@/models";
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

    const timesheet = await PersonalTimesheet.findById(id).lean();

    if (!timesheet) {
      return NextResponse.json(
        { error: "Personal timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can export their personal timesheets
    if (timesheet.userId.toString() !== session.user.id) {
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

    // Find user's team and its associated project
    let team = null;
    let project = null;
    if (user.teamIds && user.teamIds.length > 0) {
      team = await Team.findById(user.teamIds[0]).lean();
      if (team?.projectId) {
        project = await Project.findById(team.projectId).lean();
      }
    }

    const buffer = await generateTimesheetPDF({
      timesheet: timesheet as any,
      user: user as any,
      vendor: vendor as any,
      project: project as any,
      team: team as any,
    });

    const monthYear = format(
      new Date(timesheet.year, timesheet.month - 1),
      "yyyy-MM"
    );
    const filename = `personal-timesheet-${user.name.replace(/\s+/g, "-")}-${monthYear}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting personal timesheet:", error);
    return NextResponse.json(
      { error: "Failed to export personal timesheet" },
      { status: 500 }
    );
  }
}
