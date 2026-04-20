import { createHash } from "crypto";

import { NextResponse } from "next/server";

import { generateEmailVariants } from "@/lib/ai-service";
import { createCampaign, findCampaignByCheckoutId, getStoreByDomain, recordWebhookEvent, updateCampaign } from "@/lib/database";
import { sendCampaignEmail } from "@/lib/email-provider";
import { mapShopifyCheckout, verifyShopifyWebhook } from "@/lib/shopify";
import type { ShopifyCheckoutPayload } from "@/lib/shopify";
import type { CampaignVariantId } from "@/lib/types";

function pickVariant(customerEmail: string): CampaignVariantId {
  const hash = createHash("sha256").update(customerEmail).digest("hex");
  const last = parseInt(hash.slice(-1), 16);
  return last % 2 === 0 ? "A" : "B";
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic") || "unknown";
  const storeDomain = request.headers.get("x-shopify-shop-domain") || "";

  if (!verifyShopifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Shopify webhook signature" }, { status: 401 });
  }

  await recordWebhookEvent({
    source: "shopify",
    topic,
    rawPayload: rawBody
  });

  if (!storeDomain) {
    return NextResponse.json({ error: "Missing x-shopify-shop-domain header" }, { status: 400 });
  }

  const store = await getStoreByDomain(storeDomain);
  if (!store) {
    return NextResponse.json(
      {
        error: `Store ${storeDomain} is not connected yet`
      },
      { status: 404 }
    );
  }

  const payload = JSON.parse(rawBody) as ShopifyCheckoutPayload;
  const checkout = mapShopifyCheckout(payload);

  if (!checkout.isAbandoned) {
    return NextResponse.json({ ok: true, skipped: "Checkout already completed" });
  }

  if (!checkout.customerEmail || !checkout.recoveryUrl) {
    return NextResponse.json({ ok: true, skipped: "Missing customer email or recovery URL" });
  }

  const duplicate = await findCampaignByCheckoutId(checkout.checkoutId);
  if (duplicate) {
    return NextResponse.json({ ok: true, skipped: "Campaign already exists", campaignId: duplicate.id });
  }

  const variants = await generateEmailVariants({
    storeDomain: store.storeDomain,
    customerFirstName: checkout.customerFirstName,
    cartItems: checkout.cartItems,
    browsingSignals: checkout.browsingSignals,
    cartValue: checkout.cartValue,
    recoveryUrl: checkout.recoveryUrl
  });

  const assignedVariant = pickVariant(checkout.customerEmail);

  const campaign = await createCampaign({
    storeDomain: store.storeDomain,
    checkoutId: checkout.checkoutId,
    customerEmail: checkout.customerEmail,
    customerFirstName: checkout.customerFirstName,
    cartItems: checkout.cartItems,
    browsingSignals: checkout.browsingSignals,
    cartValue: checkout.cartValue,
    recoveryUrl: checkout.recoveryUrl,
    variants,
    assignedVariant,
    status: "queued",
    generatedAt: new Date().toISOString(),
    recoveredRevenue: 0
  });

  const emailResult = await sendCampaignEmail(campaign);

  if (!emailResult.success) {
    await updateCampaign(campaign.id, (current) => ({
      ...current,
      status: "failed",
      failureReason: emailResult.error
    }));

    return NextResponse.json(
      {
        error: "Failed to send campaign email",
        details: emailResult.error,
        campaignId: campaign.id
      },
      { status: 500 }
    );
  }

  await updateCampaign(campaign.id, (current) => ({
    ...current,
    status: "sent",
    providerMessageId: emailResult.messageId,
    sentAt: new Date().toISOString()
  }));

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    variant: assignedVariant,
    providerMessageId: emailResult.messageId
  });
}
