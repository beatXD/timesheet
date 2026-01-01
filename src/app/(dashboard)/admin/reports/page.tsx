"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  Clock,
  Calendar,
  TrendingUp,
  FileText,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SummaryReport {
  period: {
    year: number;
    month: number | "all";
  };
  overview: {
    users: number;
    teams: number;
  };
  timesheets: {
    total: number;
    byStatus: {
      draft: number;
      submitted: number;
      approved: number;
      rejected: number;
    };
    totalBaseHours: number;
    totalAdditionalHours: number;
  };
  leaves: {
    total: number;
    byStatus: {
      pending: number;
      approved: number;
      rejected: number;
    };
    byType: {
      sick: number;
      personal: number;
      annual: number;
    };
    totalDaysRequested: number;
    totalDaysApproved: number;
  };
  monthlyBreakdown?: Array<{
    month: number;
    timesheets: number;
    baseHours: number;
    additionalHours: number;
    leaves: number;
  }>;
}

interface TeamReport {
  team: {
    _id: string;
    name: string;
    leader: {
      _id: string;
      name: string;
      email: string;
      image?: string;
    };
    project?: {
      _id: string;
      name: string;
    };
    memberCount: number;
  };
  timesheetCompletion: {
    total: number;
    submitted: number;
    approved: number;
    pending: number;
    missing: number;
  };
  hours: {
    totalBase: number;
    totalAdditional: number;
    averagePerMember: number;
  };
  leaveUsage: {
    sick: { total: number; used: number };
    personal: { total: number; used: number };
    annual: { total: number; used: number };
  };
}

