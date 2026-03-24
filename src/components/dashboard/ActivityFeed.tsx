"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActivityUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface Activity {
  _id: string;
  userId: ActivityUser;
  status: string;
  month: number;
  year: number;
  updatedAt: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const statusColors: Record<string, string> = {
  draft: "text-yellow-600 dark:text-yellow-400",
  submitted: "text-blue-600 dark:text-blue-400",
  approved: "text-emerald-600 dark:text-emerald-400",
  rejected: "text-rose-600 dark:text-rose-400",
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const t = useTranslations("teamDashboard");
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  if (!activities || activities.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noActivity")}</p>
        </CardContent>
      </Card>
    );
  }

  const getActionText = (status: string) => {
    switch (status) {
      case "submitted":
        return t("submittedTimesheet");
      case "approved":
        return t("approvedTimesheet");
      default:
        return t("updatedTimesheet");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {activities.map((activity) => {
            const userName = typeof activity.userId === "object" ? activity.userId.name : "Unknown";
            return (
              <div key={activity._id} className="flex items-center justify-between px-6 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{userName}</span>{" "}
                    <span className={cn("text-muted-foreground", statusColors[activity.status])}>
                      {getActionText(activity.status)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.month}/{activity.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.updatedAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
