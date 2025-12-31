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
 * Summarize grouped commits by date - uses single API call for all days
 * Throws an error if summarization fails
 */
export async function summarizeGroupedCommits(
  groupedCommits: Record<number, IGitHubCommit[]>
): Promise<Record<number, IGitHubCommit[]>> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const days = Object.keys(groupedCommits).map(Number).sort((a, b) => a - b);

  if (days.length === 0) {
    return {};
  }

  // Build single prompt for all days
  const daysSections = days
    .map((day) => {
      const commits = groupedCommits[day];
      const commitMessages = commits.map((c) => `  - ${c.message}`).join("\n");
      const minBullets = Math.max(3, Math.ceil(commits.length / 3));
      return `DAY ${day} (${commits.length} commits, min ${minBullets} bullets):\n${commitMessages}`;
    })
    .join("\n\n");

  const prompt = `Summarize git commits for each day into bullet points.

Output format - for EACH day output exactly:
DAY X:
- bullet point 1
- bullet point 2
...

Rules:
- Output ONLY the day headers and bullet points
- No intro, no explanations, no extra text
- Each bullet starts with "- "
- Keep distinct features separate
- Be descriptive

${daysSections}`;

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
            thinkingConfig: { thinkingBudget: 1024 },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.error?.message || `HTTP ${response.status}`;
      console.error("Gemini API error:", response.status, errorMessage);

      if (response.status === 429) {
        const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
        const retrySeconds = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]))
          : 60;
        throw new Error(
          `Rate limit exceeded. Please wait ${retrySeconds} seconds and try again.`
        );
      }

      throw new Error(`Gemini API: ${errorMessage}`);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      throw new Error("Gemini API returned empty response");
    }

    // Parse response into day-based summaries
    const result: Record<number, IGitHubCommit[]> = {};
    const dayPattern = /DAY\s+(\d+):\s*([\s\S]*?)(?=DAY\s+\d+:|$)/gi;
    let match;

    while ((match = dayPattern.exec(text)) !== null) {
      const day = parseInt(match[1]);
      let summary = match[2].trim();

      // Clean up - ensure starts with bullet
      const firstBulletIndex = summary.indexOf("- ");
      if (firstBulletIndex > 0) {
        summary = summary.substring(firstBulletIndex);
      }

      // Remove empty lines
      summary = summary
        .split("\n")
        .filter((line) => line.trim() && line.trim() !== "-" && line.trim() !== "- ")
        .join("\n");

      if (summary && groupedCommits[day]) {
        const firstCommit = groupedCommits[day][0];
        result[day] = [
          {
            sha: "summary",
            message: summary,
            originalMessage: groupedCommits[day].map((c) => c.message).join("\n"),
            date: firstCommit.date,
            repo: firstCommit.repo,
            url: firstCommit.url,
          },
        ];
      }
    }

    // Fallback for unparsed days
    for (const day of days) {
      if (!result[day]) {
        result[day] = groupedCommits[day];
      }
    }

    const summaryCount = Object.values(result).filter(
      (commits) => commits.length === 1 && commits[0].sha === "summary"
    ).length;

    if (summaryCount === 0) {
      throw new Error("AI summarization failed - could not parse response");
    }

    return result;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}
