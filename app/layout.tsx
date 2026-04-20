import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shopify-abandon-bot.com"),
  title: "Shopify Abandon Bot | AI-Personalized Cart Recovery",
  description:
    "Recover abandoned Shopify checkouts with AI-personalized email variants and built-in A/B testing that lifts conversion to 28-32%.",
  keywords: [
    "Shopify abandoned cart",
    "AI email personalization",
    "cart recovery",
    "ecommerce conversion",
    "Shopify app"
  ],
  openGraph: {
    title: "Shopify Abandon Bot — AI-personalized abandon-cart emails",
    description:
      "Connect Shopify, generate personalized recovery emails from cart and browsing behavior, and optimize with automatic A/B tests.",
    type: "website",
    url: "https://shopify-abandon-bot.com",
    siteName: "Shopify Abandon Bot"
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopify Abandon Bot — AI-personalized abandon-cart emails",
    description: "Convert more abandoned checkouts with AI-written, behavior-aware recovery campaigns."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
