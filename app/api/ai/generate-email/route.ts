import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { PAYWALL_COOKIE_NAME } from "@/lib/constants";
import { generatePersonalizedEmail } from "@/lib/ai";
import { hasActivePaywallAccess, type CartItem } from "@/lib/database";

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const typed = item as {
        title?: unknown;
        quantity?: unknown;
        price?: unknown;
        variantTitle?: unknown;
      };

      const title = String(typed.title ?? "").trim();
      const quantity = Number(typed.quantity ?? 1);
      const price = Number(typed.price ?? 0);

      if (!title || !Number.isFinite(quantity) || !Number.isFinite(price)) {
        return null;
      }

      return {
        title,
        quantity: Math.max(1, Math.round(quantity)),
        price,
        variantTitle: typed.variantTitle ? String(typed.variantTitle) : undefined,
      } satisfies CartItem;
    })
    .filter(Boolean) as CartItem[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;

  const hasAccess = await hasActivePaywallAccess(token);

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Active subscription required to generate email variants." },
      { status: 402 },
    );
  }

  const body = (await request.json()) as {
    storeName?: unknown;
    customerName?: unknown;
    cartItems?: unknown;
    browsingSignals?: unknown;
    cartValue?: unknown;
    currency?: unknown;
  };

  const cartItems = sanitizeCartItems(body.cartItems);

  if (cartItems.length === 0) {
    return NextResponse.json(
      { error: "cartItems must include at least one item." },
      { status: 400 },
    );
  }

  const cartValueRaw = Number(body.cartValue ?? 0);
  const cartValue = Number.isFinite(cartValueRaw)
    ? cartValueRaw
    : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const browsingSignals = Array.isArray(body.browsingSignals)
    ? body.browsingSignals
        .map((signal) => String(signal).trim())
        .filter((signal) => signal.length > 0)
    : [];

  const generated = await generatePersonalizedEmail({
    storeName: String(body.storeName ?? "Your Store").trim() || "Your Store",
    customerName: String(body.customerName ?? "there").trim() || "there",
    cartItems,
    browsingSignals,
    cartValue,
    currency: String(body.currency ?? "USD").trim() || "USD",
  });

  return NextResponse.json(generated);
}
