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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface LeaveRecord {
  date: string;
  leaveType: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  timesheetId: string;
  month: number;
  year: number;
  remark?: string;
}

interface LeaveSummary {
  sick: number;
  personal: number;
  annual: number;
  total: number;
}

interface LeaveUser {
  _id: string;
  name: string;
  email: string;
}

interface LeaveData {
  records: LeaveRecord[];
  summary: LeaveSummary;
  users: LeaveUser[];
}

const leaveTypeColors: Record<string, string> = {
  sick: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  personal: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  annual: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
};

export default function LeavesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [data, setData] = useState<LeaveData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterLeaveType, setFilterLeaveType] = useState("all");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", filterYear);
      if (filterMonth !== "all") params.set("month", filterMonth);
      if (filterUser !== "all") params.set("userId", filterUser);
      if (filterLeaveType !== "all") params.set("leaveType", filterLeaveType);

      const res = await fetch(`/api/admin/leaves?${params.toString()}`);
      const result = await res.json();
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, filterUser, filterLeaveType, t]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const clearFilters = () => {
    setFilterYear(currentYear.toString());
    setFilterMonth("all");
    setFilterUser("all");
    setFilterLeaveType("all");
  };

  const hasActiveFilters =
    filterYear !== currentYear.toString() ||
    filterMonth !== "all" ||
    filterUser !== "all" ||
    filterLeaveType !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("leave.title")}</h1>
          <p className="text-muted-foreground">{t("leave.description")}</p>
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
                <SelectItem key={month} value={month.toString()}>
                  {format(new Date(2024, month - 1), "MMMM", { locale: dateLocale })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data?.users && data.users.length > 0 && (
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("leave.filterByUser")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {data.users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterLeaveType} onValueChange={setFilterLeaveType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("leave.filterByType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("leave.allTypes")}</SelectItem>
              <SelectItem value="sick">{t("leave.sick")}</SelectItem>
              <SelectItem value="personal">{t("leave.personal")}</SelectItem>
              <SelectItem value="annual">{t("leave.annual")}</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Leave Summary */}
      {data?.summary && data.summary.total > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("leave.summary")}</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.sick")}</span>
                <span className="font-bold">{data.summary.sick} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.personal")}</span>
                <span className="font-bold">{data.summary.personal} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-500/10 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.annual")}</span>
                <span className="font-bold">{data.summary.annual} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">{t("leave.total")}</span>
                <span className="font-bold text-primary">{data.summary.total} {t("leave.days")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("leave.title")}</CardTitle>
          <CardDescription>
            {filterYear} {filterMonth !== "all" && `- ${format(new Date(2024, parseInt(filterMonth) - 1), "MMMM", { locale: dateLocale })}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : !data?.records || data.records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("leave.noRecords")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.user")}</TableHead>
                  <TableHead>{t("leave.leaveType")}</TableHead>
                  <TableHead>{t("timesheet.remark")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record, index) => (
                  <TableRow key={`${record.timesheetId}-${record.date}-${index}`}>
                    <TableCell>
                      {format(new Date(record.date), "dd MMMM yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={record.user.image} />
                          <AvatarFallback>
                            {record.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{record.user.name}</p>
                          <p className="text-xs text-muted-foreground">{record.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={leaveTypeColors[record.leaveType]}>
                        {t(`leave.${record.leaveType}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.remark || "-"}
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
