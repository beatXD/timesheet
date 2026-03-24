import { LeaveRequest, LeaveBalance, LeaveSettings, Timesheet } from "@/models";
import type { ITimesheetEntry, LeaveType } from "@/types";
import type { Types } from "mongoose";

// Helper function to calculate working days between two dates
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Check leave balance for a user/year/leaveType.
 * Returns { total, used, remaining }.
 */
export async function checkLeaveBalance(
  userId: string,
  year: number,
  leaveType: LeaveType
): Promise<{ total: number; used: number; remaining: number }> {
  const settings = await LeaveSettings.getSettings();
  const balance = await LeaveBalance.getOrCreateForUser(
    userId,
    year,
    settings.defaultQuotas
  );

  // Calculate used days from approved leave requests (source of truth)
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  const approvedRequests = await LeaveRequest.find({
    userId,
    status: "approved",
    startDate: { $gte: yearStart, $lte: yearEnd },
  }).lean();

  let used = 0;
  for (const req of approvedRequests) {
    if (req.leaveType === leaveType) {
      used += calculateWorkingDays(
        new Date(req.startDate),
        new Date(req.endDate)
      );
    }
  }

  const total = balance.quotas[leaveType].total;
  return { total, used, remaining: total - used };
}

interface SyncResult {
  entries: ITimesheetEntry[];
  error?: string;
}

/**
 * Sync leave entries from timesheet to LeaveRequest records.
 * Called from PUT /api/timesheets/[id].
 *
 * Compares old vs new entries and creates/removes LeaveRequests accordingly.
 */
export async function syncTimesheetLeavesToRequests(params: {
  month: number;
  year: number;
  previousEntries: ITimesheetEntry[];
  newEntries: ITimesheetEntry[];
  userId: string;
  userRole: string;
}): Promise<SyncResult> {
  const { month, year, previousEntries, newEntries, userId, userRole } = params;
  const isLeader = userRole === "admin" || userRole === "super_admin";

  // Build lookup maps by date
  const oldByDate = new Map<number, ITimesheetEntry>();
  for (const entry of previousEntries) {
    oldByDate.set(entry.date, entry);
  }

  // Collect balance checks needed (group by leaveType to batch check)
  const balanceNeeded: Map<LeaveType, number> = new Map();

  // Identify changes
  const addedLeave: { index: number; entry: ITimesheetEntry }[] = [];
  const removedLeave: { oldEntry: ITimesheetEntry }[] = [];
  const changedLeaveType: { index: number; oldEntry: ITimesheetEntry; entry: ITimesheetEntry }[] = [];

  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];
    const old = oldByDate.get(entry.date);

    if (entry.type === "leave" && !entry.leaveRequestId) {
      // New leave entry without existing link
      if (!old || old.type !== "leave") {
        addedLeave.push({ index: i, entry });
      }
    } else if (entry.type === "leave" && entry.leaveRequestId && old?.type === "leave" && old.leaveRequestId) {
      // Both are leave but check if leaveType changed
      if (entry.leaveType !== old.leaveType) {
        changedLeaveType.push({ index: i, oldEntry: old, entry });
      }
    } else if (entry.type !== "leave" && old?.type === "leave" && old.leaveRequestId) {
      // Was leave with a linked request, now changed to something else
      removedLeave.push({ oldEntry: old });
    }
  }

  // Also check for old leave entries that no longer exist in new entries
  for (const [date, old] of oldByDate) {
    if (old.type === "leave" && old.leaveRequestId) {
      const newEntry = newEntries.find((e) => e.date === date);
      if (!newEntry) {
        removedLeave.push({ oldEntry: old });
      }
    }
  }

  // For changed leaveType: treat as remove + add
  for (const change of changedLeaveType) {
    removedLeave.push({ oldEntry: change.oldEntry });
    // Clear leaveRequestId so it gets treated as new
    newEntries[change.index] = { ...change.entry, leaveRequestId: undefined, leavePending: undefined };
    addedLeave.push({ index: change.index, entry: newEntries[change.index] });
  }

  // Calculate total balance needed per leaveType
  for (const { entry } of addedLeave) {
    const lt = entry.leaveType as LeaveType;
    balanceNeeded.set(lt, (balanceNeeded.get(lt) || 0) + 1);
  }

  // Account for balance being restored from removals (same leaveType)
  for (const { oldEntry } of removedLeave) {
    const lt = oldEntry.leaveType as LeaveType;
    // Only count restored balance if the request was approved
    // We'll check actual status below, but for now estimate
    if (oldEntry.leaveRequestId) {
      balanceNeeded.set(lt, (balanceNeeded.get(lt) || 0) - 1);
    }
  }

  // Check balance for each leaveType that needs additional days
  for (const [lt, needed] of balanceNeeded) {
    if (needed <= 0) continue;
    const balance = await checkLeaveBalance(userId, year, lt);
    if (needed > balance.remaining) {
      const leaveTypeNames: Record<string, string> = {
        sick: "sick",
        personal: "personal",
        annual: "annual",
      };
      return {
        entries: newEntries,
        error: `Insufficient ${leaveTypeNames[lt]} leave balance. ${balance.remaining} day(s) remaining, ${needed} day(s) needed.`,
      };
    }
  }

  // Process removals first (to free up balance before adds)
  for (const { oldEntry } of removedLeave) {
    if (!oldEntry.leaveRequestId) continue;

    try {
      const leaveReq = await LeaveRequest.findById(oldEntry.leaveRequestId);
      if (!leaveReq) continue;

      if (leaveReq.status === "approved") {
        // Restore balance
        const lt = leaveReq.leaveType as "sick" | "personal" | "annual";
        const reqYear = new Date(leaveReq.startDate).getFullYear();
        const settings = await LeaveSettings.getSettings();
        const balance = await LeaveBalance.getOrCreateForUser(userId, reqYear, settings.defaultQuotas);
        balance.quotas[lt].used = Math.max(0, balance.quotas[lt].used - 1);
        balance.markModified("quotas");
        await balance.save();

        // Mark as rejected (cancelled by timesheet edit)
        leaveReq.status = "rejected";
        leaveReq.rejectionReason = "Cancelled via timesheet edit";
        await leaveReq.save();
      } else if (leaveReq.status === "pending") {
        await LeaveRequest.findByIdAndDelete(leaveReq._id);
      }
    } catch (err) {
      console.error("Error removing leave request during sync:", err);
    }
  }

  // Clear leaveRequestId/leavePending from entries that had leave removed
  for (const newEntry of newEntries) {
    const old = oldByDate.get(newEntry.date);
    if (newEntry.type !== "leave" && old?.type === "leave" && old.leaveRequestId) {
      newEntry.leaveRequestId = undefined;
      newEntry.leavePending = undefined;
    }
  }

  // Process additions
  for (const { index, entry } of addedLeave) {
    const lt = entry.leaveType as LeaveType;
    const entryDate = new Date(year, month - 1, entry.date);
    const autoApprove = lt === "sick" || isLeader;

    try {
      const leaveReq = await LeaveRequest.create({
        userId,
        startDate: entryDate,
        endDate: entryDate,
        leaveType: lt,
        reason: entry.remark || "",
        status: autoApprove ? "approved" : "pending",
        source: "timesheet",
        daysRequested: 1,
        ...(autoApprove && {
          reviewedBy: userId,
          reviewedAt: new Date(),
          daysApproved: 1,
        }),
      });

      // If auto-approved, deduct balance
      if (autoApprove) {
        const settings = await LeaveSettings.getSettings();
        const balance = await LeaveBalance.getOrCreateForUser(userId, year, settings.defaultQuotas);
        balance.quotas[lt].used += 1;
        balance.markModified("quotas");
        await balance.save();
      }

      newEntries[index] = {
        ...entry,
        leaveRequestId: leaveReq._id,
        leavePending: !autoApprove,
      };
    } catch (err) {
      console.error("Error creating leave request during sync:", err);
    }
  }

  return { entries: newEntries };
}

