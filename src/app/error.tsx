"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Log error to console (winston can't be used in client components)
    console.error("Unhandled client error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
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
            {t("errorOccurred")}
          </h1>
          <p className="text-muted-foreground">
            {t("errorDescription")}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              {t("errorId")} {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            {t("tryAgain")}
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/dashboard")}
          >
            {t("backToDashboard")}
          </Button>
        </div>
      </div>
    </div>
  );
}
