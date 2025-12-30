"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Check, X, Filter } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types";

interface TeamTimesheet {
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
  totalAdditionalHours: number;
  submittedAt?: string;
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function TeamPage() {
  const [timesheets, setTimesheets] = useState<TeamTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("submitted");

  // Filter states
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchTimesheets();
  }, [filter, filterYear, filterMonth]);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }
      params.set("year", filterYear);
      if (filterMonth !== "all") {
        params.set("month", filterMonth);
      }

      const res = await fetch(`/api/team/timesheets?${params}`);
      const data = await res.json();
      if (data.data) {
        setTimesheets(data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch timesheets");
    } finally {
      setLoading(false);
    }
  };

  const approveTimesheet = async (id: string) => {
    try {
      const res = await fetch(`/api/timesheets/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to approve");
        return;
      }

      toast.success("Timesheet approved");
      fetchTimesheets();
    } catch (error) {
      toast.error("Failed to approve timesheet");
    }
  };

  const rejectTimesheet = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const res = await fetch(`/api/timesheets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to reject");
        return;
      }

      toast.success("Timesheet rejected");
      fetchTimesheets();
    } catch (error) {
      toast.error("Failed to reject timesheet");
    }
  };

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMMM yyyy", { locale: th });
  };

  const pendingCount = timesheets.filter((t) => t.status === "submitted").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Timesheets</h1>
          <p className="text-gray-500">Review and approve team member timesheets</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {format(new Date(2024, m - 1), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="submitted">
            Pending Approval
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-blue-500">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {filter === "submitted"
                  ? "Pending Approval"
                  : filter === "approved"
                  ? "Approved Timesheets"
                  : filter === "rejected"
                  ? "Rejected Timesheets"
                  : "All Timesheets"}
              </CardTitle>
              <CardDescription>
                {filter === "submitted"
                  ? "Review and approve these timesheets"
                  : `Showing ${filter} timesheets`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : timesheets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No timesheets found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Base Hours</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets.map((ts) => (
                      <TableRow key={ts._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
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
                              <p className="text-xs text-gray-500">
                                {ts.userId.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getMonthName(ts.month, ts.year)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[ts.status]}>
                            {ts.status.charAt(0).toUpperCase() +
                              ts.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{ts.totalBaseHours} hrs</TableCell>
                        <TableCell>
                          {ts.submittedAt
                            ? format(
                                new Date(ts.submittedAt),
                                "dd/MM/yyyy HH:mm"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/timesheet/${ts._id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {ts.status === "submitted" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveTimesheet(ts._id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => rejectTimesheet(ts._id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
