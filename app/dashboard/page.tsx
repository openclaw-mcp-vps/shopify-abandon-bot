import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { EmailTemplates } from "@/components/dashboard/email-templates";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getRecentGeneratedTemplates } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Dashboard | Shopify Abandon Bot",
  description:
    "Review AI abandon-cart performance, A/B winner data, and recovered revenue in one dashboard.",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const hasPaidAccess = cookieStore.get("abandon_bot_paid")?.value === "true";
  const shopDomain = cookieStore.get("shopify_shop")?.value;

  if (!hasPaidAccess) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-12 sm:px-6 lg:px-8">
        <Badge variant="secondary" className="w-fit">
          Dashboard Locked
        </Badge>
        <h1 className="font-heading text-4xl font-semibold text-zinc-100">
          Paid Access Required
        </h1>
        <p className="text-zinc-300">
          The AI generation console and performance analytics are available after
          purchase. Complete checkout, unlock via billing email, then return.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/onboarding">
            <Button>Go to Onboarding</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">View Pricing</Button>
          </Link>
        </div>
      </main>
    );
  }

  const stats = await getDashboardStats(shopDomain);
  const recent = await getRecentGeneratedTemplates(shopDomain, 8);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge className="mb-3" variant="secondary">
            Revenue Recovery Dashboard
          </Badge>
          <h1 className="font-heading text-4xl font-semibold text-zinc-100">
            Shopify Abandon Bot
          </h1>
          <p className="mt-2 text-zinc-300">
            Track conversion lift and generate personalized abandon-cart copy in
            one workflow.
          </p>
        </div>
        <div className="text-sm text-zinc-400">
          <p>Connected shop:</p>
          <p className="text-zinc-200">{shopDomain ?? "Not connected"}</p>
        </div>
      </div>

      <StatsOverview stats={stats} />

      {!shopDomain ? (
        <Card className="border border-amber-500/40 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-100">Shopify not connected yet</CardTitle>
            <CardDescription className="text-amber-200">
              You can still test AI output below, but live webhooks and automated
              sending start after Shopify OAuth is completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button variant="secondary">Connect Shopify</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-zinc-100">
          AI Template Lab
        </h2>
        <EmailTemplates
          recentTemplates={recent.map((item) => ({
            id: item.id,
            subject: item.subject,
            variant: item.variant,
            sentAt: item.sentAt,
            customerEmail: item.customerEmail,
          }))}
        />
      </section>
    </main>
  );
}
