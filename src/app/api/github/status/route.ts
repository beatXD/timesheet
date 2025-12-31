import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGitHubAccount,
  hasRepoScope,
  getGitHubUser,
} from "@/lib/github";

// GET /api/github/status - Check GitHub connection status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getGitHubAccount(session.user.id);

    if (!account) {
      return NextResponse.json({
        data: {
          connected: false,
          hasRepoScope: false,
          username: null,
        },
      });
    }

    // Get GitHub username
    const githubUser = await getGitHubUser(account.accessToken);

    return NextResponse.json({
      data: {
        connected: true,
        hasRepoScope: hasRepoScope(account.scope),
        username: githubUser?.login || null,
      },
    });
  } catch (error) {
    console.error("Error checking GitHub status:", error);
    return NextResponse.json(
      { error: "Failed to check GitHub status" },
      { status: 500 }
    );
  }
}
