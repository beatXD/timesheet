import type { IGitHubCommit } from "@/types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiResponse {
  candidates?: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
  error?: {
    message: string;
  };
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Summarize multiple commits for a day into a single concise summary
 */
async function summarizeDayCommits(
  commits: IGitHubCommit[],
  apiKey: string
): Promise<string> {
  if (commits.length === 0) return "";

  // If only one commit and it's short, return as-is
  if (commits.length === 1 && commits[0].message.length <= 60) {
    return commits[0].message;
  }

  const commitMessages = commits.map((c) => `- ${c.message}`).join("\n");

  const prompt = `Summarize these git commit messages into concise bullet points. Group similar changes together. Each bullet should be short (under 50 characters). Output only the bullet points starting with "- ", no quotes or explanation.

Commits:
${commitMessages}`;

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      }),
    }
  );

  if (!response.ok) {
    console.error("Gemini API error:", response.status);
    return commits.map((c) => c.message).join("; ");
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    console.error("Gemini API error:", data.error.message);
    return commits.map((c) => c.message).join("; ");
  }

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    commits.map((c) => c.message).join("; ")
  );
}

/**
 * Summarize grouped commits by date - combines all commits per day into a single summary
 */
export async function summarizeGroupedCommits(
  groupedCommits: Record<number, IGitHubCommit[]>
): Promise<Record<number, IGitHubCommit[]>> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured");
    return groupedCommits;
  }

  const result: Record<number, IGitHubCommit[]> = {};

  // Process each day's commits in parallel
  const days = Object.keys(groupedCommits).map(Number);
  const summaries = await Promise.all(
    days.map(async (day) => {
      const dayCommits = groupedCommits[day];
      try {
        const summary = await summarizeDayCommits(dayCommits, apiKey);
        return { day, summary, originalCommits: dayCommits };
      } catch (error) {
        console.error(`Error summarizing commits for day ${day}:`, error);
        return { day, summary: null, originalCommits: dayCommits };
      }
    })
  );

  // Build result with single summary commit per day
  for (const { day, summary, originalCommits } of summaries) {
    if (summary) {
      // Create a single "summary" commit for the day
      const firstCommit = originalCommits[0];
      result[day] = [
        {
          sha: "summary",
          message: summary,
          originalMessage: originalCommits.map((c) => c.message).join("\n"),
          date: firstCommit.date,
          repo: firstCommit.repo,
          url: firstCommit.url,
        },
      ];
    } else {
      // Fallback to original commits if summarization failed
      result[day] = originalCommits;
    }
  }

  return result;
}
