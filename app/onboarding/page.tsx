import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import Script from "next/script";

import { UnlockAccessForm } from "@/components/onboarding/unlock-access-form";
import { ShopifyConnect } from "@/components/onboarding/shopify-connect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Onboarding | Shopify Abandon Bot",
  description:
    "Activate your subscription, connect Shopify, and launch AI-personalized abandoned cart recovery flows.",
};

function checkoutUrl(plan: "starter" | "scale") {
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!storeId || !productId) {
    return null;
  }

  const url = new URL(`https://checkout.lemonsqueezy.com/buy/${productId}`);
  url.searchParams.set("embed", "1");
  url.searchParams.set("checkout[custom][store_id]", storeId);
  url.searchParams.set("checkout[custom][plan]", plan);
  url.searchParams.set("checkout[custom][source]", "onboarding");

  return url.toString();
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  const isPaid = cookieStore.get("abandon_bot_paid")?.value === "true";
  const connectedShopFromCookie = cookieStore.get("shopify_shop")?.value;
  const connectedShopFromQuery =
    typeof params.shop === "string" ? params.shop : undefined;

  const connectedShop = connectedShopFromQuery ?? connectedShopFromCookie;

  return (
    <>
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="afterInteractive"
      />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <Badge variant="secondary">Onboarding</Badge>
          <h1 className="font-heading text-4xl font-semibold text-zinc-100">
            Activate Your Store in Three Steps
          </h1>
          <p className="max-w-2xl text-zinc-300">
            Pay once, unlock access with your billing email, then connect Shopify
            so abandonment webhooks can trigger personalized A/B email campaigns.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-zinc-700 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-zinc-100">Step 1: Subscribe</CardTitle>
              <CardDescription className="text-zinc-400">
                Choose your plan through Lemon Squeezy checkout overlay.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                {checkoutUrl("starter") ? (
                  <a
                    href={checkoutUrl("starter") ?? "#"}
                    className="lemonsqueezy-button w-full"
                  >
                    <Button className="w-full">Starter $29/mo</Button>
                  </a>
                ) : (
                  <Button className="w-full" disabled>
                    Set Lemon Squeezy public env vars
                  </Button>
                )}
                {checkoutUrl("scale") ? (
                  <a
                    href={checkoutUrl("scale") ?? "#"}
                    className="lemonsqueezy-button w-full"
                  >
                    <Button variant="secondary" className="w-full">
                      Scale $99/mo
                    </Button>
                  </a>
                ) : null}
              </div>
              <p className="text-sm text-zinc-400">
                After successful payment, Lemon Squeezy sends a webhook to this app.
                Use your billing email below to unlock dashboard access.
              </p>
            </CardContent>
          </Card>

          <UnlockAccessForm />
        </div>

        {isPaid ? (
          <Card className="border border-emerald-500/40 bg-zinc-900/75">
            <CardHeader>
              <CardTitle className="text-zinc-100">Paid access confirmed</CardTitle>
              <CardDescription className="text-zinc-300">
                Your access cookie is active. You can open the dashboard now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button>Open Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <ShopifyConnect connectedShop={connectedShop} />

        {params.shopify === "connected" ? (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Shopify connection successful for {connectedShop}. Abandonment events
            can now trigger AI email generation.
          </p>
        ) : null}
      </main>
    </>
  );
}
