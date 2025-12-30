"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Web Vitals reporting component
 * Reports Core Web Vitals metrics to analytics
 */
export function WebVitals() {
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("web-vitals").then(({ onCLS, onFID, onLCP, onFCP, onTTFB, onINP }) => {
      const reportMetric = (metric: {
        name: string;
        value: number;
        id: string;
        rating: string;
      }) => {
        // Log to console in development
        if (process.env.NODE_ENV === "development") {
          console.log(`[Web Vitals] ${metric.name}:`, {
            value: metric.value,
            rating: metric.rating,
          });
        }

        // Send to analytics endpoint in production
        if (process.env.NODE_ENV === "production") {
          // Option 1: Send to Vercel Analytics (automatic with @vercel/analytics)
          // Option 2: Send to custom endpoint
          fetch("/api/analytics/vitals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: metric.name,
              value: metric.value,
              id: metric.id,
              rating: metric.rating,
              page: window.location.pathname,
            }),
          }).catch(() => {
            // Silently fail - analytics shouldn't break the app
          });
        }
      };

      // Core Web Vitals
      onCLS(reportMetric);
      onFID(reportMetric);
      onLCP(reportMetric);
      onFCP(reportMetric);
      onTTFB(reportMetric);
      onINP(reportMetric);
    });
  }, []);

  return null;
}

/**
 * Page view tracking component
 * Tracks navigation for analytics
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");

    // Log page view
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Page view: ${url}`);
    }

    // Track page view in production
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
      // Send to analytics
      fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Combined analytics provider
 */
export function Analytics() {
  return (
    <>
      <WebVitals />
      <PageViewTracker />
    </>
  );
}
