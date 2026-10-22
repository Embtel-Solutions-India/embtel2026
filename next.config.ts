import type { NextConfig } from "next";
import { imageHosts } from "./src/lib/content/image-hosts";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // ~15 KB of CSS: inline it so first-time (mostly ad-driven) visitors skip a render-blocking request.
  experimental: { inlineCss: true },
  images: {
    // Legacy content: client logos (Google favicon service) and the About page office photo.
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Blog/author images: the shared allow-list (Unsplash + the env-configured S3/CDN host).
      ...imageHosts().map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Static headers on every response; the nonce CSP is set per request in src/proxy.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
