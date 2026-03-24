"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import CommentItem, { type CommentData } from "./CommentItem";

interface CommentSectionProps {
  timesheetId: string;
  comments: CommentData[];
  currentUserId: string;
  onCommentsChange: (comments: CommentData[]) => void;
  entryDate?: number;
}

export default function CommentSection({
  timesheetId,
  comments,
  currentUserId,
  onCommentsChange,
  entryDate,
}: CommentSectionProps) {
  const t = useTranslations("comments");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter comments by entryDate if provided
  const filteredComments = entryDate
    ? comments.filter((c) => c.entryDate === entryDate)
    : comments;

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/timesheets/${timesheetId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: message.trim(),
            entryDate,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add comment");
        return;
      }

      const data = await res.json();
      onCommentsChange(data.data);
      setMessage("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  }, [message, timesheetId, entryDate, onCommentsChange]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      setDeletingId(commentId);
      try {
        const res = await fetch(
          `/api/timesheets/${timesheetId}/comments/${commentId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to delete comment");
          return;
        }

        onCommentsChange(comments.filter((c) => c._id !== commentId));
      } catch {
        toast.error("Failed to delete comment");
      } finally {
        setDeletingId(null);
      }
    },
    [timesheetId, comments, onCommentsChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t("title")}
          {filteredComments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredComments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments list */}
        {filteredComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t("noComments")}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredComments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                deleting={deletingId === comment._id}
              />
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 items-end">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="min-h-[60px] text-sm resize-none"
            maxLength={500}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
