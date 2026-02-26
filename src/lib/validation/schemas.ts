import { z } from "zod";

// Leave Request Schemas
export const createLeaveRequestSchema = z.object({
  startDate: z.string().datetime({ message: "Invalid start date format" }),
  endDate: z.string().datetime({ message: "Invalid end date format" }),
  leaveType: z.enum(["sick", "personal", "annual"], {
    message: "Leave type must be sick, personal, or annual",
  }),
  reason: z.string().max(500, "Reason must be 500 characters or less").optional(),
});

export const leaveRequestActionSchema = z.object({
  action: z.enum(["approve", "reject"], {
    message: "Action must be 'approve' or 'reject'",
  }),
  rejectionReason: z.string().min(1, "Rejection reason is required").max(500).optional(),
}).refine(
  (data) => data.action !== "reject" || (data.rejectionReason && data.rejectionReason.length > 0),
  { message: "Rejection reason is required when rejecting", path: ["rejectionReason"] }
);

// Timesheet Entry Schema
export const timesheetEntrySchema = z.object({
  date: z.number().int().min(1).max(31, "Date must be between 1 and 31"),
  type: z.enum(["working", "weekend", "holiday", "leave"], {
    message: "Invalid entry type",
  }),
  leaveType: z.enum(["sick", "personal", "annual"]).optional(),
  task: z.string().max(500, "Task must be 500 characters or less").optional(),
  timeIn: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format").optional().or(z.literal("")),
  timeOut: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format").optional().or(z.literal("")),
  baseHours: z.number().min(0, "Hours cannot be negative").max(24, "Hours cannot exceed 24"),
  additionalHours: z.number().min(0, "Hours cannot be negative").max(24, "Hours cannot exceed 24"),
  remark: z.string().max(500, "Remark must be 500 characters or less").optional(),
});

export const updateTimesheetSchema = z.object({
  entries: z.array(timesheetEntrySchema).max(31, "Cannot have more than 31 entries"),
});

// Timesheet Rejection Schema
export const timesheetRejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500, "Reason must be 500 characters or less"),
});

// Team Submit Schema
export const teamSubmitSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  month: z.number().int().min(1).max(12, "Month must be between 1 and 12"),
  year: z.number().int().min(2020).max(2100, "Invalid year"),
});

// Admin Timesheet Approval Schema (base)
const adminTimesheetBaseSchema = z.object({
  timesheetIds: z.array(z.string()).optional(),
  teamId: z.string().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
});

export const adminTimesheetApprovalSchema = adminTimesheetBaseSchema.refine(
  (data) =>
    (data.timesheetIds && data.timesheetIds.length > 0) ||
    (data.teamId && data.month && data.year),
  { message: "Either timesheetIds or teamId/month/year is required" }
);

export const adminTimesheetRejectSchema = adminTimesheetBaseSchema.extend({
  reason: z.string().min(1, "Rejection reason is required").max(500),
}).refine(
  (data) =>
    (data.timesheetIds && data.timesheetIds.length > 0) ||
    (data.teamId && data.month && data.year),
  { message: "Either timesheetIds or teamId/month/year is required" }
);

// Leave Settings Schema
export const leaveSettingsSchema = z.object({
  defaultQuotas: z.object({
    sick: z.number().int().min(0).max(365, "Invalid sick days quota"),
    personal: z.number().int().min(0).max(365, "Invalid personal days quota"),
    annual: z.number().int().min(0).max(365, "Invalid annual days quota"),
  }),
  resetMonth: z.number().int().min(1).max(12, "Reset month must be between 1 and 12"),
});

// User Update Schema
export const updateUserSchema = z.object({
  _id: z.string().min(1, "User ID is required"),
  role: z.enum(["super_admin", "admin", "user"]).optional(),
});

// Holiday Schema
export const holidaySchema = z.object({
  date: z.string().datetime({ message: "Invalid date format" }),
  name: z.string().min(1, "Holiday name is required").max(100, "Name must be 100 characters or less"),
  year: z.number().int().min(2020).max(2100, "Invalid year"),
});

// Helper function to validate and parse
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Zod 4 uses issues instead of errors
    const issues = result.error.issues || [];
    const firstIssue = issues[0];
    return { success: false, error: firstIssue?.message || "Validation failed" };
  }
  return { success: true, data: result.data };
}
