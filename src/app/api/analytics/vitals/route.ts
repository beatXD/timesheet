import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface VitalsPayload {
  name: string;
  value: number;
  id: string;
  rating: string;
  page: string;
}

export async function POST(request: Request) {
  try {
    const data: VitalsPayload = await request.json();

    // Log the metric
    logger.info("Web Vitals", {
      metric: data.name,
      value: data.value,
      rating: data.rating,
      page: data.page,
    });

    // In production, you might want to:
    // 1. Store in database for historical analysis
    // 2. Send to external analytics service (DataDog, New Relic, etc.)
    // 3. Aggregate and alert on poor ratings

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
