"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileQuestion,
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface TimesheetSummary {
  notCreated: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}

interface TimesheetStatusCardsProps {
  summary: TimesheetSummary;
}

const statusConfig = [
  {
    key: "notCreated" as const,
    icon: FileQuestion,
    bgColor: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
    countColor: "text-slate-700 dark:text-slate-300",
  },
  {
    key: "draft" as const,
    icon: FileEdit,
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    countColor: "text-yellow-700 dark:text-yellow-300",
  },
  {
    key: "submitted" as const,
    icon: Send,
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    countColor: "text-blue-700 dark:text-blue-300",
  },
  {
    key: "approved" as const,
    icon: CheckCircle2,
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    countColor: "text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "rejected" as const,
    icon: XCircle,
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    countColor: "text-rose-700 dark:text-rose-300",
  },
];

export default function TimesheetStatusCards({ summary }: TimesheetStatusCardsProps) {
  const t = useTranslations("teamDashboard");
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statusConfig.map(({ key, icon: Icon, bgColor, iconColor, countColor }) => (
        <Card
          key={key}
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/team?status=${key}`)}
        >
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`p-2 rounded-lg ${bgColor}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <span className={`text-2xl font-bold ${countColor}`}>
                {summary[key]}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(key)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
