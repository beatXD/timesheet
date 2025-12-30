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
import { Input } from "@/components/ui/input";
import {
  X,
  History,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  _id: string;
  entityType: "timesheet" | "leave_request";
  entityId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  performedBy: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const entityTypeColors: Record<string, string> = {
  timesheet: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  leave_request: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
};

const actionColors: Record<string, string> = {
  submit: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  approve: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  reject: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  team_submit: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  final_approve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export default function AuditLogsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterEntityType, setFilterEntityType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (filterEntityType !== "all") params.set("entityType", filterEntityType);
      if (filterAction !== "all") params.set("action", filterAction);
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const result = await res.json();
      if (result.data) {
        setLogs(result.data);
        setPagination(result.pagination);
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, filterEntityType, filterAction, filterStartDate, filterEndDate, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearFilters = () => {
    setFilterEntityType("all");
    setFilterAction("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  const hasActiveFilters =
    filterEntityType !== "all" ||
    filterAction !== "all" ||
    filterStartDate !== "" ||
    filterEndDate !== "";

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const statusColors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
      submitted: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
      team_submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
      final_approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    };
    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-700"}>
        {t(`timesheet.status.${status}`) || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.auditLogs.title")}</h1>
          <p className="text-muted-foreground">{t("admin.auditLogs.description")}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterEntityType} onValueChange={(v) => { setFilterEntityType(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("admin.auditLogs.entityType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="timesheet">{t("admin.auditLogs.timesheet")}</SelectItem>
                <SelectItem value="leave_request">{t("admin.auditLogs.leaveRequest")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("admin.auditLogs.action")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="submit">{t("admin.auditLogs.actions.submit")}</SelectItem>
                <SelectItem value="approve">{t("admin.auditLogs.actions.approve")}</SelectItem>
                <SelectItem value="reject">{t("admin.auditLogs.actions.reject")}</SelectItem>
                <SelectItem value="team_submit">{t("admin.auditLogs.actions.team_submit")}</SelectItem>
                <SelectItem value="final_approve">{t("admin.auditLogs.actions.final_approve")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
                className="w-40"
                placeholder={t("common.startDate")}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
                className="w-40"
                placeholder={t("common.endDate")}
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                {t("common.clearFilters")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <CardTitle>{t("admin.auditLogs.history")}</CardTitle>
          </div>
          <CardDescription>
            {pagination && `${t("common.total")}: ${pagination.total} ${t("admin.auditLogs.records")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.auditLogs.noRecords")}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">{t("common.date")}</TableHead>
                    <TableHead>{t("admin.auditLogs.performedBy")}</TableHead>
                    <TableHead>{t("admin.auditLogs.entityType")}</TableHead>
                    <TableHead>{t("admin.auditLogs.action")}</TableHead>
                    <TableHead>{t("admin.auditLogs.statusChange")}</TableHead>
                    <TableHead>{t("admin.auditLogs.reason")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-medium">
                        <div className="text-sm">
                          {format(new Date(log.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.performedBy?.image} />
                            <AvatarFallback>
                              {log.performedBy?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{log.performedBy?.name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{log.performedBy?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={entityTypeColors[log.entityType] || "bg-gray-100"}>
                          <FileText className="w-3 h-3 mr-1" />
                          {t(`admin.auditLogs.${log.entityType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-700"}>
                          {t(`admin.auditLogs.actions.${log.action}`) || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.fromStatus && log.toStatus ? (
                          <div className="flex items-center gap-1">
                            {getStatusBadge(log.fromStatus)}
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            {getStatusBadge(log.toStatus)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate" title={log.reason}>
                          {log.reason || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t("common.page")} {pagination.page} / {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNext}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
