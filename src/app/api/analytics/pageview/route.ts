import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface PageViewPayload {
  url: string;
  referrer: string;
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const data: PageViewPayload = await request.json();

    // Log the page view
    logger.info("Page View", {
      url: data.url,
      referrer: data.referrer,
      timestamp: data.timestamp,
    });

    // In production, store for analytics dashboard
    // - Track unique visitors
    // - Popular pages
    // - User journeys

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
