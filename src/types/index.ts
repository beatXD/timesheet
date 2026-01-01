import { Types } from "mongoose";

// User Roles
export type UserRole = "admin" | "leader" | "user";

// Timesheet Entry Types
export type EntryType = "working" | "weekend" | "holiday" | "leave";

// Leave Types
export type LeaveType = "sick" | "personal" | "annual";

// Timesheet Status
export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "team_submitted"
  | "final_approved";

// Leave Request Status
export type LeaveRequestStatus = "pending" | "approved" | "rejected";

// User
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  role: UserRole;
  teamIds?: Types.ObjectId[];
  vendorId?: Types.ObjectId;
  contractRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Account (for OAuth account linking)
export interface IAccount {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

// Team
export interface ITeam {
  _id: Types.ObjectId;
  name: string;
  leaderId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  projectId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Vendor
export interface IVendor {
  _id: Types.ObjectId;
  name: string;
  contractNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project
export interface IProject {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Timesheet Entry (embedded in Timesheet)
export interface ITimesheetEntry {
  date: number; // day of month (1-31)
  type: EntryType;
  leaveType?: LeaveType; // Used when type = "leave"
  task?: string;
  timeIn?: string; // HH:mm format
  timeOut?: string; // HH:mm format
  baseHours: number;
  additionalHours: number;
  remark?: string;
}

// Timesheet
export interface ITimesheet {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  month: number; // 1-12
  year: number;
  status: TimesheetStatus;
  entries: ITimesheetEntry[];
  totalBaseHours: number;
  totalAdditionalHours: number;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedReason?: string;
  teamSubmittedAt?: Date;
  teamSubmittedBy?: Types.ObjectId;
  finalApprovedAt?: Date;
  finalApprovedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Personal Timesheet (no approval workflow)
export interface IPersonalTimesheet {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  month: number; // 1-12
  year: number;
  entries: ITimesheetEntry[];
  totalBaseHours: number;
  totalAdditionalHours: number;
  createdAt: Date;
  updatedAt: Date;
}

// Holiday
export interface IHoliday {
  _id: Types.ObjectId;
  date: Date;
  name: string;
  year: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Leave Request
export interface ILeaveRequest {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  leaveType: LeaveType;
  reason?: string;
  status: LeaveRequestStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  // Balance tracking fields
  daysRequested?: number;
  daysApproved?: number;
  exceedsBalance?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Leave Balance
export interface ILeaveQuota {
  total: number;
  used: number;
}

export interface ILeaveBalance {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  year: number;
  quotas: {
    sick: ILeaveQuota;
    personal: ILeaveQuota;
    annual: ILeaveQuota;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Leave Settings
export interface ILeaveSettings {
  _id: Types.ObjectId;
  defaultQuotas: {
    sick: number;
    personal: number;
    annual: number;
  };
  resetMonth: number;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

// Audit Log
export type AuditEntityType = "timesheet" | "leave_request";
export type AuditAction = "create" | "submit" | "approve" | "reject" | "cancel" | "team_submit" | "final_approve" | "auto_approve";

export interface IAuditLog {
  _id: Types.ObjectId;
  entityType: AuditEntityType;
  entityId: Types.ObjectId;
  action: AuditAction;
  fromStatus?: string;
  toStatus: string;
  performedBy: Types.ObjectId;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Notification Types
export type NotificationType =
  | "timesheet_approved"
  | "timesheet_rejected"
  | "timesheet_pending"
  | "leave_approved"
  | "leave_rejected"
  | "leave_pending"
  | "team_leave"
  | "system_announcement"
  | "holiday_added";

export type NotificationCategory = "approval" | "team" | "system";

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface INotificationPreferences {
  approval: boolean;
  team: boolean;
  system: boolean;
}

// Extended User for NextAuth
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
}

// GitHub Integration Types
export interface IGitHubRepository {
  owner: string;
  name: string;
  fullName: string; // "owner/name"
  isPrivate: boolean;
  enabled: boolean;
}

export interface IGitHubRepoSettings {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  repositories: IGitHubRepository[];
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGitHubCommit {
  sha: string;
  message: string;
  originalMessage?: string; // Original message before AI summarization
  date: Date;
  repo: string; // "owner/name"
  url: string;
}

export interface IGitHubStatus {
  connected: boolean;
  hasRepoScope: boolean;
  username?: string;
}
