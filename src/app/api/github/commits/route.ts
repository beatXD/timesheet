import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { GitHubRepoSettings } from "@/models";
import {
  getGitHubAccount,
  hasRepoScope,
  getRepoCommits,
  getGitHubUser,
  groupCommitsByDate,
} from "@/lib/github";
import type { IGitHubCommit } from "@/types";

// GET /api/github/commits - Get commits for a specific month/year
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const repoParam = searchParams.get("repo"); // Optional: specific repo (owner/name)

    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: "month and year are required" },
        { status: 400 }
      );
    }

    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    if (month < 1 || month > 12 || isNaN(year)) {
      return NextResponse.json(
        { error: "Invalid month or year" },
        { status: 400 }
      );
    }

    // Get GitHub account
    const account = await getGitHubAccount(session.user.id);

    if (!account) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    if (!hasRepoScope(account.scope)) {
      return NextResponse.json(
        { error: "GitHub account does not have repo scope" },
        { status: 403 }
      );
    }

    // Get GitHub username for filtering commits by author
    const githubUser = await getGitHubUser(account.accessToken);
    if (!githubUser) {
      return NextResponse.json(
        { error: "Failed to get GitHub user info" },
        { status: 500 }
      );
    }

    // Get enabled repositories
    await connectDB();
    const settings = await GitHubRepoSettings.findOne({
      userId: session.user.id,
    });

    if (!settings || settings.repositories.length === 0) {
      return NextResponse.json({
        data: {
          commits: [],
          groupedByDate: {},
          totalCommits: 0,
        },
      });
    }

    let enabledRepos = settings.repositories.filter((repo) => repo.enabled);

    // If specific repo is requested, filter to just that one
    if (repoParam) {
      enabledRepos = enabledRepos.filter((repo) => repo.fullName === repoParam);
      if (enabledRepos.length === 0) {
        return NextResponse.json(
          { error: "Repository not found or not enabled" },
          { status: 404 }
        );
      }
    }

    if (enabledRepos.length === 0) {
      return NextResponse.json({
        data: {
          commits: [],
          groupedByDate: {},
          totalCommits: 0,
        },
      });
    }

    // Calculate date range for the month
    const since = new Date(year, month - 1, 1, 0, 0, 0);
    const until = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // Fetch commits from repos in parallel
    const commitPromises = enabledRepos.map((repo) =>
      getRepoCommits(
        account.accessToken,
        repo.owner,
        repo.name,
        since,
        until,
        githubUser.login
      )
    );

    const repoCommits = await Promise.all(commitPromises);
    const allCommits: IGitHubCommit[] = repoCommits.flat();

    // Sort all commits by date
    allCommits.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group by date
    const groupedByDate = groupCommitsByDate(allCommits);

    return NextResponse.json({
      data: {
        commits: allCommits,
        groupedByDate,
        totalCommits: allCommits.length,
      },
    });
  } catch (error) {
    console.error("Error fetching GitHub commits:", error);
    return NextResponse.json(
      { error: "Failed to fetch commits" },
      { status: 500 }
    );
  }
}
