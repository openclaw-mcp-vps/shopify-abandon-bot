import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CampaignAnalytics } from "@/components/campaign-analytics";
import { EmailPreview } from "@/components/email-preview";
import { listCampaigns, listStores, summarizeCampaigns } from "@/lib/database";
import { parseAccessToken, PAYWALL_COOKIE_NAME } from "@/lib/paywall";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const access = parseAccessToken(cookieStore.get(PAYWALL_COOKIE_NAME)?.value);

  if (!access) {
    redirect("/onboarding?locked=1");
  }

  const [campaigns, stores] = await Promise.all([listCampaigns(), listStores()]);
  const summary = summarizeCampaigns(campaigns);
  const recentCampaigns = campaigns.slice(0, 8);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 md:px-8">
      <header className="mb-6 rounded-2xl border border-slate-800 bg-[#111827cc] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Shopify Abandon Bot</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Revenue Recovery Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-slate-500" href="/onboarding">
              Add Store
            </Link>
            <Link className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-slate-500" href="/">
              Marketing Site
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <p className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3">Plan: {access.plan === "growth" ? "Growth" : "Starter"}</p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3">
            Stores connected: {stores.length} / {access.storeLimit}
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3">Access email: {access.email}</p>
        </div>
      </header>

      <CampaignAnalytics campaigns={campaigns} summary={summary} />

      <section className="mt-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Latest Email Variants</h2>
        {recentCampaigns.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#111827cc] p-6 text-sm text-slate-300">
            No campaigns yet. Once Shopify sends an abandoned checkout webhook, personalized variants and analytics will appear here.
          </div>
        ) : (
          <div className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <EmailPreview key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-[#111827cc] p-6">
        <h2 className="text-lg font-semibold text-white">Webhook Setup</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          In Shopify Admin, create a webhook for <code className="rounded bg-slate-900 px-1 py-0.5">checkouts/update</code> and
          point it to <code className="rounded bg-slate-900 px-1 py-0.5">/api/shopify/webhook</code>. Include browsing signals in
          <code className="rounded bg-slate-900 px-1 py-0.5">note_attributes.browsing_signals</code> as JSON for stronger personalization.
        </p>
      </section>
    </main>
  );
}
