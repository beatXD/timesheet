"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeaveInfo {
  startDate: string;
  endDate: string;
  type: string;
}

interface MemberLeaveOverview {
  userId: string;
  name: string;
  leaves: LeaveInfo[];
  quotaRemaining: {
    sick: number;
    personal: number;
    annual: number;
  };
}

interface LeaveOverviewProps {
  data: MemberLeaveOverview[];
}

const leaveTypeBadge: Record<string, string> = {
  sick: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  personal: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  annual: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800",
};

export default function LeaveOverview({ data }: LeaveOverviewProps) {
  const t = useTranslations("teamDashboard");

  const membersWithLeaves = data.filter((m) => m.leaves.length > 0);

  if (membersWithLeaves.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("leaveOverview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noLeaves")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("leaveOverview")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {membersWithLeaves.map((member) => (
          <div key={member.userId} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{member.name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t("quotaRemaining")}:</span>
                <span>{t("sick")} {member.quotaRemaining.sick}</span>
                <span>{t("personal")} {member.quotaRemaining.personal}</span>
                <span>{t("annual")} {member.quotaRemaining.annual}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.leaves.map((leave, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={leaveTypeBadge[leave.type] || ""}
                >
                  {t(leave.type as "sick" | "personal" | "annual")}{" "}
                  {format(new Date(leave.startDate), "dd/MM")}
                  {leave.startDate !== leave.endDate && (
                    <> - {format(new Date(leave.endDate), "dd/MM")}</>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
