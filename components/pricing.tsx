"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check, CreditCard, LoaderCircle, Lock, Sparkles } from "lucide-react";

type ClaimFormValues = {
  email: string;
};

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

const plans = [
  {
    name: "Starter",
    price: "$29/mo",
    description: "For one Shopify store with auto-send A/B emails and recovery analytics.",
    bullets: [
      "1 connected Shopify store",
      "AI subject/body generation from cart + browsing signals",
      "Automatic A/B split and send orchestration",
      "Live recovery funnel dashboard"
    ]
  },
  {
    name: "Growth",
    price: "$99/mo",
    description: "For agency operators and multi-brand owners.",
    bullets: [
      "Up to 5 connected stores",
      "Cross-store performance benchmarking",
      "Priority webhook support",
      "Team-friendly KPI exports"
    ]
  }
] as const;

function buildCheckoutUrl(rawProductId: string | undefined) {
  if (!rawProductId) {
    return null;
  }

  if (rawProductId.startsWith("http://") || rawProductId.startsWith("https://")) {
    return rawProductId;
  }

  return `https://checkout.lemonsqueezy.com/buy/${rawProductId}`;
}

export function Pricing() {
  const router = useRouter();
  const [claimState, setClaimState] = useState<"idle" | "success" | "error">("idle");
  const [claimMessage, setClaimMessage] = useState<string>("");

  const checkoutUrl = useMemo(
    () => buildCheckoutUrl(process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID),
    []
  );

  const { register, handleSubmit, formState } = useForm<ClaimFormValues>({
    defaultValues: {
      email: ""
    }
  });

  useEffect(() => {
    const scriptId = "lemonsqueezy-overlay-script";

    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const openCheckout = () => {
    if (!checkoutUrl) {
      setClaimState("error");
      setClaimMessage(
        "Set NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID with a checkout URL or product checkout ID to open the payment overlay."
      );
      return;
    }

    if (window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(checkoutUrl);
      return;
    }

    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const onClaim = handleSubmit(async (values) => {
    setClaimState("idle");
    setClaimMessage("");

    const response = await fetch("/api/paywall/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: values.email })
    });

    const data = (await response.json()) as { error?: string; help?: string; status?: string };

    if (!response.ok) {
      setClaimState("error");
      setClaimMessage(data.help ?? data.error ?? "Unable to unlock access with that billing email.");
      return;
    }

    setClaimState("success");
    setClaimMessage("Access unlocked. Redirecting to your recovery dashboard...");
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <section id="pricing" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#8ea2c8]">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Capture lost revenue before it leaks every day</h2>
        </div>
        <button
          type="button"
          onClick={openCheckout}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2b3e59] bg-[#0f1f34] px-4 py-2 text-sm font-semibold text-[#d9ecff] transition hover:border-[#3f5d84] hover:bg-[#143158]"
        >
          <CreditCard size={16} />
          Start checkout
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <span className="rounded-full bg-[#102a47] px-3 py-1 text-xs font-semibold text-[#8ad1ff]">
                {plan.price}
              </span>
            </div>
            <p className="mt-3 text-sm text-[#aab8d1]">{plan.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-[#d4deee]">
              {plan.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 text-[#61ffca]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={openCheckout}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#29b6f6] to-[#61ffca] px-4 py-2.5 text-sm font-semibold text-[#04121d] transition hover:opacity-90"
            >
              <Sparkles size={16} />
              Subscribe with Lemon Squeezy
            </button>
          </article>
        ))}
      </div>

      <div className="panel p-5">
        <div className="flex items-center gap-2 text-white">
          <Lock size={16} className="text-[#61ffca]" />
          <h3 className="font-semibold">Unlock your paid dashboard access</h3>
        </div>
        <p className="mt-2 text-sm text-[#9eb1d0]">
          After checkout, enter the same billing email. We validate the active Lemon Squeezy license and set your
          secure access cookie.
        </p>

        <form onSubmit={onClaim} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="billing@store.com"
            autoComplete="email"
            className="h-11 flex-1 rounded-xl border border-[#2d3e54] bg-[#0b1523] px-3 text-sm text-white placeholder:text-[#6f809b] focus:outline-none focus:ring-2 focus:ring-[#2a88c7]"
            {...register("email", { required: true })}
          />
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163a31] px-5 text-sm font-semibold text-[#9ff6d7] transition hover:bg-[#1d4d40] disabled:cursor-not-allowed disabled:opacity-75"
          >
            {formState.isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {formState.isSubmitting ? "Validating" : "Unlock Dashboard"}
          </button>
        </form>

        {claimState !== "idle" ? (
          <p className={`mt-3 text-sm ${claimState === "success" ? "text-[#7ff0c9]" : "text-[#ff9c9c]"}`}>
            {claimMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
