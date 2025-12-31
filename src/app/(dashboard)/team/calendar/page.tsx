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
  isBefore,
  isAfter,
  differenceInDays,
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

  // Split days into weeks for the calendar grid
  const weeksInMonth = useMemo(() => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Add empty slots for days before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      currentWeek.push(null as unknown as Date);
    }

    daysInMonth.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Push remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [daysInMonth, firstDayOfMonth]);

  // Calculate leave bars for each week
  interface LeaveBar {
    leave: LeaveRequest;
    startCol: number;
    span: number;
    isStart: boolean;
    isEnd: boolean;
  }

  const getLeavesBarsForWeek = useCallback(
    (weekDays: Date[], weekIndex: number): LeaveBar[] => {
      const bars: LeaveBar[] = [];
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      filteredLeaveRequests.forEach((leave) => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);

        // Get the actual days in this week (filter out nulls)
        const validDays = weekDays.filter((d) => d !== null);
        if (validDays.length === 0) return;

        const weekStart = validDays[0];
        const weekEnd = validDays[validDays.length - 1];

        // Check if leave overlaps with this week
        if (isAfter(leaveStart, weekEnd) || isBefore(leaveEnd, weekStart)) {
          return;
        }

        // Calculate start column (0-6)
        let startCol = 0;
        if (isBefore(leaveStart, weekStart) || isSameDay(leaveStart, weekStart)) {
          // Leave started before or at week start
          startCol = weekDays.findIndex((d) => d !== null);
        } else {
          // Leave starts within this week
          startCol = weekDays.findIndex(
            (d) => d !== null && isSameDay(d, leaveStart)
          );
        }

        // Calculate end column
        let endCol = 6;
        if (isAfter(leaveEnd, weekEnd) || isSameDay(leaveEnd, weekEnd)) {
          // Leave ends after or at week end
          endCol = weekDays.length - 1;
          // Find last valid day
          for (let i = weekDays.length - 1; i >= 0; i--) {
            if (weekDays[i] !== null) {
              endCol = i;
              break;
            }
          }
        } else {
          // Leave ends within this week
          endCol = weekDays.findIndex(
            (d) => d !== null && isSameDay(d, leaveEnd)
          );
        }

        if (startCol === -1 || endCol === -1) return;

        const span = endCol - startCol + 1;
        const isStart =
          isSameDay(leaveStart, weekDays[startCol]) ||
          (weekIndex === 0 && isBefore(leaveStart, monthStart));
        const isEnd =
          isSameDay(leaveEnd, weekDays[endCol]) ||
          (weekIndex === weeksInMonth.length - 1 && isAfter(leaveEnd, monthEnd));

        bars.push({
          leave,
          startCol,
          span,
          isStart,
          isEnd,
        });
      });

      // Sort bars by start date for consistent stacking
      bars.sort((a, b) => {
        const aStart = new Date(a.leave.startDate).getTime();
        const bStart = new Date(b.leave.startDate).getTime();
        if (aStart !== bStart) return aStart - bStart;
        // If same start, sort by duration (longer first)
        const aDuration = differenceInDays(
          new Date(a.leave.endDate),
          new Date(a.leave.startDate)
        );
        const bDuration = differenceInDays(
          new Date(b.leave.endDate),
          new Date(b.leave.startDate)
        );
        return bDuration - aDuration;
      });

      return bars;
    },
    [filteredLeaveRequests, currentMonth, weeksInMonth.length]
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("teamCalendar.title")}</h1>
          <p className="text-muted-foreground">{t("teamCalendar.description")}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl">
                {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
              </CardTitle>
              {/* Legend */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", leaveTypeColors.sick.dot)} />
                  <span className="text-xs text-muted-foreground">{t("leave.type.sick")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", leaveTypeColors.personal.dot)} />
                  <span className="text-xs text-muted-foreground">{t("leave.type.personal")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", leaveTypeColors.annual.dot)} />
                  <span className="text-xs text-muted-foreground">{t("leave.type.annual")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">{t("teamCalendar.holiday")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

              {/* Calendar grid - week by week */}
              {weeksInMonth.map((week, weekIndex) => {
                const leaveBars = getLeavesBarsForWeek(week, weekIndex);

                return (
                  <div key={weekIndex} className="relative">
                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                      {week.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${weekIndex}-${dayIndex}`}
                              className="min-h-[100px] p-2 border-b border-r bg-muted/20"
                            />
                          );
                        }

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
                          </div>
                        );
                      })}
                    </div>

                    {/* Leave bars overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="grid grid-cols-7 h-full">
                        {week.map((_, dayIndex) => (
                          <div key={dayIndex} className="relative" />
                        ))}
                      </div>
                      {/* Render spanning leave bars */}
                      {leaveBars.slice(0, 4).map((bar, barIndex) => {
                        const { leave, startCol, span, isStart, isEnd } = bar;
                        const colors = leaveTypeColors[leave.leaveType];

                        return (
                          <Popover key={`${leave._id}-${weekIndex}`}>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "absolute h-5 text-xs px-1.5 flex items-center pointer-events-auto truncate transition-opacity hover:opacity-80",
                                  colors.bg,
                                  colors.text,
                                  isStart ? "rounded-l" : "rounded-l-none border-l-0",
                                  isEnd ? "rounded-r" : "rounded-r-none"
                                )}
                                style={{
                                  left: `calc(${(startCol / 7) * 100}% + 4px)`,
                                  width: `calc(${(span / 7) * 100}% - 8px)`,
                                  top: `${32 + barIndex * 22}px`,
                                }}
                              >
                                {isStart && leave.userId.name.split(" ")[0]}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 pointer-events-auto">
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
                                      colors.bg,
                                      colors.text
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
                        );
                      })}
                      {leaveBars.length > 4 && (
                        <div
                          className="absolute text-xs text-muted-foreground pointer-events-auto"
                          style={{
                            left: "4px",
                            top: `${32 + 4 * 22}px`,
                          }}
                        >
                          +{leaveBars.length - 4} {t("teamCalendar.more")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
