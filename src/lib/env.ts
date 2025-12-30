import { z } from "zod";

/**
 * Environment variable schema for runtime validation
 * This ensures all required environment variables are set and valid
 */
const envSchema = z.object({
  // Database
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (val) => val.startsWith("mongodb://") || val.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a valid MongoDB connection string"
    ),

  // Authentication
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters for security"),

  // OAuth (optional in development)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  // App URL
  NEXTAUTH_URL: z.string().url().optional(),

  // External APIs (optional)
  CALENDARIFIC_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at runtime
 * Call this at application startup to fail fast if configuration is invalid
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

/**
 * Get validated environment variables
 * Use this instead of process.env directly for type safety
 */
export function getEnv(): Env {
  return envSchema.parse(process.env);
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if we're in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}
