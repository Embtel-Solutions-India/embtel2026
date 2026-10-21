import type { Metadata } from "next";
import { connection } from "next/server";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
// Headings only: not preloaded, so it never competes with the body text that is usually the LCP element.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["600", "700", "800"], preload: false });

// Defaults only; public pages set full metadata (incl. robots) via buildPageMetadata.
export const metadata: Metadata = {
  title: "Embtel Solutions",
};

// Nonce CSP (src/proxy.ts) needs every page rendered per request: a prerendered shell carries no
// nonce and its scripts would be blocked. Hence connection() here and instant = false to allow it.
export const instant = false;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
