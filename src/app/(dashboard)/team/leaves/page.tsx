"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Search, CheckCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface LeaveRequestUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface TeamLeader {
  _id: string;
  name: string;
  email: string;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: TeamMember[];
  leaderId: TeamLeader;
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
  teamId?: string;
  teamName?: string;
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
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Reject dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] =
    useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [isBulkRejectDialogOpen, setIsBulkRejectDialogOpen] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");

  // Check access - leader only (admin uses /admin/leave-requests)
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      redirect("/login");
    }
    if (session.user.role === "user") {
      redirect("/calendar");
    }
    if (session.user.role === "admin") {
      redirect("/admin/leave-requests");
    }
  }, [session, status]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, requestsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/leave-requests?scope=team"),
      ]);

      const teamsData = await teamsRes.json();
      const requestsData = await requestsRes.json();

      if (teamsData.data) {
        const myTeams = teamsData.data.filter(
          (team: Team) => team.leaderId?._id === session?.user?.id
        );
        setTeams(myTeams);

        // Add team info to requests
        if (requestsData.data) {
          const requestsWithTeam = requestsData.data.map((req: LeaveRequest) => {
            const team = myTeams.find((t: Team) =>
              t.memberIds.some((m: TeamMember) => m._id === req.userId._id) ||
              t.leaderId?._id === req.userId._id
            );
            return {
              ...req,
              teamId: team?._id,
              teamName: team?.name,
            };
          });
          setTeamRequests(requestsWithTeam);
        }
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, t, router]);

  useEffect(() => {
    if (session?.user?.role === "leader") {
      fetchData();
    }
  }, [session, fetchData]);

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
      fetchData();
    } catch {
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
      fetchData();
    } catch {
      toast.error(t("errors.failedToReject"));
    }
  };

  // Bulk selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingFilteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFilteredRequests.map((r) => r._id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/leave-requests/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "approve" }),
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      if (successCount > 0) {
        toast.success(t("bulkAction.approvedCount", { count: successCount }));
      }
      if (failCount > 0) {
        toast.error(t("bulkAction.failedCount", { count: failCount }));
      }

      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error(t("errors.failedToApprove"));
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0 || !bulkRejectionReason) {
      toast.error(t("leaveRequest.validation.reasonRequired"));
      return;
    }

    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/leave-requests/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject", rejectionReason: bulkRejectionReason }),
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      if (successCount > 0) {
        toast.success(t("bulkAction.rejectedCount", { count: successCount }));
      }
      if (failCount > 0) {
        toast.error(t("bulkAction.failedCount", { count: failCount }));
      }

      setSelectedIds(new Set());
      setIsBulkRejectDialogOpen(false);
      setBulkRejectionReason("");
      fetchData();
    } catch {
      toast.error(t("errors.failedToReject"));
    } finally {
      setBulkProcessing(false);
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

  // Filter requests
  const filteredRequests = useMemo(() => {
    return teamRequests.filter((req) => {
      if (teamFilter !== "all" && req.teamId !== teamFilter) return false;
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (leaveTypeFilter !== "all" && req.leaveType !== leaveTypeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !req.userId.name.toLowerCase().includes(query) &&
          !req.userId.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [teamRequests, teamFilter, statusFilter, leaveTypeFilter, searchQuery]);

  // Pending filtered requests for bulk selection
  const pendingFilteredRequests = useMemo(() => {
    return filteredRequests.filter((r) => r.status === "pending");
  }, [filteredRequests]);

  const pendingCount = teamRequests.filter((r) => r.status === "pending").length;

  if (status === "loading" || !session) {
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("teamLeave.teamRequests")}</CardTitle>
              <CardDescription>{t("teamLeave.reviewApprove")}</CardDescription>
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
              {teams.length > 1 && (
                <Select value={teamFilter} onValueChange={setTeamFilter}>
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
              )}
              <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("leave.leaveType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="annual">{t("leave.annual")}</SelectItem>
                  <SelectItem value="sick">{t("leave.sick")}</SelectItem>
                  <SelectItem value="personal">{t("leave.personal")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("team.pending")}</SelectItem>
                  <SelectItem value="approved">{t("team.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("team.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Action Bar */}
          {pendingFilteredRequests.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === pendingFilteredRequests.length && pendingFilteredRequests.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? t("bulkAction.selected", { count: selectedIds.size })
                    : t("bulkAction.selectAll")}
                </span>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={handleBulkApprove}
                    disabled={bulkProcessing}
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    {t("bulkAction.approveSelected")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setIsBulkRejectDialogOpen(true)}
                    disabled={bulkProcessing}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {t("bulkAction.rejectSelected")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>{t("common.user")}</TableHead>
                  {teams.length > 1 && <TableHead>{t("common.team")}</TableHead>}
                  <TableHead>{t("leaveRequest.dateRange")}</TableHead>
                  <TableHead>{t("leaveRequest.days")}</TableHead>
                  <TableHead>{t("leave.leaveType")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("timesheet.remark")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>
                      {request.status === "pending" && (
                        <Checkbox
                          checked={selectedIds.has(request._id)}
                          onCheckedChange={() => toggleSelect(request._id)}
                        />
                      )}
                    </TableCell>
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
                    {teams.length > 1 && (
                      <TableCell>
                        <Badge variant="outline">{request.teamName || "-"}</Badge>
                      </TableCell>
                    )}
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
                      colSpan={teams.length > 1 ? 9 : 8}
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

      {/* Bulk Reject Dialog */}
      <Dialog open={isBulkRejectDialogOpen} onOpenChange={setIsBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bulkAction.rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("bulkAction.rejectDesc", { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("leaveRequest.rejectionReason")} *</Label>
              <Textarea
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder={t("leaveRequest.rejectionReasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkRejectDialogOpen(false)}
              disabled={bulkProcessing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={bulkProcessing}
            >
              {bulkProcessing ? t("common.loading") : t("bulkAction.rejectAll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
