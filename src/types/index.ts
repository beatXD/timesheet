import { Types } from "mongoose";

// User Roles
export type UserRole = "admin" | "leader" | "user";

// Timesheet Entry Types
export type EntryType = "working" | "weekend" | "holiday" | "leave";

// Timesheet Status
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

// User
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  role: UserRole;
  teamId?: Types.ObjectId;
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
  vendorId?: Types.ObjectId;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Timesheet Entry (embedded in Timesheet)
export interface ITimesheetEntry {
  date: number; // day of month (1-31)
  type: EntryType;
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

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Extended User for NextAuth
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
}
