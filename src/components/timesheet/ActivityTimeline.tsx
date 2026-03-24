"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ActivityUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface ActivityLog {
  _id: string;
  userId: ActivityUser;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const ACTION_DOT_COLORS: Record<string, string> = {
  timesheet_created: "bg-gray-400",
  timesheet_updated: "bg-orange-400",
  timesheet_submitted: "bg-blue-500",
  timesheet_approved: "bg-green-500",
  timesheet_rejected: "bg-red-500",
  timesheet_comment: "bg-yellow-400",
  leave_requested: "bg-blue-400",
  leave_approved: "bg-green-400",
  leave_rejected: "bg-red-400",
  member_added: "bg-green-400",
  member_removed: "bg-red-400",
};

interface ActivityTimelineProps {
  timesheetId: string;
}

export function ActivityTimeline({ timesheetId }: ActivityTimelineProps) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/timesheets/${timesheetId}/activity`);
        const data = await res.json();
        if (data.data) {
          setActivities(data.data);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [timesheetId]);

  const getActionText = (action: string): string => {
    try {
      return t(`actions.${action}`);
    } catch {
      return action.replace(/_/g, " ");
    }
  };

  const getDotColor = (action: string): string => {
    return ACTION_DOT_COLORS[action] || "bg-gray-400";
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noActivity")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("timeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 border-l-2 border-muted space-y-4">
          {activities.map((activity) => (
            <div key={activity._id} className="relative">
              <div
                className={`absolute -left-[25px] w-3 h-3 rounded-full ${getDotColor(activity.action)}`}
              />
              <div className="text-sm">
                <span className="font-medium">{activity.userId.name}</span>
                <span className="text-muted-foreground ml-1">
                  {getActionText(activity.action)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatRelativeTime(activity.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
