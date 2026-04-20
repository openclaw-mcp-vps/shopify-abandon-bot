import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { EmailGenerator } from "@/components/dashboard/email-generator";
import { EmailPreviewList } from "@/components/dashboard/email-preview";
import { DashboardMetrics } from "@/components/dashboard/metrics";
import { getDashboardSnapshot } from "@/lib/database";

export const metadata: Metadata = {
  title: "Dashboard | Shopify Abandon Bot",
  description: "Monitor AI abandon-cart email performance, A/B conversion lift, and recovered revenue."
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const connectedShop = cookieStore.get("shopify_connected_shop")?.value;
  const snapshot = getDashboardSnapshot();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#8ea2c8]">Recovery Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Shopify Abandon Bot Performance</h1>
            <p className="mt-2 text-sm text-[#aebcd4]">
              Track conversion lift, monitor A/B variants, and generate personalized copy for new cart segments.
            </p>
          </div>
          <div className="rounded-xl border border-[#2d3f58] bg-[#0b1523] px-3 py-2 text-xs text-[#9fb2cf]">
            Connected shop: {connectedShop ?? "Not set yet"}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="rounded-lg border border-[#2d415f] bg-[#101e32] px-3 py-2 text-[#cbe2ff] transition hover:bg-[#162b47]"
          >
            Back to landing
          </Link>
          <a
            href="/api/health"
            className="rounded-lg border border-[#314666] bg-[#0f1c2e] px-3 py-2 text-[#9ec7e9] transition hover:bg-[#152a46]"
          >
            API health
          </a>
        </div>
      </header>

      <DashboardMetrics
        summary={snapshot.summary}
        series={snapshot.series}
        variants={snapshot.variants}
      />

      <EmailGenerator />

      <EmailPreviewList previews={snapshot.previews} />
    </main>
  );
}
