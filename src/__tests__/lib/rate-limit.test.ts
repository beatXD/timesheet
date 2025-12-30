import {
  checkRateLimit,
  rateLimitConfigs,
  getClientIdentifier,
} from "@/lib/rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow requests under the limit", () => {
      const config = { windowMs: 60000, maxRequests: 5 };
      const identifier = "test-ip-1";

      const result1 = checkRateLimit(identifier, config);
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit(identifier, config);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(3);
    });

    it("should block requests over the limit", () => {
      const config = { windowMs: 60000, maxRequests: 3 };
      const identifier = "test-ip-2";

      // Use up all requests
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      // This should be blocked
      const result = checkRateLimit(identifier, config);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("should reset after window expires", () => {
      const config = { windowMs: 60000, maxRequests: 2 };
      const identifier = "test-ip-3";

      // Use up all requests
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      // Advance time past the window
      jest.advanceTimersByTime(61000);

      // Should be allowed again
      const result = checkRateLimit(identifier, config);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(1);
    });

    it("should track different identifiers separately", () => {
      const config = { windowMs: 60000, maxRequests: 2 };

      const result1 = checkRateLimit("ip-a", config);
      const result2 = checkRateLimit("ip-b", config);

      expect(result1.remaining).toBe(1);
      expect(result2.remaining).toBe(1);
    });
  });

  describe("rateLimitConfigs", () => {
    it("should have correct auth config", () => {
      expect(rateLimitConfigs.auth.maxRequests).toBe(5);
      expect(rateLimitConfigs.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it("should have correct api config", () => {
      expect(rateLimitConfigs.api.maxRequests).toBe(100);
      expect(rateLimitConfigs.api.windowMs).toBe(60 * 1000);
    });
  });

  describe("getClientIdentifier", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new Request("http://localhost/api", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("192.168.1.1");
    });

    it("should use x-real-ip as fallback", () => {
      const request = new Request("http://localhost/api", {
        headers: {
          "x-real-ip": "192.168.1.2",
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("192.168.1.2");
    });

    it("should return unknown when no headers present", () => {
      const request = new Request("http://localhost/api");

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe("unknown");
    });
  });
});
