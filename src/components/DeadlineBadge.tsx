"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getDeadlineStatus } from "@/lib/deadline";
import type { TimesheetStatus } from "@/types";

interface DeadlineBadgeProps {
  month: number;
  year: number;
  timesheetStatus: TimesheetStatus;
}

export function DeadlineBadge({ month, year, timesheetStatus }: DeadlineBadgeProps) {
  const t = useTranslations("deadline");

  // Only show for draft timesheets
  if (timesheetStatus !== "draft") {
    return null;
  }

  const { status, daysLeft } = getDeadlineStatus(month, year);

  if (status === "normal") {
    return null;
  }

  const config = {
    warning: {
      label: t("daysLeft", { days: daysLeft }),
      className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    },
    urgent: {
      label: t("lastDay"),
      className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
    overdue: {
      label: t("overdue"),
      className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
  } as const;

  const { label, className } = config[status];

  return (
    <Badge className={`text-[10px] px-1.5 py-0 font-normal ${className}`}>
      {label}
    </Badge>
  );
}
