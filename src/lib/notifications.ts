import { Notification } from "@/models";
import type { NotificationType, NotificationCategory } from "@/types";
import { Types } from "mongoose";

interface CreateNotificationParams {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

const categoryMap: Record<NotificationType, NotificationCategory> = {
  timesheet_approved: "approval",
  timesheet_rejected: "approval",
  timesheet_pending: "approval",
  leave_approved: "approval",
  leave_rejected: "approval",
  leave_pending: "approval",
  team_leave: "team",
  system_announcement: "system",
  holiday_added: "system",
  deadline_reminder: "system",
};

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata } = params;

  const notification = await Notification.create({
    userId,
    type,
    category: categoryMap[type],
    title,
    message,
    link,
    metadata,
  });

  return notification;
}

export async function createNotifications(
  userIds: (string | Types.ObjectId)[],
  params: Omit<CreateNotificationParams, "userId">
) {
  const { type, title, message, link, metadata } = params;

  const notifications = await Notification.insertMany(
    userIds.map((userId) => ({
      userId,
      type,
      category: categoryMap[type],
      title,
      message,
      link,
      metadata,
    }))
  );

  return notifications;
}

// Helper functions for common notification types
export async function notifyTimesheetApproved(
  userId: string | Types.ObjectId,
  month: number,
  year: number
) {
  return createNotification({
    userId,
    type: "timesheet_approved",
    title: "Timesheet อนุมัติแล้ว",
    message: `Timesheet เดือน ${month}/${year} ได้รับการอนุมัติแล้ว`,
    link: `/timesheet`,
    metadata: { month, year },
  });
}

export async function notifyTimesheetRejected(
  userId: string | Types.ObjectId,
  month: number,
  year: number,
  reason?: string
) {
  return createNotification({
    userId,
    type: "timesheet_rejected",
    title: "Timesheet ถูกปฏิเสธ",
    message: reason
      ? `Timesheet เดือน ${month}/${year} ถูกปฏิเสธ: ${reason}`
      : `Timesheet เดือน ${month}/${year} ถูกปฏิเสธ`,
    link: `/timesheet`,
    metadata: { month, year, reason },
  });
}

export async function notifyPendingApproval(
  adminIds: (string | Types.ObjectId)[],
  userName: string,
  entityType: "timesheet" | "leave"
) {
  const title = entityType === "timesheet" ? "รอ Timesheet อนุมัติ" : "รอใบลาอนุมัติ";
  const message =
    entityType === "timesheet"
      ? `${userName} ส่ง Timesheet รออนุมัติ`
      : `${userName} ส่งใบลารออนุมัติ`;
  const link = entityType === "timesheet" ? "/team" : "/team/leaves";

  return createNotifications(adminIds, {
    type: entityType === "timesheet" ? "timesheet_pending" : "leave_pending",
    title,
    message,
    link,
  });
}

export async function notifyLeaveApproved(
  userId: string | Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

  return createNotification({
    userId,
    type: "leave_approved",
    title: "ใบลาอนุมัติแล้ว",
    message: `ใบลาวันที่ ${formatDate(startDate)} - ${formatDate(endDate)} อนุมัติแล้ว`,
    link: `/leave-requests`,
    metadata: { startDate, endDate },
  });
}

export async function notifyLeaveRejected(
  userId: string | Types.ObjectId,
  startDate: Date,
  endDate: Date,
  reason?: string
) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

  return createNotification({
    userId,
    type: "leave_rejected",
    title: "ใบลาถูกปฏิเสธ",
    message: reason
      ? `ใบลาวันที่ ${formatDate(startDate)} - ${formatDate(endDate)} ถูกปฏิเสธ: ${reason}`
      : `ใบลาวันที่ ${formatDate(startDate)} - ${formatDate(endDate)} ถูกปฏิเสธ`,
    link: `/leave-requests`,
    metadata: { startDate, endDate, reason },
  });
}

export async function notifyTeamLeave(
  adminIds: (string | Types.ObjectId)[],
  userName: string,
  startDate: Date,
  endDate: Date,
  leaveType: string
) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

  return createNotifications(adminIds, {
    type: "team_leave",
    title: "สมาชิกขอลา",
    message: `${userName} ขอลา${leaveType} ${formatDate(startDate)} - ${formatDate(endDate)}`,
    link: `/team/leaves`,
    metadata: { userName, startDate, endDate, leaveType },
  });
}

export async function notifyHolidayAdded(
  userIds: (string | Types.ObjectId)[],
  holidayName: string,
  date: Date
) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

  return createNotifications(userIds, {
    type: "holiday_added",
    title: "วันหยุดใหม่",
    message: `${holidayName} - ${formatDate(date)}`,
    link: `/calendar`,
    metadata: { holidayName, date },
  });
}

export async function notifySystemAnnouncement(
  userIds: (string | Types.ObjectId)[],
  title: string,
  message: string,
  link?: string
) {
  return createNotifications(userIds, {
    type: "system_announcement",
    title,
    message,
    link,
  });
}
