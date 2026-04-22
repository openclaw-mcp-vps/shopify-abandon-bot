"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const connectStoreSchema = z.object({
  shop: z
    .string()
    .min(5, "Enter your Shopify domain")
    .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i, "Use your full domain, e.g. my-store.myshopify.com")
});

const unlockSchema = z.object({
  email: z.string().email("Enter the same billing email used in Stripe")
});

type ConnectStoreInput = z.infer<typeof connectStoreSchema>;
type UnlockInput = z.infer<typeof unlockSchema>;

export function OnboardingWizard() {
  const [unlockMessage, setUnlockMessage] = useState<string>("");
  const [unlockError, setUnlockError] = useState<string>("");

  const connectStoreForm = useForm<ConnectStoreInput>({
    resolver: zodResolver(connectStoreSchema),
    defaultValues: {
      shop: ""
    }
  });

  const unlockForm = useForm<UnlockInput>({
    resolver: zodResolver(unlockSchema),
    defaultValues: {
      email: ""
    }
  });

  const unlockButtonLabel = useMemo(() => {
    if (unlockForm.formState.isSubmitting) {
      return "Checking purchase...";
    }
    return "Unlock Dashboard";
  }, [unlockForm.formState.isSubmitting]);

  const onConnectStore = (values: ConnectStoreInput) => {
    const params = new URLSearchParams({ shop: values.shop });
    window.location.href = `/api/shopify/auth?${params.toString()}`;
  };

  const onUnlock = unlockForm.handleSubmit(async (values) => {
    setUnlockError("");
    setUnlockMessage("");

    const response = await fetch("/api/access/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setUnlockError(payload.error || "Unable to verify payment yet.");
      return;
    }

    setUnlockMessage(payload.message || "Access granted. Redirecting...");
    window.setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-zinc-700">
        <CardHeader>
          <CardTitle>1) Connect Shopify</CardTitle>
          <CardDescription>
            Authorize read access for carts, customers, and orders so the AI can personalize each recovery email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={connectStoreForm.handleSubmit(onConnectStore)}>
            <div className="space-y-2">
              <Label htmlFor="shop">Shopify Store Domain</Label>
              <Input id="shop" placeholder="your-brand.myshopify.com" {...connectStoreForm.register("shop")} />
              {connectStoreForm.formState.errors.shop ? (
                <p className="text-sm text-rose-300">{connectStoreForm.formState.errors.shop.message}</p>
              ) : null}
            </div>
            <Button size="lg" type="submit" className="w-full">
              Connect Store
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-700">
        <CardHeader>
          <CardTitle>2) Unlock Your Account</CardTitle>
          <CardDescription>
            After Stripe checkout, enter your billing email to receive a secure paywall cookie and open the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onUnlock}>
            <div className="space-y-2">
              <Label htmlFor="email">Billing Email</Label>
              <Input id="email" placeholder="owner@yourstore.com" {...unlockForm.register("email")} />
              {unlockForm.formState.errors.email ? (
                <p className="text-sm text-rose-300">{unlockForm.formState.errors.email.message}</p>
              ) : null}
            </div>

            {unlockError ? <p className="text-sm text-rose-300">{unlockError}</p> : null}
            {unlockMessage ? <p className="text-sm text-emerald-300">{unlockMessage}</p> : null}

            <Button size="lg" type="submit" className="w-full">
              {unlockButtonLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
