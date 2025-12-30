import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: "connected" | "disconnected" | "error";
      latency?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export async function GET() {
  const startTime = Date.now();

  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: process.uptime(),
    checks: {
      database: {
        status: "disconnected",
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
    },
  };

  // Check database connection
  try {
    await connectDB();
    const dbStart = Date.now();

    // Ping the database
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }

    health.checks.database = {
      status: "connected",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = "unhealthy";
    health.checks.database = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };

  // Determine overall status
  if (health.checks.database.status !== "connected") {
    health.status = "unhealthy";
  } else if (health.checks.memory.percentage > 90) {
    health.status = "degraded";
  }

  // Return appropriate status code
  const statusCode = health.status === "healthy" ? 200 :
                     health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}

// Kubernetes liveness probe
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
