import { createHmac, timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

import { recordPayment, recordWebhookEvent } from "@/lib/database";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = signature.replace(/^sha256=/i, "");
  const signatureBuffer = Buffer.from(normalized, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function inferPlan(productName: string): { plan: "starter" | "growth"; storeLimit: number } {
  const lower = productName.toLowerCase();

  if (lower.includes("5 stores") || lower.includes("growth") || lower.includes("99")) {
    return { plan: "growth", storeLimit: 5 };
  }

  return { plan: "starter", storeLimit: 1 };
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  await recordWebhookEvent({
    source: "lemonsqueezy",
    topic: request.headers.get("x-event-name") || "unknown",
    rawPayload: rawBody
  });

  const payload = JSON.parse(rawBody) as {
    meta?: { event_name?: string };
    data?: {
      id?: string;
      attributes?: {
        identifier?: string;
        user_email?: string;
        customer_email?: string;
        first_order_item?: {
          product_name?: string;
          variant_name?: string;
        };
      };
    };
  };

  const eventName = payload.meta?.event_name || "";
  const allowedEvents = new Set([
    "order_created",
    "subscription_created",
    "subscription_payment_success",
    "subscription_payment_recovered"
  ]);

  if (!allowedEvents.has(eventName)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const attributes = payload.data?.attributes;
  const productName = attributes?.first_order_item?.product_name || attributes?.first_order_item?.variant_name || "starter";
  const { plan, storeLimit } = inferPlan(productName);

  const orderId = attributes?.identifier || payload.data?.id;
  const email = attributes?.user_email || attributes?.customer_email;

  if (!orderId || !email) {
    return NextResponse.json({ error: "Missing order identifier or email" }, { status: 400 });
  }

  const payment = await recordPayment({
    orderId,
    email,
    plan,
    storeLimit
  });

  return NextResponse.json({ ok: true, paymentId: payment.id });
}
