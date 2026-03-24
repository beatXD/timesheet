export type DeadlineStatus = "normal" | "warning" | "urgent" | "overdue";

export interface DeadlineInfo {
  status: DeadlineStatus;
  daysLeft: number;
}

/**
 * Calculate deadline status for a timesheet based on its month/year.
 * Deadline = last day of the given month.
 */
export function getDeadlineStatus(month: number, year: number): DeadlineInfo {
  // Last day of the month (month is 1-indexed, so new Date(year, month, 0) gives last day)
  const lastDay = new Date(year, month, 0);
  lastDay.setHours(23, 59, 59, 999);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());

  const diffMs = deadlineDay.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: "overdue", daysLeft };
  }
  if (daysLeft === 0) {
    return { status: "urgent", daysLeft: 0 };
  }
  if (daysLeft <= 7) {
    return { status: "warning", daysLeft };
  }
  return { status: "normal", daysLeft };
}

/**
 * Server-side version using Asia/Bangkok timezone.
 * Used by cron jobs.
 */
export function getDeadlineStatusTH(month: number, year: number): DeadlineInfo {
  const lastDay = new Date(year, month, 0);
  const nowUTC = new Date();
  // Convert to Bangkok time (UTC+7)
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(nowUTC.getTime() + bangkokOffset);
  const today = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth(), bangkokNow.getDate());
  const deadlineDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());

  const diffMs = deadlineDay.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: "overdue", daysLeft };
  }
  if (daysLeft === 0) {
    return { status: "urgent", daysLeft: 0 };
  }
  if (daysLeft <= 7) {
    return { status: "warning", daysLeft };
  }
  return { status: "normal", daysLeft };
}
