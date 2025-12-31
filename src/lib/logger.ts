/**
 * Structured logging utility using Winston
 */

import winston from "winston";

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const emoji: Record<string, string> = {
    error: "❌",
    warn: "⚠️",
    info: "ℹ️",
    debug: "🔍",
  };
  const icon = emoji[level] || "📝";
  const metaStr = Object.keys(meta).length ? `\n  Context: ${JSON.stringify(meta, null, 2)}` : "";
  return `${icon} [${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
});

// Create Winston logger
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  defaultMeta: { service: "timesheet-api" },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production"
        ? combine(timestamp(), json())
        : combine(timestamp({ format: "HH:mm:ss" }), colorize(), devFormat),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === "production") {
  winstonLogger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp(), json()),
    })
  );
  winstonLogger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp(), json()),
    })
  );
}

// Logger wrapper with utility methods
class Logger {
  debug(message: string, context?: Record<string, unknown>): void {
    winstonLogger.debug(message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    winstonLogger.info(message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    winstonLogger.warn(message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    winstonLogger.error(message, {
      ...context,
      error: error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : undefined,
    });
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    winstonLogger.error(`[FATAL] ${message}`, {
      ...context,
      error: error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : undefined,
    });
  }

  // Utility for request logging
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    winstonLogger.info("HTTP Request", {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId,
    });
  }

  // Utility for database operations
  db(operation: string, collection: string, duration: number): void {
    winstonLogger.debug("Database Operation", {
      operation,
      collection,
      duration: `${duration}ms`,
    });
  }

  // Utility for authentication events
  auth(event: string, userId?: string, context?: Record<string, unknown>): void {
    winstonLogger.info(`Auth: ${event}`, {
      userId,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export winston logger for advanced usage
export { winstonLogger };

// Export for API route error handling
export function logApiError(
  error: unknown,
  context: { path: string; method: string; userId?: string }
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`API Error: ${context.path}`, err, context);
}
