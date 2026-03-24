import { Types } from "mongoose";

// User Roles
export type UserRole = "super_admin" | "admin" | "user";

// Subscription Plans
export type SubscriptionPlan = string; // Dynamic from database
export type SubscriptionStatus = "active" | "cancelled" | "past_due";

// Plan (stored in database)
export interface IPlan {
  _id: Types.ObjectId;
  slug: string; // unique identifier (e.g., "free", "team", "enterprise")
  name: string;
  description?: string;
  monthlyPrice: number; // in THB
  maxUsers: number;
  maxTeams: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  stripePriceId?: string; // For Stripe integration
  createdAt: Date;
  updatedAt: Date;
}

// Subscription
export interface ISubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  maxUsers: number;
  maxTeams: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
}

// Timesheet Entry Types
export type EntryType = "working" | "weekend" | "holiday" | "leave";

// Leave Types
export type LeaveType = "sick" | "personal" | "annual";

// Timesheet Status
export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

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
  subscription?: ISubscription;
  invitedBy?: Types.ObjectId;
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
  adminId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Invite
export interface IInvite {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  adminId: Types.ObjectId;
  token: string;
  email?: string;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  createdAt: Date;
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
  leaveRequestId?: Types.ObjectId | string;
  leavePending?: boolean;
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

// Leave Request Source
export type LeaveRequestSource = "leave_form" | "timesheet";

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
  source?: LeaveRequestSource;
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
  subscriptionPlan?: SubscriptionPlan;
}

