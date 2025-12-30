"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, FileCheck, FileX, Send, Calendar, TrendingUp, X, Briefcase } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";

interface Team {
  _id: string;
  name: string;
}

interface Vendor {
  _id: string;
  name: string;
}

interface DashboardData {
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
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  team_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  final_approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [userRole, setUserRole] = useState<string>("user");

  // Filter states
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", labelKey: "months.january" },
    { value: "2", labelKey: "months.february" },
    { value: "3", labelKey: "months.march" },
    { value: "4", labelKey: "months.april" },
    { value: "5", labelKey: "months.may" },
    { value: "6", labelKey: "months.june" },
    { value: "7", labelKey: "months.july" },
    { value: "8", labelKey: "months.august" },
    { value: "9", labelKey: "months.september" },
    { value: "10", labelKey: "months.october" },
    { value: "11", labelKey: "months.november" },
    { value: "12", labelKey: "months.december" },
  ];

  const fetchFiltersData = useCallback(async () => {
    try {
      const [teamsRes, vendorsRes, profileRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/admin/vendors"),
        fetch("/api/profile"),
      ]);
      const teamsData = await teamsRes.json();
      const vendorsData = await vendorsRes.json();
      const profileData = await profileRes.json();

      if (teamsData.data) setTeams(teamsData.data);
      if (vendorsData.data) setVendors(vendorsData.data);
      if (profileData.data?.role) setUserRole(profileData.data.role);
    } catch (error) {
      // Silent fail for filters
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("year", filterYear);
      if (filterMonth !== "all") params.set("month", filterMonth);
      if (filterTeam !== "all") params.set("teamId", filterTeam);
      if (filterVendor !== "all") params.set("vendorId", filterVendor);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const result = await res.json();
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, filterTeam, filterVendor, t]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const clearFilters = () => {
    setFilterYear(currentYear.toString());
    setFilterMonth("all");
    setFilterTeam("all");
    setFilterVendor("all");
  };

  const hasActiveFilters =
    filterYear !== currentYear.toString() ||
    filterMonth !== "all" ||
    filterTeam !== "all" ||
    filterVendor !== "all";

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMM yyyy", { locale: dateLocale });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.overview")}</p>
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
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("common.month")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allMonths")}</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {t(month.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {userRole !== "user" && (
            <>
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
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("common.vendor")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allVendors")}</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor._id} value={vendor._id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("timesheet.status.draft")}</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.counts.draft || 0}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.timesheetsInDraft")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("timesheet.status.submitted")}</CardTitle>
            <Send className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.counts.submitted || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("dashboard.pendingApproval")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("timesheet.status.approved")}</CardTitle>
            <FileCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.counts.approved || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("dashboard.thisYear")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("timesheet.status.rejected")}</CardTitle>
            <FileX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.counts.rejected || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("dashboard.needRevision")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hours Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalBaseHours")}
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.hours.base || 0}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.approvedThisYear")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.additionalHours")}
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.hours.additional || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("dashboard.approvedThisYear")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalManDays")}</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.hours.manDays.toFixed(1) || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("dashboard.approvedThisYear")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Summary */}
      {data?.leaveSummary && data.leaveSummary.total > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("leave.yearlyTotal")}</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.sick")}</span>
                <span className="font-bold">{data.leaveSummary.sick} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.personal")}</span>
                <span className="font-bold">{data.leaveSummary.personal} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-500/10 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.annual")}</span>
                <span className="font-bold">{data.leaveSummary.annual} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">{t("leave.total")}</span>
                <span className="font-bold text-primary">{data.leaveSummary.total} {t("leave.days")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentTimesheets")}</CardTitle>
          <CardDescription>{t("dashboard.latestActivities")}</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentTimesheets && data.recentTimesheets.length > 0 ? (
            <div className="space-y-4">
              {data.recentTimesheets.map((ts) => (
                <Link
                  key={ts._id}
                  href={`/timesheet/${ts._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
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
                      <p className="text-sm text-muted-foreground">
                        {getMonthName(ts.month, ts.year)} - {ts.totalBaseHours}{" "}
                        {t("common.hours")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[ts.status]}>
                      {getStatusLabel(ts.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ts.updatedAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("dashboard.noTimesheets")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
