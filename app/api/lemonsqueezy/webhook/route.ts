import crypto from "node:crypto";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { NextResponse } from "next/server";

import { logWebhookEvent, upsertPayment } from "@/lib/database";

export const runtime = "nodejs";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
  };
  data?: {
    id?: string;
    attributes?: {
      user_email?: string;
      status?: string;
      variant_name?: string;
      total?: number;
    };
  };
};

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(digest, "utf8");

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function inferStoreLimit(variantName?: string) {
  if (!variantName) {
    return 1;
  }

  return variantName.toLowerCase().includes("5") ? 5 : 1;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid LemonSqueezy signature" }, { status: 401 });
  }

  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY || ""
  });

  const payload = JSON.parse(rawBody) as LemonWebhookPayload;
  const eventName = payload.meta?.event_name || "unknown";

  logWebhookEvent("lemonsqueezy", eventName, payload as Record<string, unknown>);

  const email = payload.data?.attributes?.user_email;
  const referenceId = payload.data?.id;

  if (!email || !referenceId) {
    return NextResponse.json({ processed: true, ignored: true });
  }

  const status = payload.data?.attributes?.status || "active";
  const active = status === "active" || status === "on_trial";

  upsertPayment({
    provider: "lemonsqueezy",
    customerEmail: email,
    active,
    storeLimit: inferStoreLimit(payload.data?.attributes?.variant_name),
    referenceId,
    metadata: {
      status,
      eventName
    }
  });

  return NextResponse.json({ processed: true });
}
