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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";
import { TeamSubmissionSummary, ActivityTab } from "@/components/team";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    redirect("/team/calendar");
  }

  const [teams, setTeams] = useState<Team[]>([]);
  const [timesheets, setTimesheets] = useState<TeamTimesheet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const hasActiveFilters =
    filterYear !== currentYear.toString() ||
    filterMonth !== "all" ||
    filterTeam !== "all" ||
    filterStatus !== "all" ||
    searchQuery !== "";

  const clearFilters = () => {
    setFilterYear(currentYear.toString());
    setFilterMonth("all");
    setFilterTeam("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, timesheetsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch(`/api/team/timesheets?year=${filterYear}${filterMonth !== "all" ? `&month=${filterMonth}` : ""}`),
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

  // Bulk approve helpers
  const selectableTimesheets = useMemo(
    () => filteredTimesheets.filter((ts) => ts.status === "submitted"),
    [filteredTimesheets]
  );

  const allSubmittedSelected =
    selectableTimesheets.length > 0 &&
    selectableTimesheets.every((ts) => selectedIds.has(ts._id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSubmittedSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableTimesheets.map((ts) => ts._id)));
    }
  };

  const bulkApprove = async () => {
    setBulkApproving(true);
    try {
      const res = await fetch("/api/team/timesheets/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timesheetIds: Array.from(selectedIds) }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToApprove"));
        return;
      }

      if (data.data.failed > 0) {
        toast.warning(
          t("bulkApprove.partialSuccess", {
            approved: data.data.approved,
            total: data.data.approved + data.data.failed,
          })
        );
      } else {
        toast.success(t("bulkApprove.success", { count: data.data.approved }));
      }

      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error(t("errors.failedToApprove"));
    } finally {
      setBulkApproving(false);
      setShowConfirm(false);
    }
  };

  // Count pending based on filtered timesheets
  const pendingCount = filteredTimesheets.filter((ts) => ts.status === "submitted").length;

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

    // Count total timesheets and submitted/approved ones
    const totalTimesheets = filteredTimesheets.length;
    const submittedTimesheets = filteredTimesheets.filter((ts) =>
      ["submitted", "approved"].includes(ts.status)
    ).length;

    // Find members who have any non-submitted timesheets (rejected/draft)
    const membersWithIssues = new Set(
      filteredTimesheets
        .filter((ts) => ["rejected", "draft"].includes(ts.status))
        .map((ts) => ts.userId._id)
    );

    const notSubmittedMembers = allMembers.filter(
      (member) => membersWithIssues.has(member._id)
    );

    return {
      totalMembers: totalTimesheets > 0 ? totalTimesheets : allMembers.length,
      submittedCount: totalTimesheets > 0 ? submittedTimesheets : 0,
      notSubmittedMembers,
    };
  }, [teams, filteredTimesheets]);

  // Show loading state
  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  // Collect all team members for the activity tab filter
  const allTeamMembers = useMemo(() => {
    const memberMap = new Map<string, { _id: string; name: string; email: string }>();
    teams.forEach((team) => {
      if (team.adminId) {
        memberMap.set(team.adminId._id, {
          _id: team.adminId._id,
          name: team.adminId.name,
          email: team.adminId.email,
        });
      }
      team.memberIds.forEach((member) => {
        memberMap.set(member._id, {
          _id: member._id,
          name: member.name,
          email: member.email,
        });
      });
    });
    return Array.from(memberMap.values());
  }, [teams]);

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

      <Tabs defaultValue="timesheets">
        <TabsList>
          <TabsTrigger value="timesheets">{t("activity.tabs.timesheets")}</TabsTrigger>
          <TabsTrigger value="activity">{t("activity.tabs.activity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="timesheets">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("team.timesheets")}</CardTitle>
              <CardDescription>
                {filterMonth !== "all"
                  ? format(new Date(parseInt(filterYear), parseInt(filterMonth) - 1), "MMMM yyyy", { locale: dateLocale })
                  : `${t("common.allMonths")} ${filterYear}`}
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
                  <SelectItem value="all">{t("common.allMonths")}</SelectItem>
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
                  <TableHead className="w-10 text-xs font-medium">
                    {selectableTimesheets.length > 0 && (
                      <Checkbox
                        checked={allSubmittedSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all submitted"
                      />
                    )}
                  </TableHead>
                  <TableHead className="text-xs font-medium">{t("team.member")}</TableHead>
                  {teams.length > 1 && <TableHead className="text-xs font-medium">{t("common.team")}</TableHead>}
                  {filterMonth === "all" && <TableHead className="text-xs font-medium">{t("common.month")}</TableHead>}
                  <TableHead className="text-xs font-medium">{t("common.status")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("team.baseHours")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("common.submitted")}</TableHead>
                  <TableHead className="text-xs font-medium text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((ts) => (
                  <TableRow key={ts._id} className="group">
                    <TableCell className="py-2 w-10">
                      {ts.status === "submitted" ? (
                        <Checkbox
                          checked={selectedIds.has(ts._id)}
                          onCheckedChange={() => toggleSelect(ts._id)}
                          aria-label={`Select ${ts.userId.name}`}
                        />
                      ) : null}
                    </TableCell>
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
                    {filterMonth === "all" && (
                      <TableCell className="py-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ts.year, ts.month - 1), "MMM yyyy", { locale: dateLocale })}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="py-2">
                      <Badge className={`text-[10px] px-1.5 py-0 font-normal ${statusColors[ts.status]}`}>
                        {t(`timesheet.status.${ts.status}`)}
                      </Badge>
                      <DeadlineBadge month={ts.month} year={ts.year} timesheetStatus={ts.status} />
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
                    <TableCell colSpan={(teams.length > 1 ? 7 : 6) + (filterMonth === "all" ? 1 : 0)} className="text-center py-8 text-muted-foreground text-sm">
                      {t("team.noTimesheetsFound")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab members={allTeamMembers} />
        </TabsContent>
      </Tabs>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">
            {t("bulkApprove.selected", { count: selectedIds.size })}
          </span>
          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={bulkApproving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {bulkApproving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {t("bulkApprove.approve")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkApproving}
          >
            {t("bulkApprove.cancel")}
          </Button>
        </div>
      )}

      {/* Bulk Approve Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("bulkApprove.confirm", { count: selectedIds.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("bulkApprove.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkApproving}>
              {t("bulkApprove.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkApprove}
              disabled={bulkApproving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {bulkApproving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t("bulkApprove.approve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
