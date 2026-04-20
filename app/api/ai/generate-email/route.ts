import { NextRequest, NextResponse } from "next/server";

import { generatePersonalizedEmailVariants } from "@/lib/ai-service";
import { createOrUpdateCart, saveGeneratedEmailVariant } from "@/lib/database";

export async function POST(request: NextRequest) {
  const paidCookie = request.cookies.get("shopify_abandon_paid")?.value;

  if (paidCookie !== "1") {
    return NextResponse.json(
      {
        error: "Payment required",
        message: "Unlock a paid plan to generate production emails."
      },
      { status: 402 }
    );
  }

  let payload: {
    shopDomain?: string;
    cartToken?: string;
    customerEmail?: string;
    customerName?: string;
    currency?: string;
    totalPrice?: number;
    discountCode?: string;
    cartItems?: Array<{
      title: string;
      quantity: number;
      unitPrice: number;
      variant?: string;
      productUrl?: string;
    }>;
    browseHistory?: Array<{
      path: string;
      title?: string;
      category?: string;
      secondsOnPage?: number;
    }>;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload.customerEmail || !payload.cartItems || payload.cartItems.length === 0) {
    return NextResponse.json(
      {
        error: "Missing required fields.",
        required: ["customerEmail", "cartItems[]"]
      },
      { status: 400 }
    );
  }

  const shopDomain = payload.shopDomain ?? "manual-preview.myshopify.com";
  const cartToken = payload.cartToken ?? `manual-${Date.now()}`;

  const cartResult = createOrUpdateCart({
    shopDomain,
    cartToken,
    customerEmail: payload.customerEmail,
    customerName: payload.customerName,
    totalPrice:
      payload.totalPrice ??
      payload.cartItems.reduce((sum, item) => sum + item.unitPrice * Math.max(item.quantity, 1), 0),
    currency: payload.currency ?? "USD",
    items: payload.cartItems,
    browseHistory: payload.browseHistory ?? []
  });

  const generated = await generatePersonalizedEmailVariants({
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    shopDomain,
    discountCode: payload.discountCode,
    cartItems: payload.cartItems,
    browseHistory: payload.browseHistory ?? []
  });

  const variantAId = saveGeneratedEmailVariant({
    cartId: cartResult.cartId,
    variant: "A",
    subject: generated.variantA.subject,
    body: generated.variantA.body
  });

  const variantBId = saveGeneratedEmailVariant({
    cartId: cartResult.cartId,
    variant: "B",
    subject: generated.variantB.subject,
    body: generated.variantB.body
  });

  return NextResponse.json({
    status: "generated",
    cartId: cartResult.cartId,
    variants: {
      A: {
        id: variantAId,
        subject: generated.variantA.subject,
        body: generated.variantA.body
      },
      B: {
        id: variantBId,
        subject: generated.variantB.subject,
        body: generated.variantB.body
      }
    }
  });
}
