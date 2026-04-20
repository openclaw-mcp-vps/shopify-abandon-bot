"use client";

import { useMemo, useState } from "react";
import { Bot, Loader2, Mail, Sparkles, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Item = {
  title: string;
  quantity: number;
  price: number;
  variantTitle?: string;
};

type Variant = {
  variant: "A" | "B";
  subject: string;
  body: string;
  cta: string;
};

type CartPreview = {
  id: string;
  email: string;
  customerName: string;
  currency: string;
  subtotal: number;
  items: Item[];
  browsingSignals: string[];
  status: "abandoned" | "emailed" | "converted";
  assignedVariant: "A" | "B" | null;
  variants: Variant[];
  abandonedAt: string;
};

type Generated = {
  reasoning: string;
  variants: Variant[];
};

type EmailPreviewProps = {
  carts: CartPreview[];
};

function formatCurrency(currency: string, value: number): string {
  return `${currency} ${value.toFixed(2)}`;
}

function parseLines(input: string): string[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseItems(input: string): Item[] {
  const lines = parseLines(input);

  return lines
    .map((line) => {
      const [titlePart, pricePart] = line.split("|").map((segment) => segment.trim());
      if (!titlePart) {
        return null;
      }

      const price = Number(pricePart ?? "0");
      return {
        title: titlePart,
        quantity: 1,
        price: Number.isFinite(price) ? price : 0,
      };
    })
    .filter(Boolean) as Item[];
}

export function EmailPreview({ carts }: EmailPreviewProps): React.JSX.Element {
  const [selectedCartId, setSelectedCartId] = useState<string>(carts[0]?.id ?? "");
  const [customCustomerName, setCustomCustomerName] = useState("Alex");
  const [customCurrency, setCustomCurrency] = useState("USD");
  const [customItems, setCustomItems] = useState("Wireless earbuds | 79\nProtective case | 24");
  const [customSignals, setCustomSignals] = useState(
    "Viewed accessories collection\nCompared black and navy color options",
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [generated, setGenerated] = useState<Generated | null>(null);

  const selected = useMemo(
    () => carts.find((cart) => cart.id === selectedCartId) ?? null,
    [carts, selectedCartId],
  );

  const triggerGeneration = async (source: {
    customerName: string;
    currency: string;
    items: Item[];
    browsingSignals: string[];
    subtotal: number;
  }): Promise<void> => {
    setGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: "Shopify Store",
          customerName: source.customerName || "there",
          cartItems: source.items,
          browsingSignals: source.browsingSignals,
          cartValue: source.subtotal,
          currency: source.currency,
        }),
      });

      const payload = (await response.json()) as Generated & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to generate email variants.");
        return;
      }

      setGenerated({
        reasoning: payload.reasoning,
        variants: payload.variants,
      });
    } catch {
      setError("Request failed while generating AI email variants.");
    } finally {
      setGenerating(false);
    }
  };

  const runFromSelectedCart = async (): Promise<void> => {
    if (!selected) {
      return;
    }

    await triggerGeneration({
      customerName: selected.customerName,
      currency: selected.currency,
      items: selected.items,
      browsingSignals: selected.browsingSignals,
      subtotal: selected.subtotal,
    });
  };

  const runFromCustomInput = async (): Promise<void> => {
    const items = parseItems(customItems);
    if (items.length === 0) {
      setError("Add at least one item in the custom generator before running.");
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await triggerGeneration({
      customerName: customCustomerName,
      currency: customCurrency,
      items,
      browsingSignals: parseLines(customSignals),
      subtotal,
    });
  };

  const variantsToRender = generated?.variants ?? selected?.variants ?? [];

  return (
    <section className="grid gap-5 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-4 w-4 text-[#3fb950]" />
            Recent carts
          </CardTitle>
          <CardDescription>Select a cart to inspect assigned variant and regenerate copy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {carts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#30363d] p-3 text-sm text-[#8b949e]">
              No webhook events yet. Use the custom generator below to test live AI output.
            </div>
          ) : (
            carts.map((cart) => (
              <button
                key={cart.id}
                type="button"
                onClick={() => setSelectedCartId(cart.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedCartId === cart.id
                    ? "border-[#3fb950] bg-[#111922]"
                    : "border-[#30363d] bg-[#151b23] hover:bg-[#1c2430]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[#f0f6fc]">{cart.email}</p>
                  <Badge variant={cart.status === "converted" ? "default" : "muted"}>
                    {cart.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[#8b949e]">
                  {formatCurrency(cart.currency, cart.subtotal)} • {new Date(cart.abandonedAt).toLocaleString()}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-[#9ca3af]">
                  {cart.items.map((item) => item.title).join(", ")}
                </p>
              </button>
            ))
          )}

          <Button className="mt-2 w-full" onClick={() => runFromSelectedCart()} disabled={!selected || generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Regenerate from selected cart
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <WandSparkles className="h-4 w-4 text-[#3fb950]" />
            AI email variant preview
          </CardTitle>
          <CardDescription>
            Uses your paid API endpoint and returns two subject/body variants ready for send.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {variantsToRender.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-[#30363d] p-4 text-sm text-[#8b949e]">
                No variants yet. Generate one from a selected cart or the custom test form.
              </div>
            ) : (
              variantsToRender.map((variant) => (
                <div key={variant.variant} className="rounded-xl border border-[#30363d] bg-[#111922] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">Variant {variant.variant}</p>
                    {selected?.assignedVariant === variant.variant ? (
                      <Badge>Currently assigned</Badge>
                    ) : (
                      <Badge variant="muted">Alternative</Badge>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-wide text-[#8b949e]">Subject</p>
                  <p className="mb-3 mt-1 text-sm text-[#f0f6fc]">{variant.subject}</p>

                  <p className="text-xs uppercase tracking-wide text-[#8b949e]">Body</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#d0d7de]">{variant.body}</p>

                  <p className="mt-3 text-xs text-[#8b949e]">CTA: {variant.cta}</p>
                </div>
              ))
            )}
          </div>

          {generated?.reasoning ? (
            <div className="rounded-xl border border-[#3fb950]/35 bg-[#0f141d] p-4 text-sm text-[#c9d1d9]">
              <p className="mb-1 flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4 text-[#3fb950]" />
                Why these variants were generated
              </p>
              <p>{generated.reasoning}</p>
            </div>
          ) : null}

          <div className="space-y-3 rounded-xl border border-[#30363d] bg-[#111922] p-4">
            <p className="text-sm font-semibold">Custom generator</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={customCustomerName}
                onChange={(event) => setCustomCustomerName(event.target.value)}
                placeholder="Customer name"
                className="h-10 rounded-lg border border-[#30363d] bg-[#151b23] px-3 text-sm outline-none focus:border-[#3fb950]"
              />
              <input
                type="text"
                value={customCurrency}
                onChange={(event) => setCustomCurrency(event.target.value.toUpperCase())}
                placeholder="Currency (USD)"
                className="h-10 rounded-lg border border-[#30363d] bg-[#151b23] px-3 text-sm uppercase outline-none focus:border-[#3fb950]"
              />
            </div>

            <textarea
              value={customItems}
              onChange={(event) => setCustomItems(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[#30363d] bg-[#151b23] px-3 py-2 text-sm outline-none focus:border-[#3fb950]"
              placeholder="One item per line. Use: Product title | price"
            />

            <textarea
              value={customSignals}
              onChange={(event) => setCustomSignals(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#30363d] bg-[#151b23] px-3 py-2 text-sm outline-none focus:border-[#3fb950]"
              placeholder="One behavior signal per line"
            />

            <Button variant="outline" onClick={() => runFromCustomInput()} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating
                </>
              ) : (
                "Generate from custom input"
              )}
            </Button>

            {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