export default function ReportsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState(currentMonth.toString());
  const [loading, setLoading] = useState(true);

  const [summaryData, setSummaryData] = useState<SummaryReport | null>(null);
  const [teamData, setTeamData] = useState<TeamReport[]>([]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", filterYear);
      if (filterMonth !== "all") params.set("month", filterMonth);

      const [summaryRes, teamRes] = await Promise.all([
        fetch(`/api/reports/summary?${params.toString()}`),
        fetch(`/api/reports/team?${params.toString()}`),
      ]);

      const summaryResult = await summaryRes.json();
      const teamResult = await teamRes.json();

      if (summaryResult.data) setSummaryData(summaryResult.data);
      if (teamResult.data?.teams) setTeamData(teamResult.data.teams);
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getCompletionRate = (completion: TeamReport["timesheetCompletion"]) => {
    if (completion.total === 0) return 0;
    return Math.round(((completion.submitted + completion.approved) / completion.total) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.reports.title")}</h1>
          <p className="text-muted-foreground">{t("admin.reports.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder={t("common.year")} />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("common.month")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allMonths")}</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {format(new Date(2024, month - 1), "MMMM", { locale: dateLocale })}
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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t("admin.reports.overview")}
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("admin.reports.teams")}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid gap-3 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.reports.totalUsers")}</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData?.overview.users || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.reports.totalTeams")}</CardTitle>
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData?.overview.teams || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.reports.totalHours")}</CardTitle>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryData?.timesheets.totalBaseHours.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{summaryData?.timesheets.totalAdditionalHours || 0} {t("admin.reports.additionalHours")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.reports.leaveDays")}</CardTitle>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData?.leaves.totalDaysApproved || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {summaryData?.leaves.totalDaysRequested || 0} {t("admin.reports.requested")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Timesheet Status */}
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <CardTitle>{t("admin.reports.timesheetStatus")}</CardTitle>
                  </div>
                  <CardDescription>
                    {t("common.total")}: {summaryData?.timesheets.total || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">{t("timesheet.status.draft")}</span>
                      <Badge variant="secondary">{summaryData?.timesheets.byStatus.draft || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                      <span className="text-sm text-muted-foreground">{t("timesheet.status.submitted")}</span>
                      <Badge className="bg-amber-100 text-amber-700">{summaryData?.timesheets.byStatus.submitted || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                      <span className="text-sm text-muted-foreground">{t("timesheet.status.approved")}</span>
                      <Badge className="bg-green-100 text-green-700">{summaryData?.timesheets.byStatus.approved || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
                      <span className="text-sm text-muted-foreground">{t("timesheet.status.rejected")}</span>
                      <Badge className="bg-red-100 text-red-700">{summaryData?.timesheets.byStatus.rejected || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <CardTitle>{t("admin.reports.leaveStatus")}</CardTitle>
                  </div>
                  <CardDescription>
                    {t("common.total")}: {summaryData?.leaves.total || 0} {t("admin.reports.requests")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm">{t("admin.reports.pending")}</span>
                      </div>
                      <span className="font-medium">{summaryData?.leaves.byStatus.pending || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t("admin.reports.approved")}</span>
                      </div>
                      <span className="font-medium">{summaryData?.leaves.byStatus.approved || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{t("admin.reports.rejected")}</span>
                      </div>
                      <span className="font-medium">{summaryData?.leaves.byStatus.rejected || 0}</span>
                    </div>
                  </div>
                  <hr />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("admin.reports.byType")}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-rose-50 dark:bg-rose-500/10 rounded">
                        <p className="text-lg font-bold">{summaryData?.leaves.byType.sick || 0}</p>
                        <p className="text-xs text-muted-foreground">{t("leave.sick")}</p>
                      </div>
                      <div className="text-center p-2 bg-amber-50 dark:bg-amber-500/10 rounded">
                        <p className="text-lg font-bold">{summaryData?.leaves.byType.personal || 0}</p>
                        <p className="text-xs text-muted-foreground">{t("leave.personal")}</p>
                      </div>
                      <div className="text-center p-2 bg-sky-50 dark:bg-sky-500/10 rounded">
                        <p className="text-lg font-bold">{summaryData?.leaves.byType.annual || 0}</p>
                        <p className="text-xs text-muted-foreground">{t("leave.annual")}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            {summaryData?.monthlyBreakdown && summaryData.monthlyBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    <CardTitle>{t("admin.reports.monthlyBreakdown")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.month")}</TableHead>
                        <TableHead className="text-right">{t("admin.reports.timesheets")}</TableHead>
                        <TableHead className="text-right">{t("admin.reports.baseHours")}</TableHead>
                        <TableHead className="text-right">{t("admin.reports.additionalHours")}</TableHead>
                        <TableHead className="text-right">{t("admin.reports.leaveRequests")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.monthlyBreakdown.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">
                            {format(new Date(2024, row.month - 1), "MMMM", { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="text-right">{row.timesheets}</TableCell>
                          <TableCell className="text-right">{row.baseHours.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.additionalHours.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.leaves}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            {teamData.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("admin.reports.noTeamData")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {teamData.map((team) => (
                  <Card key={team.team._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={team.team.leader?.image} />
                            <AvatarFallback>
                              {team.team.leader?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{team.team.name}</CardTitle>
                            <CardDescription>
                              {team.team.leader?.name} | {team.team.memberCount} {t("admin.reports.members")}
                              {team.team.project && ` | ${team.team.project.name}`}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{getCompletionRate(team.timesheetCompletion)}%</p>
                          <p className="text-xs text-muted-foreground">{t("admin.reports.completionRate")}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Completion Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{t("admin.reports.timesheetCompletion")}</span>
                          <span className="text-sm text-muted-foreground">
                            {team.timesheetCompletion.submitted + team.timesheetCompletion.approved} / {team.timesheetCompletion.total}
                          </span>
                        </div>
                        <Progress value={getCompletionRate(team.timesheetCompletion)} className="h-2" />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{t("admin.reports.submitted")}: {team.timesheetCompletion.submitted}</span>
                          <span>{t("admin.reports.approved")}: {team.timesheetCompletion.approved}</span>
                          <span>{t("admin.reports.pending")}: {team.timesheetCompletion.pending}</span>
                          <span>{t("admin.reports.missing")}: {team.timesheetCompletion.missing}</span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Hours */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-2">{t("admin.reports.hoursTracked")}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold">{team.hours.totalBase.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{t("admin.reports.baseHours")}</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold">{team.hours.totalAdditional.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{t("admin.reports.additionalHours")}</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold">{team.hours.averagePerMember}</p>
                              <p className="text-xs text-muted-foreground">{t("admin.reports.avgPerMember")}</p>
                            </div>
                          </div>
                        </div>

                        {/* Leave Usage */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-2">{t("admin.reports.leaveUsage")}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold">{team.leaveUsage.sick.used}/{team.leaveUsage.sick.total}</p>
                              <p className="text-xs text-muted-foreground">{t("leave.sick")}</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold">{team.leaveUsage.personal.used}/{team.leaveUsage.personal.total}</p>
                              <p className="text-xs text-muted-foreground">{t("leave.personal")}</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold">{team.leaveUsage.annual.used}/{team.leaveUsage.annual.total}</p>
                              <p className="text-xs text-muted-foreground">{t("leave.annual")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
