"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  shopDomain: z
    .string()
    .min(3, "Enter your store handle or full myshopify domain.")
    .regex(/^[a-z0-9-\.]+$/i, "Use letters, numbers, dashes, or dots only."),
});

type FormValues = z.infer<typeof schema>;

function normalizeDomain(input: string) {
  const value = input.trim().toLowerCase();
  return value.endsWith(".myshopify.com") ? value : `${value}.myshopify.com`;
}

export function ShopifyConnect({ connectedShop }: { connectedShop?: string }) {
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopDomain: connectedShop ?? "",
    },
  });

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/api/shopify/webhook";
    }

    return `${window.location.origin}/api/shopify/webhook`;
  }, []);

  const onSubmit = form.handleSubmit((values) => {
    setPending(true);
    const shop = normalizeDomain(values.shopDomain);
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}`;
  });

  return (
    <Card className="border border-zinc-700 bg-zinc-900/70">
      <CardHeader>
        <CardTitle className="text-zinc-100">Connect Shopify</CardTitle>
        <CardDescription className="text-zinc-400">
          Authorize Shopify access so the bot can receive abandonment events and
          enrich recovery emails with cart context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            placeholder="your-store.myshopify.com"
            {...form.register("shopDomain")}
          />
          {form.formState.errors.shopDomain ? (
            <p className="text-sm text-red-300">
              {form.formState.errors.shopDomain.message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Redirecting to Shopify..." : "Authorize Shopify"}
          </Button>
        </form>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4 text-sm text-zinc-300">
          <p className="font-medium text-zinc-100">Webhook endpoint</p>
          <p className="mt-1 break-all text-zinc-400">{webhookUrl}</p>
          <p className="mt-3 text-zinc-400">
            Register this URL in Shopify admin for checkout-related webhooks so
            abandon events trigger personalized email generation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
