import type { NextConfig } from "next";
import { imageHosts } from "./src/lib/content/image-hosts";
import { legacyRedirects } from "./redirects";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // No inlineCss: it also copied the stylesheet into every page's RSC payload (~155 KB of a 436 KB
  // document), which cost far more main-thread time than the one cacheable CSS request it saved.
  experimental: {
    // forbidden() → 403 page for admin screens a role can't open.
    authInterrupts: true,
    // Media uploads go through a server action: 5 MB file limit plus form overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // AVIF first (usually 30–50% smaller than WebP); browsers without it get WebP.
    formats: ["image/avif", "image/webp"],
    // 60: blog card thumbnails (small, many per page); 75: everything else (Next's default).
    qualities: [60, 75],
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
  // Legacy URLs (/about.html, /blog-details?slug=…, /da-ai/*) → 301 to their new address.
  async redirects() {
    return legacyRedirects;
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
