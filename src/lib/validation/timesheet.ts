import type { ITimesheetEntry } from "@/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationContext {
  month: number;
  year: number;
}

/**
 * Validate a single timesheet entry
 */
export function validateEntry(
  entry: ITimesheetEntry,
  context: ValidationContext
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Hours cannot be negative
  if (entry.baseHours < 0) {
    errors.push(`Day ${entry.date}: Base hours cannot be negative`);
  }
  if (entry.additionalHours < 0) {
    errors.push(`Day ${entry.date}: Additional hours cannot be negative`);
  }

  // Rule 2: Date must be within timesheet month/year
  const daysInMonth = new Date(context.year, context.month, 0).getDate();
  if (entry.date < 1 || entry.date > daysInMonth) {
    errors.push(`Day ${entry.date}: Date must be between 1 and ${daysInMonth}`);
  }

  // Rule 3: Date cannot be in the future (only check for current/future months)
  const today = new Date();
  const entryDate = new Date(context.year, context.month - 1, entry.date);
  if (entryDate > today) {
    // This is a warning, not an error
    warnings.push(`Day ${entry.date}: Entry is for a future date`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all entries in a timesheet
 */
export function validateTimesheet(
  entries: ITimesheetEntry[],
  context: ValidationContext
): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const entry of entries) {
    const result = validateEntry(entry, context);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validate entries before submission (stricter)
 */
export function validateForSubmission(
  entries: ITimesheetEntry[],
  context: ValidationContext
): ValidationResult {
  const baseResult = validateTimesheet(entries, context);

  // Additional checks for submission
  // (Currently same as basic validation, can be extended)

  return baseResult;
}
