"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, FileEdit, Eye, Filter, X, Clock, CalendarCheck, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useModeStore } from "@/store";
import type { ITimesheet, IPersonalTimesheet, TimesheetStatus } from "@/types";

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  team_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  final_approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

export default function TimesheetListPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const { mode } = useModeStore();
  const isPersonalMode = mode === "personal";
  const dateLocale = locale === "th" ? th : enUS;
  const [timesheets, setTimesheets] = useState<(ITimesheet | IPersonalTimesheet)[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [creating, setCreating] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    // Clear old data when mode changes to prevent stale data issues
    setTimesheets([]);
    fetchTimesheets();
  }, [mode]);

  // Filtered timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      // Status filter only applies to team mode
      if (!isPersonalMode && filterStatus !== "all") {
        const teamTs = ts as ITimesheet;
        // Guard against undefined status during mode transition
        if (!teamTs.status || teamTs.status !== filterStatus) return false;
      }
      if (filterYear !== "all" && ts.year !== parseInt(filterYear)) return false;
      return true;
    });
  }, [timesheets, filterStatus, filterYear, isPersonalMode]);

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();

    // Current month timesheet
    const currentMonthTs = timesheets.find(
      (ts) => ts.month === currentMonth && ts.year === thisYear
    );

    // This year's timesheets
    const thisYearTimesheets = timesheets.filter((ts) => ts.year === thisYear);

    // Total hours this year
    const totalBaseHours = thisYearTimesheets.reduce(
      (sum, ts) => sum + (ts.totalBaseHours || 0),
      0
    );
    const totalAdditionalHours = thisYearTimesheets.reduce(
      (sum, ts) => sum + (ts.totalAdditionalHours || 0),
      0
    );

    // Count by status (only for team mode)
    const statusCounts = isPersonalMode
      ? {}
      : (timesheets as ITimesheet[]).reduce(
          (acc, ts) => {
            // Guard against undefined status during mode transition
            if (ts.status) {
              acc[ts.status] = (acc[ts.status] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>
        );

    return {
      currentMonthTs,
      totalBaseHours,
      totalAdditionalHours,
      statusCounts,
      thisYearCount: thisYearTimesheets.length,
    };
  }, [timesheets, isPersonalMode]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterYear("all");
  };

  const hasActiveFilters = filterStatus !== "all" || filterYear !== "all";

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const endpoint = isPersonalMode ? "/api/personal-timesheets" : "/api/timesheets";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.data) {
        setTimesheets(data.data);
      }
    } catch (error) {
      toast.error(t("timesheet.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const createTimesheet = async () => {
    setCreating(true);
    try {
      const endpoint = isPersonalMode ? "/api/personal-timesheets" : "/api/timesheets";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("timesheet.createError"));
        return;
      }

      toast.success(t("timesheet.created"));
      setIsDialogOpen(false);
      router.push(`/timesheet/${data.data._id}`);
    } catch (error) {
      toast.error(t("timesheet.createError"));
    } finally {
      setCreating(false);
    }
  };

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMMM yyyy", { locale: dateLocale });
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold">
            {isPersonalMode ? t("mode.personalTimesheet") : t("timesheet.title")}
          </h1>
          <p className="text-muted-foreground">
            {isPersonalMode ? t("mode.personalDescription") : t("timesheet.description")}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("timesheet.new")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("timesheet.createNew")}</DialogTitle>
              <DialogDescription>
                {t("timesheet.selectMonthYear")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("timesheet.month")}</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
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
              </div>
              <div className="grid gap-2">
                <Label>{t("timesheet.year")}</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
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
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={createTimesheet} disabled={creating}>
                {creating ? t("common.creating") : t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-3 ${isPersonalMode ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
        {/* Current Month Status - Team mode only */}
        {!isPersonalMode && (
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("timesheet.currentMonth")}</span>
              </div>
              {stats.currentMonthTs && (stats.currentMonthTs as ITimesheet).status ? (
                <Badge className={statusColors[(stats.currentMonthTs as ITimesheet).status]}>
                  {t(`timesheet.status.${(stats.currentMonthTs as ITimesheet).status}`)}
                </Badge>
              ) : (
                <span className="text-xs text-amber-500">{t("timesheet.notCreated")}</span>
              )}
            </div>
          </Card>
        )}

        {/* Total Hours This Year */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("timesheet.totalHoursYear")}</span>
            </div>
            <span className="font-semibold">{stats.totalBaseHours + stats.totalAdditionalHours} {t("common.hours")}</span>
          </div>
        </Card>

        {/* Timesheets Count */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {isPersonalMode ? t("timesheet.totalThisYear") : t("timesheet.completedThisYear")}
              </span>
            </div>
            <span className="font-semibold text-green-600">
              {isPersonalMode
                ? stats.thisYearCount
                : `${(stats.statusCounts["approved"] || 0) +
                   (stats.statusCounts["team_submitted"] || 0) +
                   (stats.statusCounts["final_approved"] || 0)}/${stats.thisYearCount}`}
            </span>
          </div>
        </Card>

        {/* Pending Action - Team mode only */}
        {!isPersonalMode && (
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("timesheet.pendingAction")}</span>
              </div>
              <div className="flex gap-1">
                {(stats.statusCounts["draft"] || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {stats.statusCounts["draft"]} {t("timesheet.status.draft")}
                  </Badge>
                )}
                {(stats.statusCounts["rejected"] || 0) > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {stats.statusCounts["rejected"]} {t("timesheet.status.rejected")}
                  </Badge>
                )}
                {(stats.statusCounts["draft"] || 0) === 0 && (stats.statusCounts["rejected"] || 0) === 0 && (
                  <span className="text-xs text-green-600">{t("timesheet.allClear")}</span>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("timesheet.yourTimesheets")}</CardTitle>
              <CardDescription>
                {t("timesheet.viewManage")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {!isPersonalMode && (
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                    <SelectItem value="draft">{t("timesheet.status.draft")}</SelectItem>
                    <SelectItem value="submitted">{t("timesheet.status.submitted")}</SelectItem>
                    <SelectItem value="approved">{t("timesheet.status.approved")}</SelectItem>
                    <SelectItem value="rejected">{t("timesheet.status.rejected")}</SelectItem>
                    <SelectItem value="team_submitted">{t("timesheet.status.team_submitted")}</SelectItem>
                    <SelectItem value="final_approved">{t("timesheet.status.final_approved")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder={t("common.year")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allYears")}</SelectItem>
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
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? t("timesheet.noTimesheetsMatch")
                : t("timesheet.noTimesheetsYet")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.period")}</TableHead>
                  {!isPersonalMode && <TableHead>{t("common.status")}</TableHead>}
                  <TableHead>{t("timesheet.baseHours")}</TableHead>
                  <TableHead>{t("timesheet.additionalHours")}</TableHead>
                  {!isPersonalMode && <TableHead>{t("common.submitted")}</TableHead>}
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((ts) => {
                  const teamTs = ts as ITimesheet;
                  return (
                    <TableRow key={ts._id.toString()}>
                      <TableCell className="font-medium">
                        {getMonthName(ts.month, ts.year)}
                      </TableCell>
                      {!isPersonalMode && teamTs.status && (
                        <TableCell>
                          <Badge className={statusColors[teamTs.status]}>
                            {t(`timesheet.status.${teamTs.status}`)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>{ts.totalBaseHours} {t("common.hours")}</TableCell>
                      <TableCell>{ts.totalAdditionalHours} {t("common.hours")}</TableCell>
                      {!isPersonalMode && (
                        <TableCell>
                          {teamTs.submittedAt
                            ? format(new Date(teamTs.submittedAt), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Link href={`/timesheet/${ts._id}`}>
                          <Button variant="ghost" size="sm">
                            {isPersonalMode || teamTs.status === "draft" || teamTs.status === "rejected" ? (
                              <>
                                <FileEdit className="w-4 h-4 mr-1" />
                                {t("common.edit")}
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                {t("common.view")}
                              </>
                            )}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
