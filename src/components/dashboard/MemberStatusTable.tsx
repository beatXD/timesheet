"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberStatus {
  userId: string;
  name: string;
  timesheetStatus: string | null;
  totalHours: number;
  leaveDaysThisMonth: number;
}

interface MemberStatusTableProps {
  members: MemberStatus[];
}

type SortKey = "name" | "timesheetStatus" | "totalHours" | "leaveDaysThisMonth";
type SortDir = "asc" | "desc";

const statusBadgeConfig: Record<string, { className: string; label: string }> = {
  draft: {
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    label: "draft",
  },
  submitted: {
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    label: "submitted",
  },
  approved: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    label: "approved",
  },
  rejected: {
    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
    label: "rejected",
  },
};

export default function MemberStatusTable({ members }: MemberStatusTableProps) {
  const t = useTranslations("teamDashboard");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...members].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
    if (sortKey === "timesheetStatus") {
      const aVal = a.timesheetStatus || "";
      const bVal = b.timesheetStatus || "";
      return aVal.localeCompare(bVal) * dir;
    }
    if (sortKey === "totalHours") return (a.totalHours - b.totalHours) * dir;
    if (sortKey === "leaveDaysThisMonth") return (a.leaveDaysThisMonth - b.leaveDaysThisMonth) * dir;
    return 0;
  });

  const renderSortButton = (label: string, sortKeyName: SortKey) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  if (members.length === 0) {
    return (
      <Card className="border-0 shadow-sm p-8 text-center text-muted-foreground">
        {t("noMembers")}
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {renderSortButton(t("name"), "name")}
              </TableHead>
              <TableHead>
                {renderSortButton(t("status"), "timesheetStatus")}
              </TableHead>
              <TableHead className="text-right">
                {renderSortButton(t("totalHours"), "totalHours")}
              </TableHead>
              <TableHead className="text-right">
                {renderSortButton(t("leaveDays"), "leaveDaysThisMonth")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((member) => {
              const statusKey = member.timesheetStatus;
              const config = statusKey ? statusBadgeConfig[statusKey] : null;

              return (
                <TableRow
                  key={member.userId}
                  className={cn(
                    !statusKey && "bg-muted/30"
                  )}
                >
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    {config ? (
                      <Badge variant="outline" className={config.className}>
                        {t(config.label)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                        {t("notCreated")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{member.totalHours} {t("hoursUnit")}</TableCell>
                  <TableCell className="text-right">{member.leaveDaysThisMonth} {t("daysUnit")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
