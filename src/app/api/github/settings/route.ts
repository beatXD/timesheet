import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { GitHubRepoSettings } from "@/models";
import type { IGitHubRepository } from "@/types";

// GET /api/github/settings - Get user's GitHub repo settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const settings = await GitHubRepoSettings.findOne({
      userId: session.user.id,
    });

    return NextResponse.json({
      data: settings || { repositories: [] },
    });
  } catch (error) {
    console.error("Error fetching GitHub settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/github/settings - Update user's GitHub repo settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { repositories } = body as { repositories: IGitHubRepository[] };

    if (!Array.isArray(repositories)) {
      return NextResponse.json(
        { error: "repositories must be an array" },
        { status: 400 }
      );
    }

    await connectDB();

    const settings = await GitHubRepoSettings.findOneAndUpdate(
      { userId: session.user.id },
      {
        userId: session.user.id,
        repositories,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      data: settings,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating GitHub settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
