import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CampaignStats } from "@/components/CampaignStats";
import { EmailPreview } from "@/components/EmailPreview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCampaigns, getDashboardMetrics } from "@/lib/database";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export const metadata = {
  title: "Dashboard | Shopify Abandon Bot",
  description: "Track A/B test performance and revenue recovered from abandoned-cart AI campaigns."
};

function fmtMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const access = verifyAccessToken(accessToken);

  if (!access) {
    redirect("/pricing?locked=1");
  }

  const campaigns = getCampaigns({ limit: 20 });
  const stats = getDashboardMetrics();
  const latest = campaigns[0] ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-20 pt-10 sm:px-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-3xl font-bold">Campaign Dashboard</h1>
          <p className="text-sm text-zinc-300">
            Signed in as <span className="font-medium text-zinc-100">{access.email}</span>
          </p>
        </div>
        <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Paywall Unlocked</Badge>
      </header>

      <CampaignStats stats={stats} />

      {latest ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <EmailPreview variant="A" subject={latest.variantA.subject} body={latest.variantA.body} />
          <EmailPreview variant="B" subject={latest.variantB.subject} body={latest.variantB.body} />
        </section>
      ) : (
        <Card className="border-zinc-700">
          <CardContent className="pt-6 text-zinc-300">
            No campaigns generated yet. Send a test event to <code className="rounded bg-zinc-800 px-1">/api/shopify/webhook</code> or create one through <code className="rounded bg-zinc-800 px-1">POST /api/campaigns</code>.
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-700">
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Store</th>
                <th className="pb-3">Cart Value</th>
                <th className="pb-3">Variant</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Converted</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="py-3">{campaign.customerEmail}</td>
                  <td className="py-3">{campaign.storeDomain}</td>
                  <td className="py-3">{fmtMoney(campaign.cartValue, campaign.currency || "USD")}</td>
                  <td className="py-3">{campaign.sentVariant}</td>
                  <td className="py-3">{campaign.status}</td>
                  <td className="py-3">{campaign.metrics.converted ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
