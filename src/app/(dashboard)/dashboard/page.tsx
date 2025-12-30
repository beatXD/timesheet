"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, FileCheck, FileX, Send, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";

interface DashboardData {
  counts: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  hours: {
    base: number;
    additional: number;
    manDays: number;
  };
  recentTimesheets: Array<{
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
      image?: string;
    };
    month: number;
    year: number;
    status: TimesheetStatus;
    totalBaseHours: number;
    updatedAt: string;
  }>;
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      toast.error("Failed to fetch dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMM yyyy", { locale: th });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Overview of your timesheet activities</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.counts.draft || 0}</div>
            <p className="text-xs text-gray-500">timesheets in draft</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Send className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.counts.submitted || 0}
            </div>
            <p className="text-xs text-gray-500">pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <FileCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.counts.approved || 0}
            </div>
            <p className="text-xs text-gray-500">this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <FileX className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.counts.rejected || 0}
            </div>
            <p className="text-xs text-gray-500">need revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Hours Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Base Hours
            </CardTitle>
            <Calendar className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.hours.base || 0}</div>
            <p className="text-xs text-gray-500">approved this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Additional Hours
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.hours.additional || 0}
            </div>
            <p className="text-xs text-gray-500">approved this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Man-Days</CardTitle>
            <Calendar className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.hours.manDays.toFixed(1) || 0}
            </div>
            <p className="text-xs text-gray-500">approved this year</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Timesheets</CardTitle>
          <CardDescription>Latest timesheet activities</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentTimesheets && data.recentTimesheets.length > 0 ? (
            <div className="space-y-4">
              {data.recentTimesheets.map((ts) => (
                <Link
                  key={ts._id}
                  href={`/timesheet/${ts._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
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
                      <p className="text-sm text-gray-500">
                        {getMonthName(ts.month, ts.year)} - {ts.totalBaseHours}{" "}
                        hrs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[ts.status]}>
                      {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(ts.updatedAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No timesheets yet. Create your first timesheet to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
