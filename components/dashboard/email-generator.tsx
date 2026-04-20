"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { LoaderCircle, WandSparkles } from "lucide-react";

type GenerateFormValues = {
  shopDomain: string;
  customerName: string;
  customerEmail: string;
  discountCode: string;
  cartItemsJson: string;
  browseJson: string;
};

type GeneratedResponse = {
  cartId: number;
  variants: {
    A: {
      id: number;
      subject: string;
      body: string;
    };
    B: {
      id: number;
      subject: string;
      body: string;
    };
  };
};

const defaultCart = JSON.stringify(
  [
    {
      title: "Performance Running Shoes",
      quantity: 1,
      unitPrice: 129,
      variant: "Slate / 10"
    },
    {
      title: "Moisture-Wick Socks (3 Pack)",
      quantity: 1,
      unitPrice: 24
    }
  ],
  null,
  2
);

const defaultBrowse = JSON.stringify(
  [
    {
      path: "/collections/running",
      title: "Men's Running Collection",
      category: "running",
      secondsOnPage: 132
    },
    {
      path: "/products/performance-running-shoes",
      title: "Performance Running Shoes",
      category: "footwear",
      secondsOnPage: 95
    }
  ],
  null,
  2
);

export function EmailGenerator() {
  const [result, setResult] = useState<GeneratedResponse | null>(null);
  const [error, setError] = useState<string>("");

  const { register, handleSubmit, formState } = useForm<GenerateFormValues>({
    defaultValues: {
      shopDomain: "example-store.myshopify.com",
      customerName: "Taylor",
      customerEmail: "taylor@example.com",
      discountCode: "WELCOME10",
      cartItemsJson: defaultCart,
      browseJson: defaultBrowse
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    setResult(null);

    let cartItems: unknown;
    let browseHistory: unknown;

    try {
      cartItems = JSON.parse(values.cartItemsJson);
      browseHistory = JSON.parse(values.browseJson);
    } catch {
      setError("Cart and browsing data must be valid JSON arrays.");
      return;
    }

    const response = await fetch("/api/ai/generate-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shopDomain: values.shopDomain,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        discountCode: values.discountCode,
        cartItems,
        browseHistory
      })
    });

    const data = (await response.json()) as GeneratedResponse & { error?: string; message?: string };

    if (!response.ok) {
      setError(data.message ?? data.error ?? "Unable to generate email variants.");
      return;
    }

    setResult(data);
  });

  return (
    <section className="panel p-5">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-white">Generate High-Intent Email Variants</h3>
        <p className="mt-1 text-sm text-[#9eb1d0]">
          Feed cart + browsing JSON and get two conversion-focused variants in one call.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-[#2c3d53] bg-[#0d1626] px-3 text-sm text-white placeholder:text-[#6e829f]"
            placeholder="Shop domain"
            {...register("shopDomain", { required: true })}
          />
          <input
            className="h-10 rounded-lg border border-[#2c3d53] bg-[#0d1626] px-3 text-sm text-white placeholder:text-[#6e829f]"
            placeholder="Customer name"
            {...register("customerName", { required: true })}
          />
          <input
            type="email"
            className="h-10 rounded-lg border border-[#2c3d53] bg-[#0d1626] px-3 text-sm text-white placeholder:text-[#6e829f]"
            placeholder="Customer email"
            {...register("customerEmail", { required: true })}
          />
          <input
            className="h-10 rounded-lg border border-[#2c3d53] bg-[#0d1626] px-3 text-sm text-white placeholder:text-[#6e829f]"
            placeholder="Discount code (optional)"
            {...register("discountCode")}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.1em] text-[#8ea2c8]">Cart JSON</span>
            <textarea
              className="h-44 w-full rounded-lg border border-[#2c3d53] bg-[#0d1626] p-3 font-mono text-xs text-[#dce5f3]"
              {...register("cartItemsJson", { required: true })}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.1em] text-[#8ea2c8]">Browsing JSON</span>
            <textarea
              className="h-44 w-full rounded-lg border border-[#2c3d53] bg-[#0d1626] p-3 font-mono text-xs text-[#dce5f3]"
              {...register("browseJson", { required: true })}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#29b6f6] to-[#61ffca] px-5 py-2.5 text-sm font-semibold text-[#051320] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {formState.isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <WandSparkles size={16} />}
          {formState.isSubmitting ? "Generating" : "Generate A/B Variants"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-[#ff9c9c]">{error}</p> : null}

      {result ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {(["A", "B"] as const).map((variant) => {
            const content = result.variants[variant];
            return (
              <article key={variant} className="rounded-xl border border-[#2e3f56] bg-[#0d1422] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-white">Variant {variant}</h4>
                  <span className="text-xs text-[#88a2c9]">Email ID: {content.id}</span>
                </div>
                <p className="text-sm font-medium text-[#9fe7ff]">{content.subject}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#d3d9e8]">{content.body}</p>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
