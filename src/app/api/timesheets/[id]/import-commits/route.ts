import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet } from "@/models";
import { formatCommitsForTask } from "@/lib/github";
import type { IGitHubCommit } from "@/types";

interface ImportCommitsBody {
  commitsByDate: Record<number, IGitHubCommit[]>;
  mode: "append" | "replace";
}

// POST /api/timesheets/[id]/import-commits - Import GitHub commits into timesheet
export async function POST(
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

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can import
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only import to draft or rejected timesheets
    if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
      return NextResponse.json(
        { error: "Cannot import commits to timesheet in current status" },
        { status: 400 }
      );
    }

    const body: ImportCommitsBody = await request.json();
    const { commitsByDate, mode } = body;

    if (!commitsByDate || typeof commitsByDate !== "object") {
      return NextResponse.json(
        { error: "commitsByDate is required" },
        { status: 400 }
      );
    }

    if (!["append", "replace"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be 'append' or 'replace'" },
        { status: 400 }
      );
    }

    // Update entries with commit messages
    let updatedCount = 0;

    for (const entry of timesheet.entries) {
      const dayCommits = commitsByDate[entry.date];

      if (dayCommits && dayCommits.length > 0) {
        // Reconstruct commits to ensure proper format
        const commits: IGitHubCommit[] = dayCommits.map((c) => ({
          sha: c.sha,
          message: c.message,
          date: new Date(c.date),
          repo: c.repo,
          url: c.url,
        }));

        const formattedTask = formatCommitsForTask(commits);

        if (formattedTask) {
          if (mode === "replace") {
            entry.task = formattedTask;
          } else {
            // Append mode
            if (entry.task) {
              entry.task = `${entry.task}\n\n${formattedTask}`;
            } else {
              entry.task = formattedTask;
            }
          }
          updatedCount++;
        }
      }
    }

    // Reset status if rejected
    if (timesheet.status === "rejected") {
      timesheet.status = "draft";
      timesheet.rejectedReason = undefined;
    }

    await timesheet.save();

    return NextResponse.json({
      data: timesheet,
      message: `Imported commits to ${updatedCount} entries`,
      updatedCount,
    });
  } catch (error) {
    console.error("Error importing commits:", error);
    return NextResponse.json(
      { error: "Failed to import commits" },
      { status: 500 }
    );
  }
}
