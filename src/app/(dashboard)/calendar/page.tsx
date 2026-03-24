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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaveRequest {
  _id: string;
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

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: {
    bg: "bg-yellow-100 dark:bg-yellow-500/20",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  approved: {
    bg: "bg-green-100 dark:bg-green-500/20",
    text: "text-green-700 dark:text-green-300",
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-300",
  },
};

export default function MyCalendarPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const { data: session, status } = useSession();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      redirect("/login");
    }
  }, [session, status]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsRes, holidaysRes] = await Promise.all([
        fetch("/api/leave-requests?scope=own"),
        fetch("/api/admin/holidays"),
      ]);

      const requestsData = await requestsRes.json();
      const holidaysData = await holidaysRes.json();

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
  }, [t]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, fetchData]);

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

      leaveRequests.forEach((leave) => {
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
          startCol = weekDays.findIndex((d) => d !== null);
        } else {
          startCol = weekDays.findIndex(
            (d) => d !== null && isSameDay(d, leaveStart)
          );
        }

        // Calculate end column
        let endCol = 6;
        if (isAfter(leaveEnd, weekEnd) || isSameDay(leaveEnd, weekEnd)) {
          endCol = weekDays.length - 1;
          for (let i = weekDays.length - 1; i >= 0; i--) {
            if (weekDays[i] !== null) {
              endCol = i;
              break;
            }
          }
        } else {
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
    [leaveRequests, currentMonth, weeksInMonth.length]
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("myCalendar.title")}</h1>
          <p className="text-muted-foreground">{t("myCalendar.description")}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
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
          <span className="text-sm">{t("myCalendar.holiday")}</span>
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
                {t("myCalendar.today")}
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
            <div className="border rounded-lg overflow-hidden" style={{ minHeight: 'calc(6 * 80px + 40px)' }}>
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
                              className="min-h-20 p-2 border-b border-r bg-muted/20"
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
                              "min-h-20 p-2 border-b border-r relative",
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
                      <div className="grid grid-cols-7">
                        {week.map((_, dayIndex) => (
                          <div key={dayIndex} className="relative" />
                        ))}
                      </div>
                      {/* Render spanning leave bars */}
                      {leaveBars.slice(0, 4).map((bar, barIndex) => {
                        const { leave, startCol, span, isStart, isEnd } = bar;
                        const colors =
                          leave.status === "approved"
                            ? leaveTypeColors[leave.leaveType]
                            : statusColors[leave.status];

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
                                {isStart && t(`leave.type.${leave.leaveType}`)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 pointer-events-auto">
                              <div className="space-y-2 text-sm">
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
                                    {t("common.status")}:
                                  </span>
                                  <Badge
                                    className={cn(
                                      statusColors[leave.status].bg,
                                      statusColors[leave.status].text
                                    )}
                                  >
                                    {t(`leaveRequest.status.${leave.status}`)}
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
