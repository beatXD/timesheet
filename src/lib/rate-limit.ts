/**
 * Simple in-memory rate limiting for API routes
 * For production with multiple instances, use Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// In-memory store - for single instance deployments
// For multi-instance, replace with Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with limited status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number } {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    limited: false,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Preset configurations for common use cases
export const rateLimitConfigs = {
  // Strict limit for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
  },

  // Standard API limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },

  // Relaxed limit for read operations
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute
  },

  // Strict limit for expensive operations
  expensive: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
};

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header for proxied requests, falls back to a default
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback - in production behind a proxy, this shouldn't happen
  return "unknown";
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
  };
}
