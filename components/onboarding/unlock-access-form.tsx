"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Enter the billing email used at checkout."),
});

type FormValues = z.infer<typeof schema>;

export function UnlockAccessForm() {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError("");
    setMessage("");

    const response = await fetch("/api/paywall/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(
        payload.error ?? "Unable to unlock access yet. Please try again shortly."
      );
      return;
    }

    setMessage("Access unlocked. Opening dashboard...");
    window.location.href = "/dashboard";
  });

  return (
    <Card className="border border-zinc-700 bg-zinc-900/70">
      <CardHeader>
        <CardTitle className="text-zinc-100">Unlock Paid Access</CardTitle>
        <CardDescription className="text-zinc-400">
          After checkout, enter the same billing email so we can verify your
          active subscription and set secure access cookies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="owner@yourstore.com"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-red-300">
              {form.formState.errors.email.message}
            </p>
          ) : null}
          <Button type="submit">Verify and Unlock</Button>
        </form>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
