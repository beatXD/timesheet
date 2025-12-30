"use client";

import { useTranslations } from "next-intl";
import {
  TeamOverviewCard,
  TeamTimesheetStats,
  TeamLeaveStats,
} from "./TeamOverviewCard";

interface TeamStatsGridProps {
  teams: (TeamTimesheetStats | TeamLeaveStats)[];
  variant: "timesheets" | "leaves";
  loading?: boolean;
  onTeamClick: (teamId: string) => void;
}

export function TeamStatsGrid({
  teams,
  variant,
  loading = false,
  onTeamClick,
}: TeamStatsGridProps) {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-muted animate-pulse rounded-lg"
          ></div>
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t("teamOverview.noTeams")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamOverviewCard
          key={team.teamId}
          team={team}
          variant={variant}
          onClick={() => onTeamClick(team.teamId)}
        />
      ))}
    </div>
  );
}
