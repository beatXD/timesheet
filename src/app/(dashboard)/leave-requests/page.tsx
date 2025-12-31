"use client";

import { useEffect, useState, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Calendar as CalendarIcon,
  Trash2,
  Clock,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaveRequestUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
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
}

interface LeaveQuota {
  total: number;
  used: number;
  remaining: number;
}

interface LeaveBalanceData {
  year: number;
  quotas: {
    sick: LeaveQuota;
    personal: LeaveQuota;
    annual: LeaveQuota;
  };
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

// Get default year (next year if December, current year otherwise)
function getDefaultYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return currentMonth === 11 ? currentYear + 1 : currentYear;
}

export default function LeaveRequestsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>(String(getDefaultYear()));
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);

  const hasActiveFilters = filterStatus !== "all" || filterYear !== String(getDefaultYear());

  const clearFilters = () => {
    setFilterYear(String(getDefaultYear()));
    setFilterStatus("all");
  };

  // New request dialog
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async (year: string, status: string) => {
    setLoading(true);
    try {
      const statusParam = status !== "all" ? `&status=${status}` : "";
      const res = await fetch(`/api/leave-requests?scope=own&year=${year}${statusParam}`);
      const data = await res.json();
      if (data.data) {
        setMyRequests(data.data);
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchLeaveBalance = useCallback(async (year: string) => {
    try {
      const res = await fetch(`/api/leave-balance?year=${year}`);
      const data = await res.json();
      if (res.ok) {
        setLeaveBalance(data.data);
      }
    } catch {
      // Silent fail for leave balance
    }
  }, []);

  useEffect(() => {
    fetchRequests(filterYear, filterStatus);
    fetchLeaveBalance(filterYear);
  }, [filterYear, filterStatus, fetchRequests, fetchLeaveBalance]);

  const handleSubmitRequest = async () => {
    if (!dateRange.from || !leaveType) {
      toast.error(t("leaveRequest.validation.required"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: (dateRange.to || dateRange.from).toISOString(),
          leaveType,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToCreate"));
        return;
      }

      toast.success(t("leaveRequest.success.created"));
      setIsNewDialogOpen(false);
      resetForm();
      fetchRequests(filterYear, filterStatus);
      fetchLeaveBalance(filterYear);
    } catch (error) {
      toast.error(t("errors.failedToCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (request: LeaveRequest) => {
    if (!confirm(t("leaveRequest.confirm.cancel"))) return;

    try {
      const res = await fetch(`/api/leave-requests/${request._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToDelete"));
        return;
      }

      toast.success(t("leaveRequest.success.cancelled"));
      fetchRequests(filterYear, filterStatus);
      fetchLeaveBalance(filterYear);
    } catch (error) {
      toast.error(t("errors.failedToDelete"));
    }
  };

  const resetForm = () => {
    setDateRange({ from: undefined, to: undefined });
    setLeaveType("");
    setReason("");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("leaveRequest.title")}</h1>
          <p className="text-muted-foreground">
            {t("leaveRequest.description")}
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("leaveRequest.newRequest")}
        </Button>
      </div>

      {/* Leave Balance Card */}
      {leaveBalance && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {t("leave.balanceForYear", { year: leaveBalance.year })}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
          {/* Sick Leave */}
          <Card className="p-3 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">{t("leave.sick")}</span>
              <span className="text-xs text-muted-foreground">
                {leaveBalance.quotas.sick.remaining}/{leaveBalance.quotas.sick.total}
              </span>
            </div>
            <Progress
              value={(leaveBalance.quotas.sick.remaining / leaveBalance.quotas.sick.total) * 100}
              className="h-1.5"
            />
          </Card>

          {/* Personal Leave */}
          <Card className="p-3 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">{t("leave.personal")}</span>
              <span className="text-xs text-muted-foreground">
                {leaveBalance.quotas.personal.remaining}/{leaveBalance.quotas.personal.total}
              </span>
            </div>
            <Progress
              value={(leaveBalance.quotas.personal.remaining / leaveBalance.quotas.personal.total) * 100}
              className="h-1.5"
            />
          </Card>

          {/* Annual Leave */}
          <Card className="p-3 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">{t("leave.annual")}</span>
              <span className="text-xs text-muted-foreground">
                {leaveBalance.quotas.annual.remaining}/{leaveBalance.quotas.annual.total}
              </span>
            </div>
            <Progress
              value={(leaveBalance.quotas.annual.remaining / leaveBalance.quotas.annual.total) * 100}
              className="h-1.5"
            />
          </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("leaveRequest.myRequests")}</CardTitle>
              <CardDescription>{t("leaveRequest.myRequestsDesc")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("leaveRequest.status.pending")}</SelectItem>
                  <SelectItem value="approved">{t("leaveRequest.status.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("leaveRequest.status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-28">
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
                  <TableHead>{t("leaveRequest.dateRange")}</TableHead>
                  <TableHead>{t("leaveRequest.days")}</TableHead>
                  <TableHead>{t("leave.leaveType")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("timesheet.remark")}</TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests.map((request) => (
                  <TableRow key={request._id}>
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
                    <TableCell className="text-right">
                      {request.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancel(request)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {request.status !== "pending" && (
                        <span className="text-xs text-muted-foreground">
                          {request.reviewedAt &&
                            format(new Date(request.reviewedAt), "dd/MM/yy", {
                              locale: dateLocale,
                            })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {myRequests.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {hasActiveFilters
                        ? t("leaveRequest.noRequestsMatch")
                        : t("leaveRequest.noRequests")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("leaveRequest.newRequest")}</DialogTitle>
            <DialogDescription>
              {t("leaveRequest.newRequestDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("leaveRequest.dateRange")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      t("leaveRequest.selectDates")
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) =>
                      setDateRange({ from: range?.from, to: range?.to })
                    }
                    numberOfMonths={2}
                    showOutsideDays={false}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>{t("leave.leaveType")} *</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("leave.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick">{t("leave.sick")}</SelectItem>
                  <SelectItem value="personal">{t("leave.personal")}</SelectItem>
                  <SelectItem value="annual">{t("leave.annual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>
                {t("leaveRequest.reason")} ({t("common.optional")})
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("leaveRequest.reasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewDialogOpen(false);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.submitting")}
                </>
              ) : (
                t("leaveRequest.submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
