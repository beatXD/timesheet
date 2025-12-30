"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  FileCheck,
  Send,
  Calendar,
  Users,
  Building2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CurrentMonthData {
  year: number;
  month: number;
  timesheet: {
    id: string;
    status: TimesheetStatus;
    totalHours: number;
    submittedAt?: string;
    approvedAt?: string;
  } | null;
  progress: number;
}

interface TeamSummary {
  totalMembers: number;
  submitted: number;
  pending: number;
  notSubmitted: Array<{ name: string; email: string }>;
}

interface TeamStats {
  teamId: string;
  teamName: string;
  leader: { name: string; email: string } | null;
  memberCount: number;
  submitted: number;
  pending: number;
}

interface OrgOverview {
  totalUsers: number;
  totalTeams: number;
  totalSubmitted: number;
  totalPending: number;
  teamStats: TeamStats[];
}

interface ChartData {
  monthlyHours: Array<{ month: number; hours: number; manDays: number }>;
  monthlyLeave: Array<{ month: number; sick: number; personal: number; annual: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
}

interface DashboardData {
  currentMonth: CurrentMonthData;
  teamSummary: TeamSummary | null;
  orgOverview: OrgOverview | null;
  counts: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  hours: {
    base: number;
    additional: number;
    manDays: number;
  };
  leaveSummary: {
    sick: number;
    personal: number;
    annual: number;
    total: number;
  };
  recentTimesheets: Array<{
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
      image?: string;
    };
    month: number;
    year: number;
    status: TimesheetStatus;
    totalBaseHours: number;
    updatedAt: string;
  }>;
  charts?: ChartData;
}

const statusConfig: Record<
  TimesheetStatus,
  { color: string; bgColor: string; icon: React.ReactNode }
