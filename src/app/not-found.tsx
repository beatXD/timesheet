"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("notFound.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("notFound.description")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/dashboard">{t("notFound.backToDashboard")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/timesheet">{t("notFound.goToTimesheet")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
