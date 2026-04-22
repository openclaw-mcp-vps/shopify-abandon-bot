import Link from "next/link";

import { OnboardingWizard } from "@/components/OnboardingWizard";

export const metadata = {
  title: "Onboarding | Shopify Abandon Bot",
  description:
    "Connect your Shopify store, verify payment, and launch AI-powered abandoned cart email campaigns in minutes."
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 sm:px-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-[var(--font-heading)] text-lg font-semibold text-white">
          Shopify Abandon Bot
        </Link>
        <Link href="/pricing" className="text-sm text-zinc-300 hover:text-zinc-100">
          Pricing
        </Link>
      </header>

      <section className="space-y-3">
        <h1 className="font-[var(--font-heading)] text-4xl font-bold">Launch in two steps</h1>
        <p className="max-w-3xl text-zinc-300">
          Complete billing first, then connect Shopify and unlock account access. Once both are complete, abandoned cart webhooks will automatically trigger AI email generation and send campaigns.
        </p>
      </section>

      <OnboardingWizard />

      <section className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-6 text-sm text-zinc-300">
        <p className="font-semibold text-zinc-100">Recommended Shopify webhook topics</p>
        <p className="mt-2">
          Configure webhook delivery to <code className="rounded bg-zinc-800 px-1 py-0.5">/api/shopify/webhook</code> for at least <code className="rounded bg-zinc-800 px-1 py-0.5">checkouts/update</code> and <code className="rounded bg-zinc-800 px-1 py-0.5">carts/update</code>.
        </p>
      </section>
    </main>
  );
}
