import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Shopify Abandon Bot | AI Cart Recovery Emails",
    template: "%s | Shopify Abandon Bot",
  },
  description:
    "Recover abandoned Shopify checkouts with AI-personalized cart emails and automatic A/B testing. Lift conversion from ~10% to 28-32%.",
  keywords: [
    "shopify abandoned cart",
    "ai cart recovery",
    "ecommerce email automation",
    "abandoned checkout emails",
  ],
  openGraph: {
    title: "Shopify Abandon Bot",
    description:
      "AI-personalized abandoned-cart emails with automatic A/B testing for Shopify stores.",
    url: "/",
    siteName: "Shopify Abandon Bot",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Shopify Abandon Bot dashboard with email conversion metrics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopify Abandon Bot",
    description:
      "Recover abandoned carts with AI-written emails and automated A/B testing.",
    images: ["/og-image.svg"],
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
}>): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} min-h-screen bg-[#0d1117] text-[#f0f6fc] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
