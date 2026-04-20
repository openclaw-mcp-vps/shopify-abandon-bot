import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://shopify-abandon-bot.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Shopify Abandon Bot",
    template: "%s | Shopify Abandon Bot",
  },
  description:
    "AI-personalized Shopify abandon-cart emails with automated A/B testing and a conversion-focused recovery dashboard.",
  openGraph: {
    title: "Shopify Abandon Bot",
    description:
      "Recover more abandoned carts with AI-personalized email copy and automated A/B optimization.",
    url: appUrl,
    siteName: "Shopify Abandon Bot",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopify Abandon Bot",
    description:
      "Connect Shopify, generate personalized recoveries, and track conversion lift in one dashboard.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
