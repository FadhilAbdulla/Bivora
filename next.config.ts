import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// What pages may load. Next.js injects inline scripts, so scripts need 'unsafe-inline'; everything
// else is limited to this site, TradingView's widgets and the private R2 bucket for ID documents.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://s3.tradingview.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // ID documents are shown through short-lived signed links on the private R2 bucket.
  "img-src 'self' data: blob: https://*.tradingview.com https://*.r2.cloudflarestorage.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.r2.cloudflarestorage.com https://*.tradingview.com${dev ? " ws: wss:" : ""}`,
  "frame-src https://*.tradingview.com https://*.tradingview-widget.com https://*.r2.cloudflarestorage.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The camera is used to photograph ID documents during onboarding.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
