"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, GitCommit, Calendar } from "lucide-react";
import type { IGitHubCommit } from "@/types";

// Check if commit is a merge commit (client-safe version)
function isMergeCommit(message: string): boolean {
  const mergePatterns = [
    /^Merge pull request/i,
    /^Merge branch/i,
    /^Merge remote-tracking/i,
    /^Merge commit/i,
  ];
  return mergePatterns.some((pattern) => pattern.test(message));
}

interface CommitImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheetId: string;
  month: number;
  year: number;
  onImportComplete: () => void;
}

export function CommitImportDialog({
  open,
  onOpenChange,
  timesheetId,
  month,
  year,
  onImportComplete,
}: CommitImportDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [commits, setCommits] = useState<IGitHubCommit[]>([]);
  const [groupedCommits, setGroupedCommits] = useState<
    Record<number, IGitHubCommit[]>
  >({});
  const [mode, setMode] = useState<"append" | "replace">("append");

  useEffect(() => {
    if (open) {
      fetchCommits();
    }
  }, [open, month, year]);

  const fetchCommits = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/github/commits?month=${month}&year=${year}`
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("github.failedToFetchCommits"));
        return;
      }

      setCommits(data.data.commits || []);
      setGroupedCommits(data.data.groupedByDate || {});
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      // Convert grouped commits with proper date keys
      const commitsByDate: Record<number, IGitHubCommit[]> = {};
      for (const [day, dayCommits] of Object.entries(groupedCommits)) {
        commitsByDate[parseInt(day)] = dayCommits;
      }

      const res = await fetch(`/api/timesheets/${timesheetId}/import-commits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitsByDate, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("github.failedToImport"));
        return;
      }

      toast.success(
        t("github.importSuccess", { count: data.updatedCount || 0 })
      );
      onImportComplete();
      onOpenChange(false);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setImporting(false);
    }
  };

  // Filter out merge commits for display
  const filteredCommits = commits.filter(
    (commit) => !isMergeCommit(commit.message)
  );

  const sortedDays = Object.keys(groupedCommits)
    .map(Number)
    .sort((a, b) => a - b);

  const monthName = new Date(year, month - 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCommit className="w-5 h-5" />
            {t("github.importCommits")}
          </DialogTitle>
          <DialogDescription>
            {t("github.importCommitsDesc", { month: monthName })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredCommits.length === 0 ? (
          <div className="text-center py-12">
            <GitCommit className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("github.noCommits")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">
                  {t("github.foundCommits", { count: filteredCommits.length })}
                </p>
                <Badge variant="secondary">
                  {sortedDays.length} {t("github.daysWithCommits")}
                </Badge>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {sortedDays.map((day) => {
                    const dayCommits = groupedCommits[day].filter(
                      (c) => !isMergeCommit(c.message)
                    );
                    if (dayCommits.length === 0) return null;

                    return (
                      <div key={day} className="space-y-2">
                        <div className="flex items-center gap-2 sticky top-0 bg-background py-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {day} {monthName.split(" ")[0]}
                          </span>
                          <Badge variant="outline" className="ml-auto">
                            {dayCommits.length} commits
                          </Badge>
                        </div>
                        <div className="space-y-1 pl-6">
                          {dayCommits.map((commit) => (
                            <div
                              key={commit.sha}
                              className="flex items-start gap-2 text-sm p-2 rounded border bg-muted/30"
                            >
                              <code className="text-xs text-muted-foreground shrink-0">
                                {commit.sha}
                              </code>
                              <span className="flex-1 break-words">
                                [{commit.repo.split("/")[1]}] {commit.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-3 block">
                  {t("github.importMode")}
                </Label>
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as "append" | "replace")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="append" id="append" />
                    <Label htmlFor="append" className="cursor-pointer">
                      {t("github.appendMode")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="cursor-pointer">
                      {t("github.replaceMode")}
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                  {mode === "append"
                    ? t("github.appendModeDesc")
                    : t("github.replaceModeDesc")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={importing}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("github.import")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
