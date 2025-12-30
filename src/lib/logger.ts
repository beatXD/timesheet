/**
 * Structured logging utility for production
 * Uses pino for high-performance JSON logging
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

class Logger {
  private minLevel: LogLevel;
  private serviceName: string;

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) ||
      (process.env.NODE_ENV === "production" ? "info" : "debug");
    this.serviceName = "timesheet-api";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = {
        service: this.serviceName,
        ...context,
      };
    }

    if (error) {
      entry.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    return entry;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, message, context, error);

    // In production, output JSON for log aggregation
    if (process.env.NODE_ENV === "production") {
      const output = JSON.stringify(entry);
      switch (level) {
        case "error":
        case "fatal":
          console.error(output);
          break;
        case "warn":
          console.warn(output);
          break;
        default:
          console.log(output);
      }
    } else {
      // In development, use readable format
      const emoji = {
        debug: "🔍",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
        fatal: "💀",
      }[level];

      console.log(`${emoji} [${level.toUpperCase()}] ${message}`);
      if (context) console.log("  Context:", context);
      if (error) console.log("  Error:", error);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log("error", message, context, error);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log("fatal", message, context, error);
  }

  // Utility for request logging
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    this.info("HTTP Request", {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId,
    });
  }

  // Utility for database operations
  db(operation: string, collection: string, duration: number): void {
    this.debug("Database Operation", {
      operation,
      collection,
      duration: `${duration}ms`,
    });
  }

  // Utility for authentication events
  auth(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth: ${event}`, {
      userId,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for API route error handling
export function logApiError(
  error: unknown,
  context: { path: string; method: string; userId?: string }
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`API Error: ${context.path}`, err, context);
}