> = {
  draft: {
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: <Clock className="w-4 h-4" />,
  },
  submitted: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: <Send className="w-4 h-4" />,
  },
  approved: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  rejected: {
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  team_submitted: {
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    icon: <Send className="w-4 h-4" />,
  },
  final_approved: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = locale === "th" ? th : enUS;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, profileRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/profile"),
      ]);
      const dashData = await dashRes.json();
      const profileData = await profileRes.json();

      if (dashData.data) {
        setData(dashData.data);
      }
      if (profileData.data?.role) {
        setUserRole(profileData.data.role);
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const getMonthName = (month: number, year: number, formatStr = "MMMM yyyy") => {
    return format(new Date(year, month - 1), formatStr, { locale: dateLocale });
  };

  const getStatusLabel = (status: TimesheetStatus) => {
    return t(`timesheet.status.${status}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  const currentMonth = data?.currentMonth;
  const hasTimesheet = currentMonth?.timesheet !== null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Section - Current Month */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentMonth && getMonthName(currentMonth.month, currentMonth.year)}
            </p>
          </div>
        </div>

        {/* Current Month Timesheet Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      hasTimesheet
                        ? statusConfig[currentMonth?.timesheet?.status || "draft"].bgColor
                        : "bg-slate-100 dark:bg-slate-800"
                    )}
                  >
                    {hasTimesheet ? (
                      statusConfig[currentMonth?.timesheet?.status || "draft"].icon
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("dashboard.currentMonthTimesheet")}
                    </p>
                    <p
                      className={cn(
                        "font-semibold",
                        hasTimesheet
                          ? statusConfig[currentMonth?.timesheet?.status || "draft"].color
                          : "text-slate-500"
                      )}
                    >
                      {hasTimesheet
                        ? getStatusLabel(currentMonth?.timesheet?.status || "draft")
                        : t("dashboard.notStarted")}
                    </p>
                  </div>
                </div>

                {hasTimesheet && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("dashboard.progress")}
                      </span>
                      <span className="font-medium">{currentMonth?.progress}%</span>
                    </div>
                    <Progress value={currentMonth?.progress || 0} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {currentMonth?.timesheet?.totalHours || 0} {t("common.hours")}{" "}
                      {t("dashboard.logged")}
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={() =>
                  hasTimesheet
                    ? router.push(`/timesheet/${currentMonth?.timesheet?.id}`)
                    : router.push("/timesheet")
                }
                className="gap-2"
              >
                {hasTimesheet ? t("dashboard.viewTimesheet") : t("dashboard.startTimesheet")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Team Summary - Leader Only */}
      {userRole === "leader" && data?.teamSummary && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("dashboard.teamSummary")}</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/team")}>
              {t("dashboard.viewAll")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {data.teamSummary.submitted}/{data.teamSummary.totalMembers}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.membersSubmitted")}
                    </p>
                  </div>
                </div>
                <Progress
                  value={
                    (data.teamSummary.submitted / data.teamSummary.totalMembers) * 100
                  }
                  className="w-32 h-2"
                />
              </div>

              {data.teamSummary.notSubmitted.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t("teamSubmission.notSubmitted")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.teamSummary.notSubmitted.slice(0, 5).map((member) => (
                      <Badge
                        key={member.email}
                        variant="outline"
                        className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800"
                      >
                        {member.name}
                      </Badge>
                    ))}
                    {data.teamSummary.notSubmitted.length > 5 && (
                      <Badge variant="outline">
                        +{data.teamSummary.notSubmitted.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Org Overview - Admin Only */}
      {userRole === "admin" && data?.orgOverview && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("dashboard.orgOverview")}</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/team")}>
              {t("dashboard.viewAll")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.orgOverview.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.totalUsers")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.orgOverview.totalTeams}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.totalTeams")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.orgOverview.totalSubmitted}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.submitted")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.orgOverview.totalPending}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.pendingApproval")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Stats Table */}
          {data.orgOverview.teamStats.length > 0 && (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">{t("common.team")}</th>
                      <th className="text-left p-4 font-medium">{t("team.teamLeader")}</th>
                      <th className="text-center p-4 font-medium">{t("team.memberCount")}</th>
                      <th className="text-center p-4 font-medium">{t("dashboard.submitted")}</th>
                      <th className="text-center p-4 font-medium">{t("dashboard.pending")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.orgOverview.teamStats.map((team) => (
                      <tr
                        key={team.teamId}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => router.push(`/team?team=${team.teamId}`)}
                      >
                        <td className="p-4 font-medium">{team.teamName}</td>
                        <td className="p-4 text-muted-foreground">
                          {team.leader?.name || "-"}
                        </td>
                        <td className="p-4 text-center">{team.memberCount}</td>
                        <td className="p-4 text-center">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                          >
                            {team.submitted}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          {team.pending > 0 ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            >
                              {team.pending}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Yearly Stats */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("dashboard.yearlyStats")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("timesheet.status.approved")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-2xl font-bold">{data?.counts.approved || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.totalBaseHours")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{data?.hours.base || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.totalManDays")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">
                  {data?.hours.manDays?.toFixed(1) || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("leave.total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                <span className="text-2xl font-bold">
                  {data?.leaveSummary?.total || 0}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("leave.days")}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Charts Section */}
      {data?.charts && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("dashboard.charts.title")}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Hours Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t("dashboard.charts.monthlyHours")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.charts.monthlyHours.map((d) => ({
                        ...d,
                        name: t(`dashboard.charts.${["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][d.month - 1]}`),
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar
                        dataKey="hours"
                        name={t("dashboard.charts.hours")}
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Leave Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t("dashboard.charts.monthlyLeave")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.charts.monthlyLeave.map((d) => ({
                        ...d,
                        name: t(`dashboard.charts.${["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][d.month - 1]}`),
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="sick"
                        name={t("leave.type.sick")}
                        stackId="a"
                        fill="#f97316"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="personal"
                        name={t("leave.type.personal")}
                        stackId="a"
                        fill="#8b5cf6"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="annual"
                        name={t("leave.type.annual")}
                        stackId="a"
                        fill="#06b6d4"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t("dashboard.recentActivity")}</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/timesheet")}>
            {t("dashboard.viewAll")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {data?.recentTimesheets && data.recentTimesheets.length > 0 ? (
              <div className="divide-y divide-border">
                {data.recentTimesheets.map((ts) => (
                  <Link
                    key={ts._id}
                    href={`/timesheet/${ts._id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ts.userId.image} />
                        <AvatarFallback className="text-xs">
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
                        <p className="text-sm text-muted-foreground">
                          {getMonthName(ts.month, ts.year, "MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          "border-0",
                          statusConfig[ts.status].bgColor,
                          statusConfig[ts.status].color
                        )}
                      >
                        {getStatusLabel(ts.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(ts.updatedAt), "dd/MM/yyyy")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {t("dashboard.noTimesheets")}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
