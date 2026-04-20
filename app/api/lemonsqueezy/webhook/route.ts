import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { upsertSubscription } from "@/lib/paywall";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function mapPlan(productName: string | undefined) {
  const label = (productName ?? "").toLowerCase();

  if (label.includes("5 store") || label.includes("99")) {
    return {
      plan: "multi-store" as const,
      storesAllowed: 5,
    };
  }

  return {
    plan: "single-store" as const,
    storesAllowed: 1,
  };
}

function normalizeEventStatus(eventName: string) {
  const lower = eventName.toLowerCase();

  if (lower.includes("cancel") || lower.includes("expired")) {
    return "cancelled" as const;
  }

  if (lower.includes("payment_failed") || lower.includes("past_due")) {
    return "past_due" as const;
  }

  return "active" as const;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature") ?? "";
  const rawBody = await request.text();

  if (!signature || !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: {
    meta?: {
      event_name?: string;
      custom_data?: Record<string, unknown>;
    };
    data?: {
      id?: string;
      attributes?: {
        user_email?: string;
        customer_email?: string;
        status?: string;
        product_name?: string;
        first_order_item?: {
          product_name?: string;
        };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "unknown";
  const attributes = payload.data?.attributes;

  const email =
    (attributes?.user_email ??
      attributes?.customer_email ??
      (payload.meta?.custom_data?.email as string | undefined))
      ?.trim()
      .toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ ok: true, ignored: "No customer email in webhook." });
  }

  const productName =
    attributes?.first_order_item?.product_name ?? attributes?.product_name;
  const mappedPlan = mapPlan(productName);

  const status = normalizeEventStatus(eventName);

  const subscription = await upsertSubscription({
    email,
    status,
    plan: mappedPlan.plan,
    storesAllowed: mappedPlan.storesAllowed,
    lemonOrderId: payload.data?.id,
    lemonSubscriptionId: payload.data?.id,
    shopDomain:
      typeof payload.meta?.custom_data?.shop_domain === "string"
        ? payload.meta.custom_data.shop_domain
        : undefined,
  });

  return NextResponse.json({
    ok: true,
    eventName,
    email,
    status: subscription.status,
    plan: subscription.plan,
  });
}
