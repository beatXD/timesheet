"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Eye,
  Check,
  X,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";
import { TeamSubmissionSummary } from "@/components/team";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface TeamLeader {
  _id: string;
  name: string;
  email: string;
}

interface TeamMemberRef {
  _id: string;
  name: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: TeamMemberRef[];
  adminId: TeamLeader;
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
  teamId?: string;
  teamName?: string;
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300",
};

export default function TeamPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const { data: session, status } = useSession();

  // Redirect admin to their dedicated page
  if (status !== "loading" && session?.user?.role === "super_admin") {
    redirect("/admin/timesheets/records");
  }

  // Redirect regular user to dashboard
  if (status !== "loading" && session?.user?.role === "user") {
    redirect("/calendar");
  }

  const [teams, setTeams] = useState<Team[]>([]);
  const [timesheets, setTimesheets] = useState<TeamTimesheet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const hasActiveFilters =
    filterYear !== currentYear.toString() ||
    filterMonth !== currentMonth.toString() ||
    filterTeam !== "all" ||
    filterStatus !== "all" ||
    searchQuery !== "";

  const clearFilters = () => {
    setFilterYear(currentYear.toString());
    setFilterMonth(currentMonth.toString());
    setFilterTeam("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, timesheetsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch(`/api/team/timesheets?year=${filterYear}&month=${filterMonth}`),
      ]);

      const teamsData = await teamsRes.json();
      const timesheetsData = await timesheetsRes.json();

      if (teamsData.data) {
        const myTeams = teamsData.data.filter(
          (team: Team) => team.adminId?._id === session?.user?.id
        );
        setTeams(myTeams);

        // Add team info to timesheets
        if (timesheetsData.data) {
          const timesheetsWithTeam = timesheetsData.data.map((ts: TeamTimesheet) => {
            const team = myTeams.find((t: Team) =>
              t.memberIds.some((m: TeamMemberRef) => m._id === ts.userId._id) ||
              t.adminId?._id === ts.userId._id
            );
            return {
              ...ts,
              teamId: team?._id,
              teamName: team?.name,
            };
          });
          setTimesheets(timesheetsWithTeam);
        }
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, session?.user?.id, t]);

  useEffect(() => {
    if (session?.user && session.user.role === "admin") {
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
    } catch {
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
    } catch {
      toast.error(t("errors.failedToReject"));
    }
  };

  // Filter timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      // Team filter
      if (filterTeam !== "all" && ts.teamId !== filterTeam) return false;
      // Status filter
      if (filterStatus !== "all" && ts.status !== filterStatus) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !ts.userId.name.toLowerCase().includes(query) &&
          !ts.userId.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [timesheets, filterTeam, filterStatus, searchQuery]);

  // Count pending
  const pendingCount = timesheets.filter((ts) => ts.status === "submitted").length;

  // Calculate submission stats for leader view
  const submissionStats = useMemo(() => {
    // Get all unique team members from leader's teams (including leader)
    const allMembers: TeamMember[] = [];
    const memberIdSet = new Set<string>();

    teams.forEach((team) => {
      // Include leader
      if (team.adminId && !memberIdSet.has(team.adminId._id)) {
        memberIdSet.add(team.adminId._id);
        allMembers.push({
          _id: team.adminId._id,
          name: team.adminId.name,
          email: team.adminId.email,
        });
      }
      // Include members
      team.memberIds.forEach((member) => {
        if (!memberIdSet.has(member._id)) {
          memberIdSet.add(member._id);
          allMembers.push({
            _id: member._id,
            name: member.name,
            email: member.email,
          });
        }
      });
    });

    // Find members who have submitted/approved timesheets
    const submittedUserIds = new Set(
      timesheets
        .filter((ts) => ["submitted", "approved"].includes(ts.status))
        .map((ts) => ts.userId._id)
    );

    // Find members who haven't submitted
    const notSubmittedMembers = allMembers.filter(
      (member) => !submittedUserIds.has(member._id)
    );

    return {
      totalMembers: allMembers.length,
      submittedCount: submittedUserIds.size,
      notSubmittedMembers,
    };
  }, [teams, timesheets]);

  // Show loading state
  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("team.title")}</h1>
          <p className="text-muted-foreground">{t("team.reviewApprove")}</p>
        </div>
        <div className="flex items-center gap-3">
          <TeamSubmissionSummary
            totalMembers={submissionStats.totalMembers}
            submittedCount={submissionStats.submittedCount}
            notSubmittedMembers={submissionStats.notSubmittedMembers}
            loading={loading}
          />
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {pendingCount} {t("team.pending")}
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("team.timesheets")}</CardTitle>
              <CardDescription>
                {format(new Date(parseInt(filterYear), parseInt(filterMonth) - 1), "MMMM yyyy", { locale: dateLocale })}
                {" • "}
                {filteredTimesheets.length} {t("common.records")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-36"
                />
              </div>
              {teams.length > 1 && (
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t("common.team")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allTeams")}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="submitted">{t("timesheet.status.submitted")}</SelectItem>
                  <SelectItem value="approved">{t("timesheet.status.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("timesheet.status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-28">
                  <SelectValue />
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
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium">{t("team.member")}</TableHead>
                  {teams.length > 1 && <TableHead className="text-xs font-medium">{t("common.team")}</TableHead>}
                  <TableHead className="text-xs font-medium">{t("common.status")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("team.baseHours")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("common.submitted")}</TableHead>
                  <TableHead className="text-xs font-medium text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((ts) => (
                  <TableRow key={ts._id} className="group">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={ts.userId.image} />
                          <AvatarFallback className="text-[10px]">
                            {ts.userId.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ts.userId.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {ts.userId.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {teams.length > 1 && (
                      <TableCell className="py-2">
                        <span className="text-xs text-muted-foreground">{ts.teamName || "-"}</span>
                      </TableCell>
                    )}
                    <TableCell className="py-2">
                      <Badge className={`text-[10px] px-1.5 py-0 font-normal ${statusColors[ts.status]}`}>
                        {t(`timesheet.status.${ts.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs tabular-nums">
                        {ts.totalBaseHours}h
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground">
                        {ts.submittedAt
                          ? format(new Date(ts.submittedAt), "d/M/yy HH:mm")
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/timesheet/${ts._id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        {ts.status === "submitted" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => approveTimesheet(ts._id)}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => rejectTimesheet(ts._id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTimesheets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={teams.length > 1 ? 6 : 5} className="text-center py-8 text-muted-foreground text-sm">
                      {t("team.noTimesheetsFound")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
