import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Lock, Webhook } from "lucide-react";

import { EmailPreview } from "@/components/dashboard/email-preview";
import { DashboardStats } from "@/components/dashboard/stats";
import { Pricing } from "@/components/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYWALL_COOKIE_NAME } from "@/lib/constants";
import {
  getDashboardStats,
  getPaywallSession,
  hasActivePaywallAccess,
  listRecentAbandonedCarts,
} from "@/lib/database";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Monitor abandoned carts, conversion lift, and AI email variants for Shopify Abandon Bot.",
  robots: {
    index: false,
    follow: false,
  },
};

function LockedState(): React.JSX.Element {
  return (
    <main className="px-4 pb-20 pt-12 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <Card className="border-[#f0883e]/35 bg-[#17110a]">
          <CardHeader>
            <Badge variant="muted" className="w-fit">
              <Lock className="mr-1 h-3.5 w-3.5" />
              Subscription required
            </Badge>
            <CardTitle className="text-2xl">Dashboard access is locked behind an active paid plan</CardTitle>
            <CardDescription>
              Complete Lemon Squeezy checkout from the pricing section. Webhook confirmation activates your cookie-based access automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/#pricing">Open pricing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to landing
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Pricing
          heading="Unlock the full recovery engine"
          subheading="Once payment succeeds, your current browser cookie gets activated and this dashboard opens immediately."
        />
      </div>
    </main>
  );
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;

  const access = await hasActivePaywallAccess(token);

  if (!access) {
    return <LockedState />;
  }

  const [stats, carts, session] = await Promise.all([
    getDashboardStats(),
    listRecentAbandonedCarts(12),
    token ? getPaywallSession(token) : Promise.resolve(null),
  ]);

  const previewCarts = carts.map((cart) => ({
    id: cart.id,
    email: cart.email,
    customerName: cart.customerName,
    currency: cart.currency,
    subtotal: cart.subtotal,
    items: cart.items,
    browsingSignals: cart.browsingSignals,
    status: cart.status,
    assignedVariant: cart.assignedVariant,
    variants: cart.variants,
    abandonedAt: cart.abandonedAt,
  }));

  return (
    <main className="px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#30363d] bg-[#111922] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8b949e]">Shopify Abandon Bot</p>
            <h1 className="mt-1 text-2xl font-bold">Recovery performance dashboard</h1>
            <p className="mt-1 text-sm text-[#8b949e]">
              Active plan: <span className="font-medium text-[#f0f6fc]">{session?.plan ?? "starter"}</span>
              {" · "}Store limit: {session?.storeLimit ?? 1}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#151b23] px-3 py-2 text-xs text-[#8b949e]">
            <Webhook className="h-4 w-4 text-[#3fb950]" />
            Webhook endpoint: /api/shopify/webhook
          </div>
        </div>

        <DashboardStats stats={stats} />
        <EmailPreview carts={previewCarts} />
      </div>
    </main>
  );
}
