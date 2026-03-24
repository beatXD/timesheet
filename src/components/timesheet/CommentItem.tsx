"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface CommentUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

export interface CommentData {
  _id: string;
  userId: CommentUser | string;
  message: string;
  entryDate?: number;
  createdAt: string;
}

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string;
  onDelete: (commentId: string) => void;
  deleting?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  deleting,
}: CommentItemProps) {
  const t = useTranslations("comments");

  const user =
    typeof comment.userId === "object" ? comment.userId : null;
  const commentUserId =
    typeof comment.userId === "object"
      ? comment.userId._id
      : comment.userId;
  const isOwner = commentUserId === currentUserId;

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 shrink-0">
        {user?.image && <AvatarImage src={user.image} alt={user.name} />}
        <AvatarFallback className="text-xs">
          {user ? getInitials(user.name) : "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {user?.name || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(comment.createdAt)}
          </span>
          {comment.entryDate && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {t("entryComment", { date: comment.entryDate })}
            </Badge>
          )}
        </div>
        <p className="text-sm mt-0.5 break-words">{comment.message}</p>
      </div>
      {isOwner && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => {
            if (window.confirm(t("deleteConfirm"))) {
              onDelete(comment._id);
            }
          }}
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
