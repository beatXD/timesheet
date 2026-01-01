import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, User, Vendor, Team } from "@/models";
import { generateTimesheetExcel } from "@/lib/export/excel";
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
    if (timesheet.userId.toString() !== session.user.id) {
      // Regular users can only export their own timesheets
      if (session.user.role === "user") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Leaders can only export their team members' timesheets
      if (session.user.role === "leader") {
        const teams = await Team.find({ leaderId: session.user.id });
        const allMemberIds = teams.flatMap((t: { memberIds: { toString: () => string }[] }) =>
          t.memberIds.map((id) => id.toString())
        );
        if (!allMemberIds.includes(timesheet.userId.toString())) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      // Admins can export all timesheets
    }

    // Get related data
    const user = await User.findById(timesheet.userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const vendor = user.vendorId
      ? await Vendor.findById(user.vendorId).lean()
      : undefined;

    // Find user's team
    let team = null;
    if (user.teamIds && user.teamIds.length > 0) {
      team = await Team.findById(user.teamIds[0]).lean();
    }

    const buffer = await generateTimesheetExcel({
      timesheet: timesheet as any,
      user: user as any,
      vendor: vendor as any,
      project: null,
      team: team as any,
    });

    const monthYear = format(
      new Date(timesheet.year, timesheet.month - 1),
      "yyyy-MM"
    );
    const filename = `timesheet-${user.name.replace(/\s+/g, "-")}-${monthYear}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
