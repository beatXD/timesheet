"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Eye, Check, X, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";
import { TeamStatsGrid, TeamTimesheetStats, TeamSubmissionSummary } from "@/components/team";

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
  leaderId: TeamLeader;
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAdmin = session?.user?.role === "admin";
  const selectedTeamId = searchParams.get("team");
  const showOverview = isAdmin && !selectedTeamId;

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStats, setTeamStats] = useState<TeamTimesheetStats[]>([]);
  const [timesheets, setTimesheets] = useState<TeamTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterTeam, setFilterTeam] = useState<string>(selectedTeamId || "all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Update filterTeam when selectedTeamId changes
  useEffect(() => {
    if (selectedTeamId) {
      setFilterTeam(selectedTeamId);
    }
  }, [selectedTeamId]);

  // Fetch team stats for admin overview
  const fetchTeamStats = useCallback(async () => {
    if (!isAdmin) return;

    setStatsLoading(true);
    try {
      const res = await fetch(
        `/api/team/stats?type=timesheets&year=${filterYear}&month=${filterMonth}`
      );
      const data = await res.json();
      if (data.data) {
        setTeamStats(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin, filterYear, filterMonth, t]);

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
          (team: Team) =>
            team.leaderId?._id === session?.user?.id || session?.user?.role === "admin"
        );
        setTeams(myTeams);

        // Add team info to timesheets
        if (timesheetsData.data) {
          const timesheetsWithTeam = timesheetsData.data.map((ts: TeamTimesheet) => {
            const team = myTeams.find((t: Team) =>
              t.memberIds.some((m: TeamMemberRef) => m._id === ts.userId._id) ||
              t.leaderId?._id === ts.userId._id
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
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, session?.user?.id, session?.user?.role, t]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
      if (isAdmin) {
        fetchTeamStats();
      }
    }
  }, [fetchData, fetchTeamStats, session?.user, isAdmin]);

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
      if (isAdmin) fetchTeamStats();
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
      if (isAdmin) fetchTeamStats();
    } catch (error) {
      toast.error(t("errors.failedToReject"));
    }
  };

  const handleTeamClick = (teamId: string) => {
    router.push(`/team?team=${teamId}`);
  };

  const handleBackToOverview = () => {
    router.push("/team");
    setFilterTeam("all");
  };

  // Get selected team name
  const selectedTeamName = useMemo(() => {
    if (!selectedTeamId) return null;
    const team = teams.find((t) => t._id === selectedTeamId);
    return team?.name;
  }, [selectedTeamId, teams]);

  // Filter timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      // Team filter - for admin drill-down, filter by selected team
      if (selectedTeamId && ts.teamId !== selectedTeamId) return false;
      // Team filter - for regular filter dropdown
      if (!selectedTeamId && filterTeam !== "all" && ts.teamId !== filterTeam) return false;
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
  }, [timesheets, filterTeam, filterStatus, searchQuery, selectedTeamId]);

  // Count pending
  const pendingCount = timesheets.filter((ts) => ts.status === "submitted").length;

  // Calculate submission stats for leader view
  const submissionStats = useMemo(() => {
    if (isAdmin) return null;

    // Get all unique team members from leader's teams (including leader)
    const allMembers: TeamMember[] = [];
    const memberIdSet = new Set<string>();

    teams.forEach((team) => {
      // Include leader
      if (team.leaderId && !memberIdSet.has(team.leaderId._id)) {
        memberIdSet.add(team.leaderId._id);
        allMembers.push({
          _id: team.leaderId._id,
          name: team.leaderId.name,
          email: team.leaderId.email,
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
        .filter((ts) => ["submitted", "approved", "team_submitted", "final_approved"].includes(ts.status))
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
  }, [isAdmin, teams, timesheets]);

  // Admin Overview Mode
  if (showOverview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("team.title")}</h1>
            <p className="text-muted-foreground">{t("teamOverview.selectTeam")}</p>
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
              <SelectTrigger className="w-24">
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

        <TeamStatsGrid
          teams={teamStats}
          variant="timesheets"
          loading={statsLoading}
          onTeamClick={handleTeamClick}
        />
      </div>
    );
  }

  // Detail View (for both admin drill-down and leader)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isAdmin && selectedTeamId && (
            <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("teamOverview.backToOverview")}
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {selectedTeamName ? selectedTeamName : t("team.title")}
            </h1>
            <p className="text-muted-foreground">{t("team.reviewApprove")}</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} {t("team.pending")}
          </Badge>
        )}
      </div>

      {/* Submission Summary for Leader */}
      {!isAdmin && submissionStats && (
        <TeamSubmissionSummary
          totalMembers={submissionStats.totalMembers}
          submittedCount={submissionStats.submittedCount}
          notSubmittedMembers={submissionStats.notSubmittedMembers}
          loading={loading}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("team.timesheets")}</CardTitle>
              <CardDescription>
                {format(new Date(parseInt(filterYear), parseInt(filterMonth) - 1), "MMMM yyyy", { locale: dateLocale })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-40"
                />
              </div>
              {!selectedTeamId && (
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="w-36">
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
                <SelectTrigger className="w-36">
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
                <SelectTrigger className="w-24">
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("team.member")}</TableHead>
                  {!selectedTeamId && <TableHead>{t("common.team")}</TableHead>}
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("team.baseHours")}</TableHead>
                  <TableHead>{t("common.submitted")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((ts) => (
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
                    {!selectedTeamId && (
                      <TableCell>
                        <Badge variant="outline">{ts.teamName || "-"}</Badge>
                      </TableCell>
                    )}
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
                        ? format(new Date(ts.submittedAt), "dd/MM/yyyy HH:mm")
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
                {filteredTimesheets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={selectedTeamId ? 5 : 6} className="text-center py-8 text-muted-foreground">
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
