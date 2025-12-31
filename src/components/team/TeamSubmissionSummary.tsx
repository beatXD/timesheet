"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface TeamSubmissionSummaryProps {
  totalMembers: number;
  submittedCount: number;
  notSubmittedMembers: TeamMember[];
  loading?: boolean;
}

export function TeamSubmissionSummary({
  totalMembers,
  submittedCount,
  notSubmittedMembers,
  loading,
}: TeamSubmissionSummaryProps) {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
    );
  }

  const allSubmitted = submittedCount === totalMembers && totalMembers > 0;
  const hasNotSubmitted = notSubmittedMembers.length > 0;
  const percentage = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {allSubmitted ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">
            {submittedCount}/{totalMembers}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("teamSubmission.submitted")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            allSubmitted
              ? "bg-green-500"
              : percentage >= 50
              ? "bg-amber-500"
              : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Not submitted popover */}
      {hasNotSubmitted && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-muted gap-1 text-xs py-0.5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
            >
              {notSubmittedMembers.length} {t("teamSubmission.notSubmitted")}
              <ChevronDown className="w-3 h-3" />
            </Badge>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              {t("teamSubmission.notSubmitted")}
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {notSubmittedMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.image} />
                    <AvatarFallback className="text-[9px]">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{member.name}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {allSubmitted && (
        <Badge
          variant="outline"
          className="text-xs py-0.5 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
        >
          {t("teamSubmission.allSubmitted")}
        </Badge>
      )}
    </div>
  );
}
