"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { TeamStatsGrid, TeamLeaveStats } from "@/components/team";

interface LeaveRequestUser {
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

interface TeamMember {
  _id: string;
  name: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: TeamMember[];
  leaderId: TeamLeader;
}

interface LeaveRequest {
  _id: string;
  userId: LeaveRequestUser;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: { _id: string; name: string; email: string };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  teamId?: string;
  teamName?: string;
}

const leaveTypeColors: Record<string, string> = {
  sick: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  personal:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  annual: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
};

const statusColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export default function AdminLeaveRequestsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedTeamId = searchParams.get("team");
  const showOverview = !selectedTeamId;

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStats, setTeamStats] = useState<TeamLeaveStats[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>(selectedTeamId || "all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Check access - admin only
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      redirect("/login");
    }
    if (session.user.role !== "admin") {
      redirect("/calendar");
    }
  }, [session, status]);

  // Update teamFilter when selectedTeamId changes
  useEffect(() => {
    if (selectedTeamId) {
      setTeamFilter(selectedTeamId);
    }
  }, [selectedTeamId]);

  // Fetch team stats for overview
  const fetchTeamStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/team/stats?type=leaves");
      const data = await res.json();
      if (data.data) {
        setTeamStats(data.data);
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setStatsLoading(false);
    }
  }, [t]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, requestsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/leave-requests?scope=all"),
      ]);

      const teamsData = await teamsRes.json();
      const requestsData = await requestsRes.json();

      if (teamsData.data) {
        setTeams(teamsData.data);

        // Add team info to requests
        if (requestsData.data) {
          const requestsWithTeam = requestsData.data.map((req: LeaveRequest) => {
            const team = teamsData.data.find((t: Team) =>
              t.memberIds.some((m: TeamMember) => m._id === req.userId._id) ||
              t.leaderId?._id === req.userId._id
            );
            return {
              ...req,
              teamId: team?._id,
              teamName: team?.name,
            };
          });
          setLeaveRequests(requestsWithTeam);
        }
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchData();
      fetchTeamStats();
    }
  }, [session, fetchData, fetchTeamStats]);

  const handleTeamClick = (teamId: string) => {
    router.push(`/admin/leave-requests?team=${teamId}`);
  };

  const handleBackToOverview = () => {
    router.push("/admin/leave-requests");
    setTeamFilter("all");
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    if (isSameDay) {
      return format(startDate, "dd MMM yyyy", { locale: dateLocale });
    }
    return `${format(startDate, "dd MMM", { locale: dateLocale })} - ${format(
      endDate,
      "dd MMM yyyy",
      { locale: dateLocale }
    )}`;
  };

  const calculateDays = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  // Get selected team name
  const selectedTeamName = useMemo(() => {
    if (!selectedTeamId) return null;
    const team = teams.find((t) => t._id === selectedTeamId);
    return team?.name;
  }, [selectedTeamId, teams]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((req) => {
      // Team filter - for drill-down, filter by selected team
      if (selectedTeamId && req.teamId !== selectedTeamId) return false;
      // Team filter - for regular filter dropdown
      if (!selectedTeamId && teamFilter !== "all" && req.teamId !== teamFilter) return false;
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (leaveTypeFilter !== "all" && req.leaveType !== leaveTypeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !req.userId.name.toLowerCase().includes(query) &&
          !req.userId.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [leaveRequests, teamFilter, statusFilter, leaveTypeFilter, searchQuery, selectedTeamId]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const byStatus = filteredRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, byStatus };
  }, [filteredRequests]);

  const clearFilters = () => {
    setTeamFilter("all");
    setStatusFilter("all");
    setLeaveTypeFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    (!selectedTeamId && teamFilter !== "all") ||
    statusFilter !== "all" ||
    leaveTypeFilter !== "all" ||
    searchQuery !== "";

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  // Overview Mode - Show team stats grid
  if (showOverview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("admin.leaveRequests.title")}</h1>
            <p className="text-muted-foreground">{t("admin.leaveRequests.description")}</p>
          </div>
        </div>

        <TeamStatsGrid
          teams={teamStats}
          variant="leaves"
          loading={statsLoading}
          onTeamClick={handleTeamClick}
        />
      </div>
    );
  }

  // Detail View - Show team leave requests
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("teamOverview.backToOverview")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {selectedTeamName || t("admin.leaveRequests.title")}
            </h1>
            <p className="text-muted-foreground">{t("admin.leaveRequests.viewRecords")}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("admin.leaveRequests.totalRequests")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.byStatus["pending"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("leaveRequest.status.pending")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.byStatus["approved"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("leaveRequest.status.approved")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.byStatus["rejected"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("leaveRequest.status.rejected")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                {t("admin.leaveRequests.allRequests")}
              </CardTitle>
              <CardDescription>{t("admin.leaveRequests.viewAllRequests")}</CardDescription>
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
                <Select value={teamFilter} onValueChange={setTeamFilter}>
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
              <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("leave.leaveType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="annual">{t("leave.annual")}</SelectItem>
                  <SelectItem value="sick">{t("leave.sick")}</SelectItem>
                  <SelectItem value="personal">{t("leave.personal")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("team.pending")}</SelectItem>
                  <SelectItem value="approved">{t("team.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("team.rejected")}</SelectItem>
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
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.user")}</TableHead>
                  {!selectedTeamId && <TableHead>{t("common.team")}</TableHead>}
                  <TableHead>{t("leaveRequest.dateRange")}</TableHead>
                  <TableHead>{t("leaveRequest.days")}</TableHead>
                  <TableHead>{t("leave.leaveType")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("timesheet.remark")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={request.userId.image} />
                          <AvatarFallback>
                            {request.userId.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {request.userId.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.userId.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {!selectedTeamId && (
                      <TableCell>
                        <Badge variant="outline">{request.teamName || "-"}</Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      {formatDateRange(request.startDate, request.endDate)}
                    </TableCell>
                    <TableCell>
                      {calculateDays(request.startDate, request.endDate)}{" "}
                      {t("leave.days")}
                    </TableCell>
                    <TableCell>
                      <Badge className={leaveTypeColors[request.leaveType]}>
                        {t(`leave.${request.leaveType}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[request.status]}>
                        {t(`leaveRequest.status.${request.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.reason || request.rejectionReason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={selectedTeamId ? 6 : 7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("leaveRequest.noRequests")}
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
