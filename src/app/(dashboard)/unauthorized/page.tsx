"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  const t = useTranslations("errors");

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t("unauthorized")}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{t("noPermission")}</p>
          <Link href="/dashboard">
            <Button>{t("backToDashboard")}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
