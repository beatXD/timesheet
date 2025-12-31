import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGeminiConfigured, summarizeGroupedCommits } from "@/lib/gemini";
import type { IGitHubCommit } from "@/types";

// POST /api/ai/summarize-commits - Summarize commit messages using AI
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "AI not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { groupedCommits } = body as {
      groupedCommits: Record<number, IGitHubCommit[]>;
    };

    if (!groupedCommits) {
      return NextResponse.json(
        { error: "groupedCommits is required" },
        { status: 400 }
      );
    }

    const summarized = await summarizeGroupedCommits(groupedCommits);

    return NextResponse.json({
      data: {
        groupedCommits: summarized,
      },
    });
  } catch (error) {
    console.error("Error summarizing commits:", error);
    return NextResponse.json(
      { error: "Failed to summarize commits" },
      { status: 500 }
    );
  }
}

// GET /api/ai/summarize-commits - Check if AI summarization is available
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        available: isGeminiConfigured(),
      },
    });
  } catch (error) {
    console.error("Error checking AI availability:", error);
    return NextResponse.json(
      { error: "Failed to check AI availability" },
      { status: 500 }
    );
  }
}
