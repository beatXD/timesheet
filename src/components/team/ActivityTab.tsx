"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface ActivityUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface ActivityLog {
  _id: string;
  userId: ActivityUser;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
}

const ACTION_TYPES = [
  "timesheet_created",
  "timesheet_updated",
  "timesheet_submitted",
  "timesheet_approved",
  "timesheet_rejected",
  "timesheet_comment",
  "leave_requested",
  "leave_approved",
  "leave_rejected",
  "member_added",
  "member_removed",
] as const;

interface ActivityTabProps {
  members: TeamMember[];
}

export function ActivityTab({ members }: ActivityTabProps) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const fetchActivities = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");

        if (filterAction !== "all") params.set("action", filterAction);
        if (filterMember !== "all") params.set("memberId", filterMember);
        if (filterFrom) params.set("from", filterFrom);
        if (filterTo) params.set("to", filterTo);

        const res = await fetch(`/api/team/activity?${params.toString()}`);
        const data = await res.json();

        if (data.data) {
          setActivities(data.data);
          setPagination(data.pagination);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    },
    [filterAction, filterMember, filterFrom, filterTo]
  );

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  const getActionText = (action: string): string => {
    try {
      return t(`actions.${action}`);
    } catch {
      return action.replace(/_/g, " ");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("filterAction")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allActions")}</SelectItem>
              {ACTION_TYPES.map((action) => (
                <SelectItem key={action} value={action}>
                  {getActionText(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("filterMember")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allMembers")}</SelectItem>
              {members.map((member) => (
                <SelectItem key={member._id} value={member._id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-36"
            placeholder={t("from")}
          />
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-36"
            placeholder={t("to")}
          />
        </div>

        {/* Activity list */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("noActivity")}
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={activity.userId.image} />
                  <AvatarFallback className="text-xs">
                    {getInitials(activity.userId.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">
                      {activity.userId.name}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      {getActionText(activity.action)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(activity.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {t("showing", {
                from: (pagination.page - 1) * pagination.limit + 1,
                to: Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                ),
                total: pagination.total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchActivities(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchActivities(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
