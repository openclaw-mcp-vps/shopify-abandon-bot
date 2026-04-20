"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  storeName: z.string().min(2),
  customerFirstName: z.string().min(1),
  customerEmail: z.string().email(),
  currency: z.string().default("USD"),
  cartLines: z
    .string()
    .min(3, "Add at least one cart line in this format: Product|Quantity|Price"),
  browsingSignals: z.string().default(""),
});

type FormValues = z.infer<typeof schema>;

type GeneratedOutput = {
  customerSegment: string;
  rationale: string;
  variants: Array<{
    variant: "A" | "B";
    subject: string;
    preview: string;
    body: string;
    ctaLabel: string;
  }>;
};

type RecentTemplate = {
  id: string;
  subject: string;
  variant: "A" | "B";
  sentAt: string;
  customerEmail: string;
};

function parseCartLines(input: string) {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [title, quantityRaw = "1", priceRaw = "0"] = line
      .split("|")
      .map((part) => part.trim());

    return {
      title,
      quantity: Number(quantityRaw || "1"),
      price: Number(priceRaw || "0"),
    };
  });
}

export function EmailTemplates({
  recentTemplates,
}: {
  recentTemplates: RecentTemplate[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<GeneratedOutput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      storeName: "Northstar Outdoors",
      customerFirstName: "Jamie",
      customerEmail: "jamie@example.com",
      currency: "USD",
      cartLines: "Trail Runner Jacket|1|129\nStormproof Gloves|1|39",
      browsingSignals: "Visited premium jackets twice\nCompared sizing chart",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError("");

    const cartItems = parseCartLines(values.cartLines);
    if (cartItems.some((item) => !item.title || item.quantity <= 0 || item.price < 0)) {
      setError("Each cart line must be Product|Quantity|Price with valid values.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/ai/generate-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storeName: values.storeName,
        customerFirstName: values.customerFirstName,
        customerEmail: values.customerEmail,
        currency: values.currency,
        cartItems,
        cartValue: cartItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ),
        browsingSignals: values.browsingSignals
          .split("\n")
          .map((signal) => signal.trim())
          .filter(Boolean),
      }),
    });

    const payload = (await response.json()) as {
      generated?: GeneratedOutput;
      error?: string;
    };

    if (!response.ok || !payload.generated) {
      setError(payload.error ?? "Unable to generate email variants right now.");
      setLoading(false);
      return;
    }

    setResult(payload.generated);
    setLoading(false);
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className="border border-zinc-700 bg-zinc-900/70">
        <CardHeader>
          <CardTitle className="text-zinc-100">Generate New Templates</CardTitle>
          <CardDescription className="text-zinc-400">
            Test AI output for real cart scenarios before webhook traffic sends
            live campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Store name" {...form.register("storeName")} />
            <Input
              placeholder="Customer first name"
              {...form.register("customerFirstName")}
            />
            <Input
              placeholder="Customer email"
              type="email"
              {...form.register("customerEmail")}
            />
            <Input placeholder="Currency (USD)" {...form.register("currency")} />
            <Textarea
              rows={5}
              placeholder="Product|Quantity|Price"
              {...form.register("cartLines")}
            />
            <Textarea
              rows={4}
              placeholder="Browsing signals (one per line)"
              {...form.register("browsingSignals")}
            />

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate A/B Variants"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border border-zinc-700 bg-zinc-900/70">
          <CardHeader>
            <CardTitle className="text-zinc-100">Recent Sent Subjects</CardTitle>
            <CardDescription className="text-zinc-400">
              Last webhook-triggered templates tracked in analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentTemplates.length === 0 ? (
              <p className="text-zinc-400">
                No templates sent yet. Connect Shopify and trigger a checkout
                abandonment event.
              </p>
            ) : (
              recentTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-md border border-zinc-700 bg-zinc-950/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{template.variant}</Badge>
                    <span className="text-xs text-zinc-500">
                      {new Date(template.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-zinc-100">{template.subject}</p>
                  <p className="mt-1 text-xs text-zinc-500">{template.customerEmail}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {result ? (
          <Card className="border border-emerald-500/30 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-zinc-100">Generated Variants</CardTitle>
              <CardDescription className="text-zinc-300">
                Segment: {result.customerSegment}
              </CardDescription>
              <p className="text-sm text-zinc-400">{result.rationale}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.variants.map((variant) => (
                <div
                  key={variant.variant}
                  className="rounded-md border border-zinc-700 bg-zinc-950/60 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary">Variant {variant.variant}</Badge>
                    <span className="text-xs uppercase tracking-wide text-zinc-500">
                      {variant.ctaLabel}
                    </span>
                  </div>
                  <p className="font-semibold text-zinc-100">{variant.subject}</p>
                  <p className="mt-1 text-sm text-zinc-400">{variant.preview}</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                    {variant.body}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
