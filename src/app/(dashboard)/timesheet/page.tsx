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
import { Plus, FileEdit, Eye, Filter, X } from "lucide-react";
import { toast } from "sonner";
import type { ITimesheet, TimesheetStatus } from "@/types";

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
  const dateLocale = locale === "th" ? th : enUS;
  const [timesheets, setTimesheets] = useState<ITimesheet[]>([]);
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
    fetchTimesheets();
  }, []);

  // Filtered timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (filterStatus !== "all" && ts.status !== filterStatus) return false;
      if (filterYear !== "all" && ts.year !== parseInt(filterYear)) return false;
      return true;
    });
  }, [timesheets, filterStatus, filterYear]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterYear("all");
  };

  const hasActiveFilters = filterStatus !== "all" || filterYear !== "all";

  const fetchTimesheets = async () => {
    try {
      const res = await fetch("/api/timesheets");
      const data = await res.json();
      if (data.data) {
        setTimesheets(data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch timesheets");
    } finally {
      setLoading(false);
    }
  };

  const createTimesheet = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create timesheet");
        return;
      }

      toast.success("Timesheet created");
      setIsDialogOpen(false);
      router.push(`/timesheet/${data.data._id}`);
    } catch (error) {
      toast.error("Failed to create timesheet");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("timesheet.title")}</h1>
          <p className="text-muted-foreground">{t("timesheet.description")}</p>
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
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("timesheet.baseHours")}</TableHead>
                  <TableHead>{t("timesheet.additionalHours")}</TableHead>
                  <TableHead>{t("common.submitted")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((ts) => (
                  <TableRow key={ts._id.toString()}>
                    <TableCell className="font-medium">
                      {getMonthName(ts.month, ts.year)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[ts.status]}>
                        {t(`timesheet.status.${ts.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{ts.totalBaseHours} {t("common.hours")}</TableCell>
                    <TableCell>{ts.totalAdditionalHours} {t("common.hours")}</TableCell>
                    <TableCell>
                      {ts.submittedAt
                        ? format(new Date(ts.submittedAt), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/timesheet/${ts._id}`}>
                        <Button variant="ghost" size="sm">
                          {ts.status === "draft" || ts.status === "rejected" ? (
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
