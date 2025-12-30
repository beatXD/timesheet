"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Calendar, AlertCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface TeamTimesheetStats {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  memberCount: number;
  stats: {
    pending: number;
    approved: number;
    draft: number;
    totalBaseHours: number;
  };
}

export interface TeamLeaveStats {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  memberCount: number;
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    totalPendingDays: number;
  };
}

interface TeamOverviewCardProps {
  team: TeamTimesheetStats | TeamLeaveStats;
  variant: "timesheets" | "leaves";
  onClick: () => void;
}

function isTimesheetStats(
  team: TeamTimesheetStats | TeamLeaveStats
): team is TeamTimesheetStats {
  return "totalBaseHours" in team.stats;
}

export function TeamOverviewCard({
  team,
  variant,
  onClick,
}: TeamOverviewCardProps) {
  const t = useTranslations();

  const hasPending = team.stats.pending > 0;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
        hasPending ? "border-yellow-300 dark:border-yellow-600" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{team.teamName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("teamOverview.leader")}: {team.leaderName}
            </p>
          </div>
          {hasPending && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 animate-pulse"
            >
              <AlertCircle className="w-3 h-3" />
              {team.stats.pending}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {team.memberCount} {t("teamOverview.members")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-md">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-xs text-muted-foreground">
                {t("teamOverview.pending")}
              </p>
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                {team.stats.pending}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-500/10 rounded-md">
            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">
                {t("teamOverview.approved")}
              </p>
              <p className="font-semibold text-green-700 dark:text-green-400">
                {team.stats.approved}
              </p>
            </div>
          </div>
        </div>

        {variant === "timesheets" && isTimesheetStats(team) && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-md">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">
                {t("teamOverview.totalHours")}
              </p>
              <p className="font-semibold text-blue-700 dark:text-blue-400">
                {team.stats.totalBaseHours} {t("common.hours")}
              </p>
            </div>
          </div>
        )}

        {variant === "leaves" && !isTimesheetStats(team) && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-md flex-1">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("teamOverview.rejected")}
                </p>
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {team.stats.rejected}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-500/10 rounded-md flex-1">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("teamOverview.pendingDays")}
                </p>
                <p className="font-semibold text-orange-700 dark:text-orange-400">
                  {team.stats.totalPendingDays} {t("leave.days")}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={onClick}>
          {t("teamOverview.viewDetails")}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
