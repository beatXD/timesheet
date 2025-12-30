"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Check, X, Send, Users } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: string[];
  leaderId: string;
}

interface TeamTimesheet {
  _id: string;
  userId: TeamMember;
  month: number;
  year: number;
  status: TimesheetStatus;
  totalBaseHours: number;
  totalAdditionalHours: number;
  submittedAt?: string;
  approvedAt?: string;
  teamSubmittedAt?: string;
}

interface TeamProgress {
  team: Team;
  timesheets: TeamTimesheet[];
  memberCount: number;
  approvedCount: number;
  submittedCount: number;
  draftCount: number;
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  team_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  final_approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

export default function TeamPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const { data: session } = useSession();

  const [teams, setTeams] = useState<Team[]>([]);
  const [timesheets, setTimesheets] = useState<TeamTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingTeam, setSubmittingTeam] = useState<string | null>(null);

  // Filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch teams and timesheets
      const [teamsRes, timesheetsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch(`/api/team/timesheets?year=${filterYear}&month=${filterMonth}`),
      ]);

      const teamsData = await teamsRes.json();
      const timesheetsData = await timesheetsRes.json();

      if (teamsData.data) {
        // Filter teams where current user is leader
        const myTeams = teamsData.data.filter(
          (team: Team) =>
            team.leaderId === session?.user?.id || session?.user?.role === "admin"
        );
        setTeams(myTeams);
      }

      if (timesheetsData.data) {
        setTimesheets(timesheetsData.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, session?.user?.id, session?.user?.role, t]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [fetchData, session?.user]);

  const approveTimesheet = async (id: string) => {
    try {
      const res = await fetch(`/api/timesheets/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToApprove"));
        return;
      }

      toast.success(t("success.timesheetApproved"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToApprove"));
    }
  };

  const rejectTimesheet = async (id: string) => {
    const reason = prompt(t("team.enterReason"));
    if (!reason) return;

    try {
      const res = await fetch(`/api/timesheets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToReject"));
        return;
      }

      toast.success(t("success.timesheetRejected"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToReject"));
    }
  };

  const submitTeamToAdmin = async (teamId: string) => {
    if (!confirm(t("team.confirmSubmitToAdmin"))) return;

    setSubmittingTeam(teamId);
    try {
      const res = await fetch("/api/team/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          month: parseInt(filterMonth),
          year: parseInt(filterYear),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToSubmit"));
        return;
      }

      toast.success(t("team.teamSubmittedToAdmin"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToSubmit"));
    } finally {
      setSubmittingTeam(null);
    }
  };

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMMM yyyy", { locale: dateLocale });
  };

  // Calculate team progress
  const getTeamProgress = (team: Team): TeamProgress => {
    const teamTimesheets = timesheets.filter((ts) =>
      team.memberIds.includes(ts.userId._id)
    );

    const approvedCount = teamTimesheets.filter(
      (ts) => ts.status === "approved"
    ).length;
    const submittedCount = teamTimesheets.filter(
      (ts) => ts.status === "submitted"
    ).length;
    const draftCount = team.memberIds.length - teamTimesheets.length;

    return {
      team,
      timesheets: teamTimesheets,
      memberCount: team.memberIds.length,
      approvedCount,
      submittedCount,
      draftCount,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("team.title")}</h1>
          <p className="text-muted-foreground">{t("team.reviewApprove")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("common.month")} />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {format(new Date(2024, m - 1), "MMMM", { locale: dateLocale })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder={t("common.year")} />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const progress = getTeamProgress(team);
            const canSubmitToAdmin =
              progress.approvedCount === progress.memberCount &&
              progress.memberCount > 0;
            const progressPercent =
              progress.memberCount > 0
                ? (progress.approvedCount / progress.memberCount) * 100
                : 0;

            return (
              <Card key={team._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {team.name}
                      </CardTitle>
                      <CardDescription>
                        {getMonthName(parseInt(filterMonth), parseInt(filterYear))}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {progress.approvedCount}/{progress.memberCount}{" "}
                          {t("team.approved")}
                        </p>
                        <Progress value={progressPercent} className="w-32 h-2" />
                      </div>
                      <Button
                        onClick={() => submitTeamToAdmin(team._id)}
                        disabled={!canSubmitToAdmin || submittingTeam === team._id}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {submittingTeam === team._id
                          ? t("common.submitting")
                          : t("team.submitToAdmin")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {progress.timesheets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("team.noTimesheetsFound")}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("team.member")}</TableHead>
                          <TableHead>{t("common.status")}</TableHead>
                          <TableHead>{t("team.baseHours")}</TableHead>
                          <TableHead>{t("common.submitted")}</TableHead>
                          <TableHead className="text-right">
                            {t("common.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {progress.timesheets.map((ts) => (
                          <TableRow key={ts._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={ts.userId.image} />
                                  <AvatarFallback>
                                    {ts.userId.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{ts.userId.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ts.userId.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[ts.status]}>
                                {t(`timesheet.status.${ts.status}`)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ts.totalBaseHours} {t("common.hours")}
                            </TableCell>
                            <TableCell>
                              {ts.submittedAt
                                ? format(
                                    new Date(ts.submittedAt),
                                    "dd/MM/yyyy HH:mm"
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/timesheet/${ts._id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                                {ts.status === "submitted" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => approveTimesheet(ts._id)}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => rejectTimesheet(ts._id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {teams.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  {t("team.noTeams")}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
