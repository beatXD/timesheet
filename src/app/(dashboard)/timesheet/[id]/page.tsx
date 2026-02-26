"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
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
import { ArrowLeft, Save, Send, AlertCircle, Download, FileSpreadsheet, FileText, Layout, Bookmark, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useModeStore } from "@/store";
import type { ITimesheet, IPersonalTimesheet, ITimesheetEntry, EntryType, TimesheetStatus, LeaveType } from "@/types";

interface Template {
  _id: string;
  name: string;
  description?: string;
  entries: {
    dayOfWeek: number;
    type: string;
    task?: string;
    timeIn?: string;
    timeOut?: string;
    baseHours: number;
  }[];
  isDefault: boolean;
}

const statusColors: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

const typeOptions: EntryType[] = ["working", "weekend", "holiday", "leave"];
const leaveTypeOptions: LeaveType[] = ["sick", "personal", "annual"];

const typeColors: Record<EntryType, string> = {
  working: "",
  weekend: "bg-muted/50",
  holiday: "bg-yellow-50 dark:bg-yellow-500/10",
  leave: "bg-blue-50 dark:bg-blue-500/10",
};

export default function TimesheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const { mode } = useModeStore();
  const isPersonalMode = mode === "personal";
  const dateLocale = locale === "th" ? th : enUS;
  const [timesheet, setTimesheet] = useState<ITimesheet | IPersonalTimesheet | null>(null);
  const [entries, setEntries] = useState<ITimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Template states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isDefaultTemplate, setIsDefaultTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Sync holidays state (for personal mode)
  const [syncingHolidays, setSyncingHolidays] = useState(false);

  // Personal mode: always editable. Team mode: only draft or rejected
  const isEditable = isPersonalMode ||
    (timesheet && "status" in timesheet && (timesheet.status === "draft" || timesheet.status === "rejected"));

  const fetchTimesheet = useCallback(async () => {
    try {
      const endpoint = isPersonalMode
        ? `/api/personal-timesheets/${params.id}`
        : `/api/timesheets/${params.id}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.data) {
        setTimesheet(data.data);
        setEntries(data.data.entries);
      }
    } catch (error) {
      toast.error(t("errors.failedToFetch"));
    } finally {
      setLoading(false);
    }
  }, [params.id, t, isPersonalMode]);

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
        const timeInMinutes = inH * 60 + inM;
        const timeOutMinutes = outH * 60 + outM;

        let hours = (timeOutMinutes - timeInMinutes) / 60;

        // Only deduct lunch break (12:00-13:00) if the work period covers it
        const lunchStart = 12 * 60; // 12:00 in minutes
        const lunchEnd = 13 * 60;   // 13:00 in minutes

        if (timeInMinutes < lunchEnd && timeOutMinutes > lunchStart) {
          // Calculate actual overlap with lunch period
          const overlapStart = Math.max(timeInMinutes, lunchStart);
          const overlapEnd = Math.min(timeOutMinutes, lunchEnd);
          const lunchOverlap = Math.max(0, overlapEnd - overlapStart) / 60;
          hours -= lunchOverlap;
        }

        newEntries[index].baseHours = Math.max(0, Math.round(hours * 100) / 100);
      }
    }

    // Reset hours if type is not working
    if (field === "type" && value !== "working") {
      newEntries[index].baseHours = 0;
      newEntries[index].timeIn = "";
      newEntries[index].timeOut = "";
    }

    // Reset leaveType if type is not leave
    if (field === "type" && value !== "leave") {
      newEntries[index].leaveType = undefined;
    }

    setEntries(newEntries);
  };

  const saveTimesheet = async () => {
    setSaving(true);
    try {
      const endpoint = isPersonalMode
        ? `/api/personal-timesheets/${params.id}`
        : `/api/timesheets/${params.id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(t("success.timesheetSaved"));
      fetchTimesheet();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
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
        toast.error(data.error || t("errors.failedToSubmit"));
        return;
      }

      toast.success(t("success.timesheetSubmitted"));
      setShowSubmitDialog(false);
      fetchTimesheet();
    } catch {
      toast.error(t("errors.failedToSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  // Template functions
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/timesheet-templates");
      const data = await res.json();
      if (data.data) {
        setTemplates(data.data);
      }
    } catch {
      // Silent fail - templates are optional
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(t("template.nameRequired"));
      return;
    }

    setSavingTemplate(true);
    try {
      // Convert current entries to template format (by day of week)
      const templateEntries = entries.map((entry) => {
        const date = new Date(timesheet!.year, timesheet!.month - 1, entry.date);
        return {
          dayOfWeek: date.getDay(),
          type: entry.type,
          task: entry.task,
          timeIn: entry.timeIn,
          timeOut: entry.timeOut,
          baseHours: entry.baseHours || 0,
        };
      }).filter(e => e.type === "working"); // Only save working day patterns

      const res = await fetch("/api/timesheet-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          entries: templateEntries,
          isDefault: isDefaultTemplate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(t("template.saved"));
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      setIsDefaultTemplate(false);
      fetchTemplates();
    } catch {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSavingTemplate(false);
    }
  };

  const applyTemplate = (template: Template) => {
    if (!timesheet) return;

    const newEntries = [...entries];

    // Apply template entries based on day of week
    newEntries.forEach((entry, index) => {
      const date = new Date(timesheet.year, timesheet.month - 1, entry.date);
      const dayOfWeek = date.getDay();

      // Find matching template entry for this day of week
      const templateEntry = template.entries.find(te => te.dayOfWeek === dayOfWeek);

      if (templateEntry && entry.type !== "holiday" && entry.type !== "leave") {
        newEntries[index] = {
          ...entry,
          type: templateEntry.type as EntryType,
          task: templateEntry.task,
          timeIn: templateEntry.timeIn,
          timeOut: templateEntry.timeOut,
          baseHours: templateEntry.baseHours,
        };
      }
    });

    setEntries(newEntries);
    setShowApplyTemplateDialog(false);
    toast.success(t("template.applied"));
  };

  // Sync holidays function (works for both personal and team modes)
  const syncHolidays = async () => {
    setSyncingHolidays(true);
    try {
      const endpoint = isPersonalMode
        ? `/api/personal-timesheets/${params.id}/sync-holidays`
        : `/api/timesheets/${params.id}/sync-holidays`;

      const res = await fetch(endpoint, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToSync"));
        return;
      }

      toast.success(data.message || t("timesheet.holidaysSynced"));
      fetchTimesheet();
    } catch {
      toast.error(t("errors.failedToSync"));
    } finally {
      setSyncingHolidays(false);
    }
  };

  const totalBaseHours = entries.reduce((sum, e) => sum + (e.baseHours || 0), 0);
  const totalAdditionalHours = entries.reduce(
    (sum, e) => sum + (e.additionalHours || 0),
    0
  );
  const totalManDays = totalBaseHours / 8;

  // Leave summary calculations
  const leaveSummary = {
    sick: entries.filter((e) => e.type === "leave" && e.leaveType === "sick").length,
    personal: entries.filter((e) => e.type === "leave" && e.leaveType === "personal").length,
    annual: entries.filter((e) => e.type === "leave" && e.leaveType === "annual").length,
  };
  const totalLeaveDays = leaveSummary.sick + leaveSummary.personal + leaveSummary.annual;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("timesheet.notFound")}</p>
        <Button variant="link" onClick={() => router.push("/timesheet")}>
          {t("common.backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy", {
                locale: dateLocale,
              })}
            </h1>
            {!isPersonalMode && "status" in timesheet && (
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusColors[timesheet.status]}>
                  {t(`timesheet.status.${timesheet.status}`)}
                </Badge>
                {timesheet.status === "rejected" && timesheet.rejectedReason && (
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {timesheet.rejectedReason}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Template buttons - only when editable */}
          {isEditable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Layout className="w-4 h-4 mr-2" />
                  {t("template.title")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowApplyTemplateDialog(true)}>
                  <Layout className="w-4 h-4 mr-2" />
                  {t("template.apply")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSaveTemplateDialog(true)}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  {t("template.saveAs")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sync Holidays button - when editable (both personal and team modes) */}
          {isEditable && (
            <Button
              variant="outline"
              onClick={syncHolidays}
              disabled={syncingHolidays}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncingHolidays ? "animate-spin" : ""}`} />
              {syncingHolidays ? t("common.syncing") : t("timesheet.syncHolidays")}
            </Button>
          )}

          {/* Export buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t("common.export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <a href={`/api/${isPersonalMode ? "personal-timesheets" : "timesheets"}/${params.id}/export/excel`} download>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {t("timesheet.exportToExcel")}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/${isPersonalMode ? "personal-timesheets" : "timesheets"}/${params.id}/export/pdf`} download>
                  <FileText className="w-4 h-4 mr-2" />
                  {t("timesheet.exportToPdf")}
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isEditable && (
            <>
              <Button variant="outline" onClick={saveTimesheet} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? t("common.saving") : t("common.save")}
              </Button>
              {!isPersonalMode && (
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  {t("timesheet.submit")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("timesheet.totalBaseHours")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBaseHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("timesheet.totalAdditionalHours")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdditionalHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("timesheet.totalManDays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalManDays.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Summary */}
      {totalLeaveDays > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("leave.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.sick")}</span>
                <span className="font-bold">{leaveSummary.sick} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.personal")}</span>
                <span className="font-bold">{leaveSummary.personal} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t("leave.annual")}</span>
                <span className="font-bold">{leaveSummary.annual} {t("leave.days")}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">{t("leave.total")}</span>
                <span className="font-bold text-primary">{totalLeaveDays} {t("leave.days")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("timesheet.dailyEntries")}</CardTitle>
          <CardDescription>{t("timesheet.fillDetails")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("timesheet.date")}</TableHead>
                  <TableHead className="w-32">{t("timesheet.type")}</TableHead>
                  <TableHead className="w-32">{t("leave.leaveType")}</TableHead>
                  <TableHead className="min-w-[300px]">{t("timesheet.task")}</TableHead>
                  <TableHead className="w-24">{t("timesheet.timeIn")}</TableHead>
                  <TableHead className="w-24">{t("timesheet.timeOut")}</TableHead>
                  <TableHead className="w-24">{t("timesheet.baseHrs")}</TableHead>
                  <TableHead className="w-24">{t("timesheet.addHrs")}</TableHead>
                  <TableHead className="w-40">{t("timesheet.remark")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => {
                  const date = new Date(
                    timesheet.year,
                    timesheet.month - 1,
                    entry.date
                  );
                  const dayName = format(date, "EEE", { locale: dateLocale });

                  return (
                    <TableRow
                      key={entry.date}
                      className={typeColors[entry.type]}
                    >
                      <TableCell className="font-medium">
                        {entry.date}
                        <span className="text-muted-foreground ml-1 text-xs">
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
                            {typeOptions.map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`timesheet.${type}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {entry.type === "leave" ? (
                          <Select
                            value={entry.leaveType || ""}
                            onValueChange={(v) => updateEntry(index, "leaveType", v)}
                            disabled={!isEditable}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={t("leave.selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypeOptions.map((leaveType) => (
                                <SelectItem key={leaveType} value={leaveType}>
                                  {t(`leave.${leaveType}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
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
                              ? t("timesheet.describeWork")
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
                              ? t("timesheet.reason")
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
            <DialogTitle>{t("timesheet.submitTimesheet")}</DialogTitle>
            <DialogDescription>
              {t("timesheet.confirmSubmit")} {t("timesheet.confirmSubmitDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("timesheet.totalBaseHours")}:</span>
                <span className="ml-2 font-medium">{totalBaseHours}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("timesheet.totalManDays")}:</span>
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
              {t("common.cancel")}
            </Button>
            <Button onClick={submitTimesheet} disabled={submitting}>
              {submitting ? t("timesheet.submitting") : t("timesheet.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("template.saveAs")}</DialogTitle>
            <DialogDescription>
              {t("template.saveDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">{t("template.name")}</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t("template.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">{t("common.description")}</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder={t("template.descriptionPlaceholder")}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefaultTemplate}
                onChange={(e) => setIsDefaultTemplate(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">
                {t("template.setAsDefault")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveTemplateDialog(false);
                setTemplateName("");
                setTemplateDescription("");
                setIsDefaultTemplate(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={showApplyTemplateDialog} onOpenChange={setShowApplyTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("template.apply")}</DialogTitle>
            <DialogDescription>
              {t("template.applyDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t("template.noTemplates")}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map((template) => (
                  <div
                    key={template._id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => applyTemplate(template)}
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            {t("template.default")}
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      {t("template.use")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApplyTemplateDialog(false)}
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
