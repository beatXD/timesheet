"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Search, X, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";

interface Team {
  _id: string;
  name: string;
}

interface TimesheetRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
    teamIds?: { _id: string; name: string }[];
    vendorId?: { _id: string; name: string };
  };
  month: number;
  year: number;
  status: TimesheetStatus;
  totalBaseHours: number;
  totalAdditionalHours: number;
  submittedAt?: string;
  approvedAt?: string;
  teamSubmittedAt?: string;
  finalApprovedAt?: string;
  team?: { _id: string; name: string };
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  team_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  final_approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

export default function TimesheetRecordsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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

  useEffect(() => {
    fetchData();
  }, [filterYear, filterMonth]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/admin/teams");
      const data = await res.json();
      if (data.data) {
        setTeams(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", filterYear);
      params.set("month", filterMonth);

      const res = await fetch(`/api/admin/timesheets/all?${params}`);
      const data = await res.json();

      if (data.data) {
        setTimesheets(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Filtered timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      // Team filter
      if (filterTeam !== "all") {
        if (!ts.team || ts.team._id !== filterTeam) return false;
      }
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

  const clearFilters = () => {
    setFilterTeam("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  const hasActiveFilters = filterTeam !== "all" || filterStatus !== "all" || searchQuery !== "";

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredTimesheets.length;
    const byStatus = filteredTimesheets.reduce((acc, ts) => {
      acc[ts.status] = (acc[ts.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalHours = filteredTimesheets.reduce(
      (sum, ts) => sum + ts.totalBaseHours + ts.totalAdditionalHours,
      0
    );
    return { total, byStatus, totalHours };
  }, [filteredTimesheets]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.timesheetRecords.title")}</h1>
          <p className="text-muted-foreground">{t("admin.timesheetRecords.description")}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("admin.timesheetRecords.totalRecords")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.byStatus["final_approved"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("timesheet.status.final_approved")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.byStatus["team_submitted"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("timesheet.status.team_submitted")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-slate-600">
              {stats.byStatus["draft"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("timesheet.status.draft")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                {t("admin.timesheetRecords.allRecords")}
              </CardTitle>
              <CardDescription>
                {format(
                  new Date(parseInt(filterYear), parseInt(filterMonth) - 1),
                  "MMMM yyyy",
                  { locale: dateLocale }
                )}
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="draft">{t("timesheet.status.draft")}</SelectItem>
                  <SelectItem value="submitted">{t("timesheet.status.submitted")}</SelectItem>
                  <SelectItem value="approved">{t("timesheet.status.approved")}</SelectItem>
                  <SelectItem value="team_submitted">{t("timesheet.status.team_submitted")}</SelectItem>
                  <SelectItem value="final_approved">{t("timesheet.status.final_approved")}</SelectItem>
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
                  <TableHead>{t("common.team")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("team.baseHours")}</TableHead>
                  <TableHead>{t("admin.timesheetRecords.additionalHours")}</TableHead>
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
                          <p className="text-xs text-muted-foreground">{ts.userId.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ts.team ? (
                        <Badge variant="outline">{ts.team.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                        ? format(new Date(ts.submittedAt), "dd/MM/yyyy HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/timesheet/${ts._id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTimesheets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("common.noData")}
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
