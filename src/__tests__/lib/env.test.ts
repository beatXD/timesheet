import { validateEnv, isProduction, isDevelopment } from "@/lib/env";

describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("should pass with valid environment variables", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      process.env.AUTH_SECRET = "a".repeat(32);
      process.env.NODE_ENV = "test";

      expect(() => validateEnv()).not.toThrow();
    });

    it("should throw with missing MONGODB_URI", () => {
      process.env.MONGODB_URI = "";
      process.env.AUTH_SECRET = "a".repeat(32);

      expect(() => validateEnv()).toThrow();
    });

    it("should throw with invalid MONGODB_URI format", () => {
      process.env.MONGODB_URI = "invalid-uri";
      process.env.AUTH_SECRET = "a".repeat(32);

      expect(() => validateEnv()).toThrow();
    });

    it("should throw with short AUTH_SECRET", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      process.env.AUTH_SECRET = "short";

      expect(() => validateEnv()).toThrow();
    });

    it("should accept mongodb+srv:// URI", () => {
      process.env.MONGODB_URI = "mongodb+srv://user:pass@cluster.mongodb.net/db";
      process.env.AUTH_SECRET = "a".repeat(32);

      expect(() => validateEnv()).not.toThrow();
    });
  });

  describe("isProduction", () => {
    it("should return true in production", () => {
      process.env.NODE_ENV = "production";
      expect(isProduction()).toBe(true);
    });

    it("should return false in development", () => {
      process.env.NODE_ENV = "development";
      expect(isProduction()).toBe(false);
    });
  });

  describe("isDevelopment", () => {
    it("should return true in development", () => {
      process.env.NODE_ENV = "development";
      expect(isDevelopment()).toBe(true);
    });

    it("should return false in production", () => {
      process.env.NODE_ENV = "production";
      expect(isDevelopment()).toBe(false);
    });
  });
});
