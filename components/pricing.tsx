"use client";

import { useCallback, useMemo, useState } from "react";
import Script from "next/script";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Plan = "starter" | "agency";

const PLAN_COPY: Record<
  Plan,
  {
    title: string;
    price: string;
    description: string;
    bullets: string[];
  }
> = {
  starter: {
    title: "Starter",
    price: "$29/mo",
    description: "One Shopify store with automated AI cart-recovery flows.",
    bullets: [
      "1 connected Shopify store",
      "AI-generated subject + body variants",
      "Automatic A/B split and conversion tracking",
      "Recovery dashboard + webhook processing",
    ],
  },
  agency: {
    title: "Agency",
    price: "$99/mo",
    description: "Manage up to five stores with one account and shared analytics.",
    bullets: [
      "Up to 5 connected stores",
      "Cross-store performance leaderboard",
      "Priority webhook retries and support",
      "Everything in Starter",
    ],
  },
};

type PricingProps = {
  className?: string;
  heading?: string;
  subheading?: string;
};

export function Pricing({ className, heading, subheading }: PricingProps): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState<string>("");

  const lemonsqueezyProductId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  const verifyAccess = useCallback(async () => {
    const response = await fetch("/api/paywall/status", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { active?: boolean };
    if (payload.active) {
      window.location.assign("/dashboard");
    }
  }, []);

  const initLemon = useCallback(() => {
    if (!window.LemonSqueezy) {
      return;
    }

    window.createLemonSqueezy?.();
    window.LemonSqueezy.Setup({
      eventHandler: (event) => {
        if (event.event === "Checkout.Success") {
          verifyAccess().catch(() => undefined);
        }
      },
    });
  }, [verifyAccess]);

  const openCheckout = useCallback(
    (checkoutUrl: string) => {
      initLemon();

      if (window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(checkoutUrl);
        return;
      }

      window.location.assign(checkoutUrl);
    },
    [initLemon],
  );

  const startCheckout = useCallback(
    async (plan: Plan) => {
      setMessage("");

      if (!email || !email.includes("@")) {
        setMessage("Enter a valid work email so we can tie your purchase to dashboard access.");
        return;
      }

      if (!lemonsqueezyProductId) {
        setMessage("Set NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID before launching checkout.");
        return;
      }

      setLoadingPlan(plan);

      try {
        const response = await fetch("/api/lemonsqueezy/checkout-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            plan,
          }),
        });

        const payload = (await response.json()) as {
          checkoutUrl?: string;
          error?: string;
        };

        if (!response.ok || !payload.checkoutUrl) {
          setMessage(payload.error ?? "Unable to create checkout session.");
          return;
        }

        openCheckout(payload.checkoutUrl);
        setMessage("Checkout opened. After payment, access unlocks automatically.");
      } catch {
        setMessage("Could not start Lemon Squeezy checkout. Please retry.");
      } finally {
        setLoadingPlan(null);
      }
    },
    [email, lemonsqueezyProductId, openCheckout],
  );

  const renderedPlans = useMemo(
    () =>
      (Object.keys(PLAN_COPY) as Plan[]).map((plan) => {
        const copy = PLAN_COPY[plan];

        return (
          <Card key={plan} className="relative overflow-hidden">
            {plan === "starter" ? (
              <div className="absolute right-3 top-3">
                <Badge>Most Popular</Badge>
              </div>
            ) : null}
            <CardHeader>
              <CardTitle className="text-2xl">{copy.title}</CardTitle>
              <CardDescription>{copy.description}</CardDescription>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-[#f0f6fc]">{copy.price}</span>
                <span className="mb-1 text-sm text-[#8b949e]">cancel anytime</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-[#d0d7de]">
                {copy.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={() => startCheckout(plan)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening checkout
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Start {copy.title}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      }),
    [loadingPlan, startCheckout],
  );

  return (
    <section className={className} id="pricing">
      <Script
        src="https://assets.lemonsqueezy.com/lemon.js"
        strategy="afterInteractive"
        onLoad={initLemon}
      />

      <div className="mx-auto max-w-5xl">
        <div className="mb-8 space-y-4 text-center">
          <Badge variant="muted" className="mx-auto">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Paid plans include full recovery automation
          </Badge>
          <h2 className="text-3xl font-bold md:text-4xl">
            {heading ?? "Pricing that pays for itself in recovered revenue"}
          </h2>
          <p className="mx-auto max-w-2xl text-[#8b949e]">
            {subheading ??
              "Typical Shopify abandoned-cart templates convert around 10%. Stores using AI-personalized copy see 28-32%, and that lift usually covers the subscription in days."}
          </p>
        </div>

        <Card className="mb-8 border-[#2ea043]/35 bg-[#0f141d]">
          <CardContent className="pt-6">
            <label htmlFor="checkout-email" className="mb-2 block text-sm font-medium text-[#d0d7de]">
              Work email for billing and dashboard access
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="checkout-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@yourstore.com"
                className="h-11 w-full rounded-lg border border-[#30363d] bg-[#151b23] px-3 text-sm text-[#f0f6fc] outline-none transition focus:border-[#3fb950]"
              />
              <Button variant="outline" className="h-11 min-w-44" onClick={() => verifyAccess()}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Refresh Access
              </Button>
            </div>
            {message ? <p className="mt-3 text-sm text-[#8b949e]">{message}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">{renderedPlans}</div>
      </div>
    </section>
  );
}
