"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Save, Send, AlertCircle, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import type { ITimesheet, ITimesheetEntry, EntryType, TimesheetStatus } from "@/types";

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const typeOptions: { value: EntryType; label: string }[] = [
  { value: "working", label: "Working Day" },
  { value: "weekend", label: "Weekend" },
  { value: "holiday", label: "Holiday" },
  { value: "leave", label: "Leave" },
];

const typeColors: Record<EntryType, string> = {
  working: "",
  weekend: "bg-gray-50",
  holiday: "bg-yellow-50",
  leave: "bg-blue-50",
};

export default function TimesheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [timesheet, setTimesheet] = useState<ITimesheet | null>(null);
  const [entries, setEntries] = useState<ITimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const isEditable =
    timesheet?.status === "draft" || timesheet?.status === "rejected";

  const fetchTimesheet = useCallback(async () => {
    try {
      const res = await fetch(`/api/timesheets/${params.id}`);
      const data = await res.json();
      if (data.data) {
        setTimesheet(data.data);
        setEntries(data.data.entries);
      }
    } catch (error) {
      toast.error("Failed to fetch timesheet");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTimesheet();
  }, [fetchTimesheet]);

  const updateEntry = (index: number, field: keyof ITimesheetEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };

    // Auto-calculate hours if time changed
    if (field === "timeIn" || field === "timeOut") {
      const entry = newEntries[index];
      if (entry.timeIn && entry.timeOut && entry.type === "working") {
        const [inH, inM] = entry.timeIn.split(":").map(Number);
        const [outH, outM] = entry.timeOut.split(":").map(Number);
        const hours = outH - inH + (outM - inM) / 60 - 1; // -1 for lunch
        newEntries[index].baseHours = Math.max(0, Math.round(hours * 100) / 100);
      }
    }

    // Reset hours if type is not working
    if (field === "type" && value !== "working") {
      newEntries[index].baseHours = 0;
      newEntries[index].timeIn = "";
      newEntries[index].timeOut = "";
    }

    setEntries(newEntries);
  };

  const saveTimesheet = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/timesheets/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return;
      }

      toast.success("Timesheet saved");
      fetchTimesheet();
    } catch (error) {
      toast.error("Failed to save timesheet");
    } finally {
      setSaving(false);
    }
  };

  const submitTimesheet = async () => {
    setSubmitting(true);
    try {
      // Save first
      await fetch(`/api/timesheets/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      // Then submit
      const res = await fetch(`/api/timesheets/${params.id}/submit`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to submit");
        return;
      }

      toast.success("Timesheet submitted for approval");
      setShowSubmitDialog(false);
      fetchTimesheet();
    } catch (error) {
      toast.error("Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  };

  const totalBaseHours = entries.reduce((sum, e) => sum + (e.baseHours || 0), 0);
  const totalAdditionalHours = entries.reduce(
    (sum, e) => sum + (e.additionalHours || 0),
    0
  );
  const totalManDays = totalBaseHours / 8;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Timesheet not found</p>
        <Button variant="link" onClick={() => router.push("/timesheet")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/timesheet")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy", {
                locale: th,
              })}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[timesheet.status]}>
                {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
              </Badge>
              {timesheet.status === "rejected" && timesheet.rejectedReason && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {timesheet.rejectedReason}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Export buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <a href={`/api/timesheets/${params.id}/export/excel`} download>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/timesheets/${params.id}/export/pdf`} download>
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isEditable && (
            <>
              <Button variant="outline" onClick={saveTimesheet} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Base Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBaseHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Additional Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdditionalHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Man-Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalManDays.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Entries</CardTitle>
          <CardDescription>Fill in your daily work details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Date</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="min-w-[300px]">Task</TableHead>
                  <TableHead className="w-24">Time In</TableHead>
                  <TableHead className="w-24">Time Out</TableHead>
                  <TableHead className="w-24">Base Hrs</TableHead>
                  <TableHead className="w-24">Add. Hrs</TableHead>
                  <TableHead className="w-40">Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => {
                  const date = new Date(
                    timesheet.year,
                    timesheet.month - 1,
                    entry.date
                  );
                  const dayName = format(date, "EEE");

                  return (
                    <TableRow
                      key={entry.date}
                      className={typeColors[entry.type]}
                    >
                      <TableCell className="font-medium">
                        {entry.date}
                        <span className="text-gray-500 ml-1 text-xs">
                          {dayName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.type}
                          onValueChange={(v) => updateEntry(index, "type", v)}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {typeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={entry.task || ""}
                          onChange={(e) =>
                            updateEntry(index, "task", e.target.value)
                          }
                          disabled={!isEditable || entry.type !== "working"}
                          className="min-h-[60px] text-sm"
                          placeholder={
                            entry.type === "working"
                              ? "Describe your work..."
                              : ""
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={entry.timeIn || ""}
                          onChange={(e) =>
                            updateEntry(index, "timeIn", e.target.value)
                          }
                          disabled={!isEditable || entry.type !== "working"}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={entry.timeOut || ""}
                          onChange={(e) =>
                            updateEntry(index, "timeOut", e.target.value)
                          }
                          disabled={!isEditable || entry.type !== "working"}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={entry.baseHours || 0}
                          onChange={(e) =>
                            updateEntry(
                              index,
                              "baseHours",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={!isEditable || entry.type !== "working"}
                          className="h-8 w-20"
                          min="0"
                          step="0.5"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={entry.additionalHours || 0}
                          onChange={(e) =>
                            updateEntry(
                              index,
                              "additionalHours",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={!isEditable}
                          className="h-8 w-20"
                          min="0"
                          step="0.5"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.remark || ""}
                          onChange={(e) =>
                            updateEntry(index, "remark", e.target.value)
                          }
                          disabled={!isEditable}
                          className="h-8"
                          placeholder={
                            entry.type === "holiday" || entry.type === "leave"
                              ? "Reason..."
                              : ""
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Timesheet</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this timesheet for approval? You
              won&apos;t be able to edit it after submission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Base Hours:</span>
                <span className="ml-2 font-medium">{totalBaseHours}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Man-Days:</span>
                <span className="ml-2 font-medium">
                  {totalManDays.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={submitTimesheet} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
