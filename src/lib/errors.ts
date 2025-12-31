import { NextResponse } from "next/server";

/**
 * Standard error codes for the application
 */
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  // Authorization errors (403)
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // Validation errors (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",

  // Conflict errors (409)
  CONFLICT: "CONFLICT",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  VERSION_CONFLICT: "VERSION_CONFLICT",

  // Rate limiting (429)
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}

/**
 * Application error class with code support
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse(): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        ...(this.details && { details: this.details }),
      },
      { status: this.statusCode }
    );
  }
}

/**
 * Error factory functions for common errors
 */
export const Errors = {
  unauthorized: (message = "กรุณาเข้าสู่ระบบ") =>
    new AppError(message, ErrorCodes.UNAUTHORIZED, 401),

  forbidden: (message = "ไม่มีสิทธิ์เข้าถึง") =>
    new AppError(message, ErrorCodes.FORBIDDEN, 403),

  notFound: (resource = "ข้อมูล") =>
    new AppError(`ไม่พบ${resource}`, ErrorCodes.NOT_FOUND, 404),

  validation: (message: string, details?: Record<string, unknown>) =>
    new AppError(message, ErrorCodes.VALIDATION_ERROR, 400, details),

  conflict: (message: string) =>
    new AppError(message, ErrorCodes.CONFLICT, 409),

  versionConflict: () =>
    new AppError(
      "ข้อมูลถูกแก้ไขโดยผู้อื่น กรุณาโหลดใหม่แล้วลองอีกครั้ง",
      ErrorCodes.VERSION_CONFLICT,
      409
    ),

  rateLimited: () =>
    new AppError(
      "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
      ErrorCodes.RATE_LIMITED,
      429
    ),

  internal: (message = "เกิดข้อผิดพลาดภายในระบบ") =>
    new AppError(message, ErrorCodes.INTERNAL_ERROR, 500),

  database: (message = "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล") =>
    new AppError(message, ErrorCodes.DATABASE_ERROR, 500),
};

/**
 * Handle Mongoose version conflict error
 */
export function isVersionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "VersionError"
  );
}

/**
 * Handle Mongoose duplicate key error
 */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isVersionError(error)) {
    return Errors.versionConflict();
  }

  if (isDuplicateKeyError(error)) {
    return Errors.conflict("ข้อมูลนี้มีอยู่แล้ว");
  }

  if (error instanceof Error) {
    return Errors.internal(error.message);
  }

  return Errors.internal();
}

/**
 * Error handler wrapper for API routes
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  const appError = toAppError(error);

  // Log server errors
  if (appError.statusCode >= 500) {
    console.error("[API Error]", {
      code: appError.code,
      message: appError.message,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return appError.toResponse();
}
