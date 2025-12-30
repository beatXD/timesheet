"use client";

import { useEffect, useState, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

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

export default function TeamLeavesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const { data: session, status } = useSession();

  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Reject dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] =
    useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Check access
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      redirect("/login");
    }
    if (session.user.role === "user") {
      redirect("/dashboard");
    }
  }, [session, status]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave-requests?scope=team");
      const data = await res.json();
      if (data.data) {
        setTeamRequests(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (session?.user?.role === "leader" || session?.user?.role === "admin") {
      fetchRequests();
    }
  }, [session, fetchRequests]);

  const handleApprove = async (request: LeaveRequest) => {
    try {
      const res = await fetch(`/api/leave-requests/${request._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToApprove"));
        return;
      }

      toast.success(t("leaveRequest.success.approved"));
      fetchRequests();
    } catch (error) {
      toast.error(t("errors.failedToApprove"));
    }
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setRejectingRequest(request);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest || !rejectionReason) {
      toast.error(t("leaveRequest.validation.reasonRequired"));
      return;
    }

    try {
      const res = await fetch(`/api/leave-requests/${rejectingRequest._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToReject"));
        return;
      }

      toast.success(t("leaveRequest.success.rejected"));
      setIsRejectDialogOpen(false);
      fetchRequests();
    } catch (error) {
      toast.error(t("errors.failedToReject"));
    }
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

  const filteredRequests =
    statusFilter === "all"
      ? teamRequests
      : teamRequests.filter((r) => r.status === statusFilter);

  const pendingCount = teamRequests.filter((r) => r.status === "pending").length;

  if (status === "loading" || !session) {
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
          <h1 className="text-2xl font-bold">{t("teamLeave.title")}</h1>
          <p className="text-muted-foreground">{t("teamLeave.description")}</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} {t("team.pending")}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("teamLeave.teamRequests")}</CardTitle>
              <CardDescription>{t("teamLeave.reviewApprove")}</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                <SelectItem value="pending">{t("team.pending")}</SelectItem>
                <SelectItem value="approved">{t("team.approved")}</SelectItem>
                <SelectItem value="rejected">{t("team.rejected")}</SelectItem>
              </SelectContent>
            </Select>
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
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(request)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openRejectDialog(request)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
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
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("leaveRequest.rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("leaveRequest.rejectDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("leaveRequest.rejectionReason")} *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("leaveRequest.rejectionReasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t("leaveRequest.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
