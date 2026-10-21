import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Embtel Solutions",
  description: "Embtel Solutions",
  robots: "noindex",
};

// Nonce CSP (src/proxy.ts) needs every page rendered per request: a prerendered shell carries no
// nonce and its scripts would be blocked. Hence connection() here and instant = false to allow it.
export const instant = false;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
