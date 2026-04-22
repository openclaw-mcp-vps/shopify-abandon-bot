import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Shopify Abandon Bot | AI-Personalized Recovery Emails",
  description:
    "Recover abandoned checkouts with AI-written, behavior-aware emails. Shopify stores use this to lift abandoned cart conversion from ~10% to 28-32%.",
  openGraph: {
    title: "Shopify Abandon Bot",
    description:
      "AI-powered abandon-cart emails for Shopify that convert 3x better than default flows.",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "Shopify Abandon Bot",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopify Abandon Bot",
    description:
      "AI-personalized abandoned cart email recovery with built-in A/B testing and conversion analytics."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-[#0d1117] font-[var(--font-body)] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
