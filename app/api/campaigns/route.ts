import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { generateAbandonEmail } from "@/lib/ai";
import { getCampaigns, getDashboardMetrics, saveCampaign } from "@/lib/database";
import { sendAbandonEmail } from "@/lib/email";
import { verifyAccessToken } from "@/lib/paywall";
import { createCampaignSchema } from "@/lib/schemas";

function pickVariant(seed: string): "A" | "B" {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  return parseInt(hash.slice(0, 2), 16) % 2 === 0 ? "A" : "B";
}

function getAccessFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieValue = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("sab_access="))
    ?.split("=")
    .slice(1)
    .join("=");

  return verifyAccessToken(cookieValue);
}

export async function GET(request: Request) {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const storeDomain = url.searchParams.get("storeDomain") || undefined;
  const campaigns = getCampaigns({ storeDomain, limit: 100 });
  const metrics = getDashboardMetrics(storeDomain);

  return NextResponse.json({
    campaigns,
    metrics
  });
}

export async function POST(request: Request) {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid campaign payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const generated = await generateAbandonEmail({
    storeDomain: data.storeDomain,
    customer: {
      email: data.customerEmail,
      firstName: data.customerName
    },
    cart: {
      lineItems: data.lineItems,
      total: data.cartValue,
      currency: data.currency
    },
    browsingSignals: data.browsingSignals
  });

  const selectedVariant = pickVariant(`${data.customerEmail}:${Date.now()}`);
  const selectedContent = selectedVariant === "A" ? generated.variantA : generated.variantB;

  let status: "queued" | "sent" | "failed" = "queued";
  let providerId: string | undefined;

  if (data.sendNow) {
    try {
      const sendResult = await sendAbandonEmail({
        to: data.customerEmail,
        subject: selectedContent.subject,
        body: selectedContent.body
      });

      status = sendResult.status === "sent" ? "sent" : "queued";
      providerId = sendResult.id;
    } catch {
      status = "failed";
    }
  }

  const campaign = saveCampaign({
    storeDomain: data.storeDomain,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    source: "manual",
    cartValue: data.cartValue,
    currency: data.currency,
    lineItems: data.lineItems,
    browsingSignals: data.browsingSignals,
    variantA: generated.variantA,
    variantB: generated.variantB,
    sentVariant: selectedVariant,
    emailProviderId: providerId,
    status,
    metrics: {
      opened: false,
      clicked: false,
      converted: false,
      recoveredRevenue: 0
    }
  });

  return NextResponse.json({
    success: true,
    campaign
  });
}
