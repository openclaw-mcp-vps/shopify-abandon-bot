import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { recordLemonPurchase } from "@/lib/database";

function verifyLemonSqueezySignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const digestBase64 = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  if (signatureHeader === digest || signatureHeader === digestBase64) {
    return true;
  }

  const providedBuffer = Buffer.from(signatureHeader, "utf8");
  const digestBuffer = Buffer.from(digest, "utf8");

  if (providedBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, digestBuffer);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-signature") ?? request.headers.get("x-lemonsqueezy-signature");

  if (!verifyLemonSqueezySignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy webhook signature." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const meta = payload.meta as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;

  const eventName = (meta?.event_name as string | undefined) ?? "unknown";

  const email =
    (attributes?.user_email as string | undefined) ??
    (attributes?.customer_email as string | undefined) ??
    (attributes?.email as string | undefined);

  if (!email) {
    return NextResponse.json({ status: "ignored", reason: "No customer email on payload", eventName });
  }

  const orderId =
    (data?.id ? String(data.id) : undefined) ??
    (attributes?.order_id ? String(attributes.order_id) : undefined);

  const planName =
    (attributes?.variant_name as string | undefined) ?? (attributes?.product_name as string | undefined);

  let status: "active" | "cancelled" | "refunded" = "active";

  if (eventName.includes("refund") || eventName.includes("refunded")) {
    status = "refunded";
  }

  if (
    eventName.includes("cancel") ||
    eventName.includes("expired") ||
    eventName.includes("paused") ||
    eventName.includes("subscription_cancelled")
  ) {
    status = "cancelled";
  }

  recordLemonPurchase({
    email,
    orderId,
    status,
    planName
  });

  return NextResponse.json({
    status: "processed",
    eventName,
    email,
    recordedStatus: status
  });
}
