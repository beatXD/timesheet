"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Users } from "lucide-react";

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
      <Card>
        <CardContent className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
        </CardContent>
      </Card>
    );
  }

  const allSubmitted = submittedCount === totalMembers && totalMembers > 0;
  const hasNotSubmitted = notSubmittedMembers.length > 0;

  return (
    <Card className={allSubmitted ? "border-green-200 dark:border-green-800" : hasNotSubmitted ? "border-amber-200 dark:border-amber-800" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t("teamSubmission.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {allSubmitted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-2xl font-bold">
              {submittedCount}/{totalMembers}
            </span>
            <span className="text-muted-foreground">
              {t("teamSubmission.submitted")}
            </span>
          </div>
          {allSubmitted && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
              {t("teamSubmission.allSubmitted")}
            </Badge>
          )}
        </div>

        {/* Not Submitted List */}
        {hasNotSubmitted && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("teamSubmission.notSubmitted")}:
            </p>
            <div className="flex flex-wrap gap-2">
              {notSubmittedMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.image} />
                    <AvatarFallback className="text-[10px]">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    {member.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
