"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
const checkoutUrl = productId
  ? `https://checkout.lemonsqueezy.com/buy/${productId}?embed=1&media=0&logo=0&desc=0`
  : "#";

export default function OnboardingPage() {
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [storeDomain, setStoreDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLocked(params.get("locked") === "1");
  }, []);

  async function unlockAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlockLoading(true);
    setUnlockMessage(null);

    try {
      const response = await fetch("/api/paywall/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId, email })
      });

      const json = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !json.ok) {
        setUnlockMessage(json.error || "Failed to verify purchase");
        return;
      }

      setUnlockMessage("Purchase verified. Access granted. Connect your Shopify store below.");
    } catch {
      setUnlockMessage("Network error while verifying purchase.");
    } finally {
      setUnlockLoading(false);
    }
  }

  async function connectStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConnectLoading(true);
    setConnectMessage(null);

    try {
      const response = await fetch("/api/shopify/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ storeDomain, accessToken, senderEmail })
      });

      const json = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !json.ok) {
        setConnectMessage(json.error || "Store connection failed");
        return;
      }

      setConnectMessage("Store connected. Opening dashboard...");
      window.location.href = "/dashboard";
    } catch {
      setConnectMessage("Network error while connecting store.");
    } finally {
      setConnectLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-8 md:px-8">
      <header className="mb-6 rounded-2xl border border-slate-800 bg-[#111827cc] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Onboarding</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Activate Shopify Abandon Bot</h1>
          </div>
          <Link className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-slate-500" href="/">
            Back to Landing
          </Link>
        </div>
        {locked ? (
          <p className="mt-4 rounded-lg border border-amber-700 bg-amber-900/30 px-4 py-3 text-sm text-amber-200">
            Dashboard access is locked. Verify your purchase to continue.
          </p>
        ) : null}
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-[#111827cc] p-6">
          <h2 className="text-lg font-semibold text-white">1) Complete Checkout</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Use Lemon Squeezy checkout to start your subscription. After payment, copy your order ID and verify access below.
          </p>
          <a className="lemonsqueezy-button lemon-cta mt-5" href={checkoutUrl}>
            Open Lemon Squeezy Checkout
          </a>
          <p className="mt-4 text-xs text-slate-400">Order ID is visible on your receipt page and confirmation email.</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#111827cc] p-6">
          <h2 className="text-lg font-semibold text-white">2) Verify Purchase & Unlock</h2>
          <form className="mt-4 space-y-3" onSubmit={unlockAccess}>
            <input
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
              placeholder="Lemon Squeezy order ID"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
            />
            <input
              required
              type="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
              placeholder="Purchase email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button
              type="submit"
              disabled={unlockLoading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-50 disabled:opacity-70"
            >
              {unlockLoading ? "Verifying..." : "Verify and Unlock"}
            </button>
          </form>
          {unlockMessage ? <p className="mt-3 text-sm text-slate-300">{unlockMessage}</p> : null}
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-800 bg-[#111827cc] p-6">
        <h2 className="text-lg font-semibold text-white">3) Connect Shopify Store</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Generate a Shopify Admin API token with <code className="rounded bg-slate-900 px-1 py-0.5">read_checkouts</code> scope,
          then connect your store.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={connectStore}>
          <input
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            placeholder="store-name.myshopify.com"
            value={storeDomain}
            onChange={(event) => setStoreDomain(event.target.value)}
          />
          <input
            required
            type="email"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            placeholder="sender@yourstore.com"
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
          />
          <input
            required
            className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
          />
          <button
            type="submit"
            disabled={connectLoading}
            className="md:col-span-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-50 disabled:opacity-70"
          >
            {connectLoading ? "Connecting..." : "Connect Store"}
          </button>
        </form>
        {connectMessage ? <p className="mt-3 text-sm text-slate-300">{connectMessage}</p> : null}
      </section>
    </main>
  );
}