/**
 * Clear leavePending flag on timesheet entry when leave request is approved.
 * Used for source="timesheet" requests where entry already exists.
 */
export async function clearLeavePendingFlag(leaveRequestId: Types.ObjectId): Promise<void> {
  // Find the timesheet containing this entry
  const timesheet = await Timesheet.findOne({
    "entries.leaveRequestId": leaveRequestId,
  });

  if (!timesheet) return;

  const entry = timesheet.entries.find(
    (e: ITimesheetEntry) =>
      e.leaveRequestId?.toString() === leaveRequestId.toString()
  );

  if (entry) {
    entry.leavePending = false;
    await timesheet.save();
  }
}

/**
 * Revert a timesheet leave entry back to working day.
 * Used when a source="timesheet" leave request is rejected or cancelled.
 */
export async function revertTimesheetLeaveEntry(leaveRequestId: Types.ObjectId): Promise<void> {
  const timesheet = await Timesheet.findOne({
    "entries.leaveRequestId": leaveRequestId,
  });

  if (!timesheet) return;

  const entryIndex = timesheet.entries.findIndex(
    (e: ITimesheetEntry) =>
      e.leaveRequestId?.toString() === leaveRequestId.toString()
  );

  if (entryIndex === -1) return;

  // Revert to working day
  const entry = timesheet.entries[entryIndex];
  entry.type = "working";
  entry.leaveType = undefined;
  entry.leaveRequestId = undefined;
  entry.leavePending = undefined;
  entry.task = "";
  entry.timeIn = "";
  entry.timeOut = "";
  entry.baseHours = 0;
  entry.additionalHours = 0;
  entry.remark = "";

  // Recalculate totals
  timesheet.totalBaseHours = timesheet.entries.reduce(
    (sum: number, e: { baseHours?: number }) => sum + (e.baseHours || 0),
    0
  );
  timesheet.totalAdditionalHours = timesheet.entries.reduce(
    (sum: number, e: { additionalHours?: number }) => sum + (e.additionalHours || 0),
    0
  );

  await timesheet.save();
}
