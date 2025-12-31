import clientPromise from "@/lib/mongodb-client";
import type { IGitHubCommit } from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
}

interface GitHubApiCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  html_url: string;
}

interface GitHubApiUser {
  login: string;
  id: number;
}

/**
 * Get GitHub access token for a user from the accounts collection
 */
export async function getGitHubAccount(
  userId: string
): Promise<{ accessToken: string; scope: string; username?: string } | null> {
  const client = await clientPromise;
  const db = client.db();

  // First find the NextAuth user by email
  const { ObjectId } = await import("mongodb");

  // Get user email from our User collection
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user) return null;

  // Find NextAuth user
  const nextAuthUser = await db
    .collection("users")
    .findOne({ email: user.email });

  if (!nextAuthUser) return null;

  // Find GitHub account
  const account = await db.collection("accounts").findOne({
    userId: nextAuthUser._id,
    provider: "github",
  });

  if (!account || !account.access_token) return null;

  return {
    accessToken: account.access_token,
    scope: account.scope || "",
    username: account.providerAccountId,
  };
}

/**
 * Check if the GitHub account has repo scope
 */
export function hasRepoScope(scope: string): boolean {
  return scope.includes("repo") || scope.includes("public_repo");
}

/**
 * Get GitHub user info
 */
export async function getGitHubUser(
  accessToken: string
): Promise<GitHubApiUser | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch repositories the user has access to
 */
export async function getUserRepos(
  accessToken: string
): Promise<GitHubApiRepo[]> {
  const repos: GitHubApiRepo[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const response = await fetch(
        `${GITHUB_API_BASE}/user/repos?per_page=${perPage}&page=${page}&sort=pushed&direction=desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) break;

      const data: GitHubApiRepo[] = await response.json();
      if (data.length === 0) break;

      repos.push(...data);
      if (data.length < perPage) break;

      page++;
      // Limit to 500 repos max to avoid rate limiting
      if (repos.length >= 500) break;
    }
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
  }

  return repos;
}

/**
 * Fetch commits from a repository within a date range
 */
export async function getRepoCommits(
  accessToken: string,
  owner: string,
  repo: string,
  since: Date,
  until: Date,
  author?: string
): Promise<IGitHubCommit[]> {
  const commits: IGitHubCommit[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const params = new URLSearchParams({
        since: since.toISOString(),
        until: until.toISOString(),
        per_page: perPage.toString(),
        page: page.toString(),
      });

      if (author) {
        params.set("author", author);
      }

      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) break;

      const data: GitHubApiCommit[] = await response.json();
      if (data.length === 0) break;

      commits.push(
        ...data.map((commit) => ({
          sha: commit.sha.substring(0, 7),
          message: cleanCommitMessage(commit.commit.message),
          date: new Date(commit.commit.author.date),
          repo: `${owner}/${repo}`,
          url: commit.html_url,
        }))
      );

      if (data.length < perPage) break;
      page++;

      // Limit to 500 commits per repo
      if (commits.length >= 500) break;
    }
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
  }

  return commits;
}

/**
 * Clean commit message - remove merge commits and truncate
 */
function cleanCommitMessage(message: string): string {
  // Get only first line
  let cleaned = message.split("\n")[0];

  // Truncate if too long
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 197) + "...";
  }

  return cleaned;
}

/**
 * Check if commit is a merge commit
 */
export function isMergeCommit(message: string): boolean {
  const mergePatterns = [
    /^Merge pull request/i,
    /^Merge branch/i,
    /^Merge remote-tracking/i,
    /^Merge commit/i,
  ];

  return mergePatterns.some((pattern) => pattern.test(message));
}

/**
 * Format commits for task field
 * For AI summaries, use message as-is. Otherwise just the commit message.
 */
export function formatCommitsForTask(commits: IGitHubCommit[]): string {
  // Filter out merge commits
  const filteredCommits = commits.filter(
    (commit) => !isMergeCommit(commit.message)
  );

  if (filteredCommits.length === 0) return "";

  // For AI summary (single summary commit), return message directly
  if (filteredCommits.length === 1 && filteredCommits[0].sha === "summary") {
    return filteredCommits[0].message;
  }

  // For regular commits, just return the messages
  return filteredCommits.map((commit) => commit.message).join("\n");
}

/**
 * Group commits by date (day of month)
 */
export function groupCommitsByDate(
  commits: IGitHubCommit[]
): Record<number, IGitHubCommit[]> {
  const grouped: Record<number, IGitHubCommit[]> = {};

  for (const commit of commits) {
    const day = commit.date.getDate();
    if (!grouped[day]) {
      grouped[day] = [];
    }
    grouped[day].push(commit);
  }

  // Sort commits within each day by date (newest first)
  for (const day in grouped) {
    grouped[day].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return grouped;
}

/**
 * Build GitHub OAuth URL with repo scope
 */
export function buildGitHubOAuthUrl(callbackUrl: string): string {
  const clientId = process.env.AUTH_GITHUB_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/github`;

  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri,
    scope: "repo user:email",
    state: Buffer.from(JSON.stringify({ callbackUrl })).toString("base64"),
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}
