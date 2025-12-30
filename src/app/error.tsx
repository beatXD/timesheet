"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    logger.error("Unhandled client error", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-muted-foreground">
            ขออภัย เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            ลองอีกครั้ง
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/dashboard")}
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    </div>
  );
}
