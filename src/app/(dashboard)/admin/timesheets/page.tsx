"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
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
import {
  Eye,
  Check,
  X,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
  finalApprovedAt?: string;
}

interface TeamGroup {
  team: Team;
  timesheets: TeamTimesheet[];
  totalMembers: number;
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  team_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  final_approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

export default function AdminTimesheetsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTeam, setProcessingTeam] = useState<string | null>(null);

  // Filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterStatus, setFilterStatus] = useState<string>("team_submitted");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: filterYear,
        month: filterMonth,
      });
      if (filterStatus && filterStatus !== "all") {
        params.append("status", filterStatus);
      }

      const res = await fetch(`/api/admin/timesheets?${params}`);
      const data = await res.json();

      if (data.data) {
        setTeamGroups(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, filterStatus, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const approveTeam = async (teamId: string) => {
    if (!confirm(t("admin.timesheets.confirmApproveTeam"))) return;

    setProcessingTeam(teamId);
    try {
      const res = await fetch("/api/admin/timesheets/approve", {
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
        toast.error(data.error || t("errors.failedToApprove"));
        return;
      }

      toast.success(t("admin.timesheets.teamApproved"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToApprove"));
    } finally {
      setProcessingTeam(null);
    }
  };

  const rejectTeam = async (teamId: string) => {
    const reason = prompt(t("admin.timesheets.enterRejectReason"));
    if (!reason) return;

    setProcessingTeam(teamId);
    try {
      const res = await fetch("/api/admin/timesheets/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          month: parseInt(filterMonth),
          year: parseInt(filterYear),
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToReject"));
        return;
      }

      toast.success(t("admin.timesheets.teamRejected"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToReject"));
    } finally {
      setProcessingTeam(null);
    }
  };

  const approveIndividual = async (timesheetId: string) => {
    try {
      const res = await fetch("/api/admin/timesheets/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timesheetIds: [timesheetId] }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToApprove"));
        return;
      }

      toast.success(t("success.approved"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToApprove"));
    }
  };

  const rejectIndividual = async (timesheetId: string) => {
    const reason = prompt(t("team.enterReason"));
    if (!reason) return;

    try {
      const res = await fetch("/api/admin/timesheets/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timesheetIds: [timesheetId], reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToReject"));
        return;
      }

      toast.success(t("success.rejected"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToReject"));
    }
  };

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMMM yyyy", { locale: dateLocale });
  };

  const totalTeams = teamGroups.length;
  const totalTimesheets = teamGroups.reduce((sum, g) => sum + g.timesheets.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.timesheets.title")}</h1>
          <p className="text-muted-foreground">{t("admin.timesheets.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              <SelectItem value="team_submitted">{t("timesheet.status.team_submitted")}</SelectItem>
              <SelectItem value="final_approved">{t("timesheet.status.final_approved")}</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalTeams}</div>
            <p className="text-xs text-muted-foreground">{t("admin.timesheets.teamsSubmitted")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalTimesheets}</div>
            <p className="text-xs text-muted-foreground">{t("admin.timesheets.totalTimesheets")}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {teamGroups.map((group) => {
            const finalApprovedCount = group.timesheets.filter(
              (ts) => ts.status === "final_approved"
            ).length;
            const progressPercent =
              group.timesheets.length > 0
                ? (finalApprovedCount / group.timesheets.length) * 100
                : 0;
            const allTeamSubmitted = group.timesheets.every(
              (ts) => ts.status === "team_submitted"
            );
            const allFinalApproved = group.timesheets.every(
              (ts) => ts.status === "final_approved"
            );

            return (
              <Card key={group.team._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {group.team.name}
                      </CardTitle>
                      <CardDescription>
                        {getMonthName(parseInt(filterMonth), parseInt(filterYear))}
                        {" • "}
                        {group.timesheets.length} {t("admin.timesheets.members")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {finalApprovedCount}/{group.timesheets.length}{" "}
                          {t("admin.timesheets.finalApproved")}
                        </p>
                        <Progress value={progressPercent} className="w-32 h-2" />
                      </div>
                      {allTeamSubmitted && !allFinalApproved && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveTeam(group.team._id)}
                            disabled={processingTeam === group.team._id}
                            className="gap-2"
                            variant="default"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {t("admin.timesheets.approveAll")}
                          </Button>
                          <Button
                            onClick={() => rejectTeam(group.team._id)}
                            disabled={processingTeam === group.team._id}
                            variant="destructive"
                            className="gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            {t("admin.timesheets.rejectAll")}
                          </Button>
                        </div>
                      )}
                      {allFinalApproved && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                          {t("admin.timesheets.completed")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("team.member")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("team.baseHours")}</TableHead>
                        <TableHead>{t("admin.timesheets.teamSubmittedAt")}</TableHead>
                        <TableHead className="text-right">
                          {t("common.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.timesheets.map((ts) => (
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
                            {ts.teamSubmittedAt
                              ? format(
                                  new Date(ts.teamSubmittedAt),
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
                              {ts.status === "team_submitted" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => approveIndividual(ts._id)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => rejectIndividual(ts._id)}
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
                </CardContent>
              </Card>
            );
          })}

          {teamGroups.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  {t("admin.timesheets.noTimesheets")}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
