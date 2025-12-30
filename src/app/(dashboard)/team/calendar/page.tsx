"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isWeekend,
} from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaveRequestUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: { _id: string; name: string; email: string }[];
  leaderId: { _id: string; name: string; email: string };
}

interface LeaveRequest {
  _id: string;
  userId: LeaveRequestUser;
  startDate: string;
  endDate: string;
  leaveType: "sick" | "personal" | "annual";
  reason?: string;
  status: "pending" | "approved" | "rejected";
}

interface Holiday {
  _id: string;
  name: string;
  date: string;
}

const leaveTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  sick: {
    bg: "bg-orange-100 dark:bg-orange-500/20",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  personal: {
    bg: "bg-purple-100 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  annual: {
    bg: "bg-cyan-100 dark:bg-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
};

export default function TeamCalendarPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const { data: session, status } = useSession();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Check access
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      redirect("/login");
    }
    if (session.user.role === "user") {
      redirect("/calendar");
    }
  }, [session, status]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, requestsRes, holidaysRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/leave-requests?scope=team&status=approved"),
        fetch("/api/admin/holidays"),
      ]);

      const teamsData = await teamsRes.json();
      const requestsData = await requestsRes.json();
      const holidaysData = await holidaysRes.json();

      if (teamsData.data) {
        const myTeams = teamsData.data.filter(
          (team: Team) =>
            team.leaderId?._id === session?.user?.id || session?.user?.role === "admin"
        );
        setTeams(myTeams);
      }

      if (requestsData.data) {
        setLeaveRequests(requestsData.data);
      }

      if (holidaysData.data) {
        setHolidays(holidaysData.data);
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, session?.user?.role, t]);

  useEffect(() => {
    if (session?.user?.role === "leader" || session?.user?.role === "admin") {
      fetchData();
    }
  }, [session, fetchData]);

  // Get team member IDs for filtering
  const teamMemberIds = useMemo(() => {
    if (teamFilter === "all") {
      const allIds = new Set<string>();
      teams.forEach((team) => {
        team.memberIds.forEach((m) => allIds.add(m._id));
        if (team.leaderId) allIds.add(team.leaderId._id);
      });
      return allIds;
    }
    const team = teams.find((t) => t._id === teamFilter);
    if (!team) return new Set<string>();
    const ids = new Set<string>();
    team.memberIds.forEach((m) => ids.add(m._id));
    if (team.leaderId) ids.add(team.leaderId._id);
    return ids;
  }, [teams, teamFilter]);

  // Filter leave requests by team
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((req) => teamMemberIds.has(req.userId._id));
  }, [leaveRequests, teamMemberIds]);

  // Get days of current month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));

  // Get leaves for a specific day
  const getLeavesForDay = useCallback(
    (day: Date) => {
      return filteredLeaveRequests.filter((req) => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        return day >= start && day <= end;
      });
    },
    [filteredLeaveRequests]
  );

  // Get holiday for a specific day
  const getHolidayForDay = useCallback(
    (day: Date) => {
      return holidays.find((h) => isSameDay(new Date(h.date), day));
    },
    [holidays]
  );

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  const weekDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("teamCalendar.title")}</h1>
          <p className="text-muted-foreground">{t("teamCalendar.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-40">
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
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", leaveTypeColors.sick.dot)} />
          <span className="text-sm">{t("leave.type.sick")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", leaveTypeColors.personal.dot)} />
          <span className="text-sm">{t("leave.type.personal")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", leaveTypeColors.annual.dot)} />
          <span className="text-sm">{t("leave.type.annual")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm">{t("teamCalendar.holiday")}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                <Calendar className="w-4 h-4 mr-1" />
                {t("teamCalendar.today")}
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Week day headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className={cn(
                      "p-2 text-center text-sm font-medium border-b",
                      day === "sun" || day === "sat"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {t(`teamCalendar.days.${day}`)}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells for days before first day of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[100px] p-2 border-b border-r bg-muted/20"
                  />
                ))}

                {/* Days of the month */}
                {daysInMonth.map((day) => {
                  const dayLeaves = getLeavesForDay(day);
                  const holiday = getHolidayForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isWeekendDay = isWeekend(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[100px] p-2 border-b border-r relative",
                        isWeekendDay && "bg-muted/20",
                        holiday && "bg-red-50 dark:bg-red-900/10"
                      )}
                    >
                      {/* Day number */}
                      <div
                        className={cn(
                          "text-sm font-medium mb-1",
                          isToday &&
                            "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center",
                          isWeekendDay && !isToday && "text-muted-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </div>

                      {/* Holiday indicator */}
                      {holiday && (
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium truncate mb-1">
                          {holiday.name}
                        </div>
                      )}

                      {/* Leave indicators */}
                      <div className="space-y-1">
                        {dayLeaves.slice(0, 3).map((leave) => (
                          <Popover key={leave._id}>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "w-full text-left text-xs px-1.5 py-0.5 rounded truncate",
                                  leaveTypeColors[leave.leaveType].bg,
                                  leaveTypeColors[leave.leaveType].text
                                )}
                              >
                                {leave.userId.name.split(" ")[0]}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={leave.userId.image} />
                                  <AvatarFallback className="text-xs">
                                    {leave.userId.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {leave.userId.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {leave.userId.email}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    {t("leave.leaveType")}:
                                  </span>
                                  <Badge
                                    className={cn(
                                      leaveTypeColors[leave.leaveType].bg,
                                      leaveTypeColors[leave.leaveType].text
                                    )}
                                  >
                                    {t(`leave.type.${leave.leaveType}`)}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    {t("leaveRequest.dateRange")}:
                                  </span>
                                  <span>
                                    {format(
                                      new Date(leave.startDate),
                                      "dd/MM",
                                      { locale: dateLocale }
                                    )}{" "}
                                    -{" "}
                                    {format(new Date(leave.endDate), "dd/MM", {
                                      locale: dateLocale,
                                    })}
                                  </span>
                                </div>
                                {leave.reason && (
                                  <div className="pt-2 border-t">
                                    <span className="text-muted-foreground">
                                      {t("timesheet.remark")}:
                                    </span>
                                    <p className="text-sm mt-1">{leave.reason}</p>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ))}
                        {dayLeaves.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayLeaves.length - 3} {t("teamCalendar.more")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
