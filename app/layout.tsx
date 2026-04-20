import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"]
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"]
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Shopify Abandon Bot | AI Cart Recovery Emails",
  description:
    "Recover more abandoned carts with AI-personalized Shopify emails, automatic A/B testing, and conversion analytics.",
  keywords: [
    "shopify abandoned cart",
    "ai email personalization",
    "ecommerce conversion",
    "cart recovery",
    "lemonsqueezy saas"
  ],
  openGraph: {
    title: "Shopify Abandon Bot — AI-personalized abandon-cart emails",
    description:
      "Connect Shopify, generate personalized recovery emails from cart + browsing behavior, and lift abandoned-cart conversions to 28-32%.",
    type: "website",
    url: "/",
    siteName: "Shopify Abandon Bot"
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopify Abandon Bot — AI cart recovery",
    description:
      "Default recovery emails convert ~10%. Personalized AI recovery reaches 28-32% for high-volume Shopify stores."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} grid-overlay antialiased`}>
        {children}
      </body>
    </html>
  );
}
