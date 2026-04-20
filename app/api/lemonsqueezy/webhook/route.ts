import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { activatePaywallSession } from "@/lib/database";

function verifyLemonSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const normalized = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;

  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(normalized, "utf8");

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    meta?: {
      event_name?: string;
      custom_data?: {
        paywall_token?: string;
      };
    };
    data?: {
      id?: string | number;
      attributes?: {
        user_email?: string;
      };
    };
  };

  const eventName = payload.meta?.event_name ?? "unknown";

  if (!["order_created", "subscription_created", "subscription_payment_success"].includes(eventName)) {
    return NextResponse.json({ received: true, ignored: eventName });
  }

  const token = payload.meta?.custom_data?.paywall_token;
  const email = payload.data?.attributes?.user_email;
  const orderId = String(payload.data?.id ?? "").trim();

  if (!token && !email) {
    return NextResponse.json(
      { received: true, warning: "No paywall token or email found on webhook." },
      { status: 202 },
    );
  }

  const activated = await activatePaywallSession({
    token,
    email,
    orderId: orderId || `lemonsqueezy_${Date.now()}`,
  });

  return NextResponse.json({
    received: true,
    activated: Boolean(activated),
    plan: activated?.plan ?? null,
  });
}
