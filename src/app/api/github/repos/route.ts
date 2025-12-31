import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGitHubAccount,
  hasRepoScope,
  getUserRepos,
} from "@/lib/github";

// GET /api/github/repos - Get list of user's GitHub repositories
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getGitHubAccount(session.user.id);

    if (!account) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    if (!hasRepoScope(account.scope)) {
      return NextResponse.json(
        { error: "GitHub account does not have repo scope. Please upgrade access." },
        { status: 403 }
      );
    }

    const repos = await getUserRepos(account.accessToken);

    // Transform to our format
    const data = repos.map((repo) => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
