import { NextResponse } from "next/server";

import { generateEmailVariants } from "@/lib/ai-service";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as {
    storeDomain?: string;
    customerFirstName?: string;
    cartItems?: Array<{
      title: string;
      quantity: number;
      price: number;
      variantTitle?: string;
      productUrl?: string;
    }>;
    browsingSignals?: Array<{
      path: string;
      secondsOnPage: number;
      referrer?: string;
      viewedAt: string;
    }>;
    cartValue?: number;
    recoveryUrl?: string;
  };

  if (!body.storeDomain || !body.cartItems?.length || !body.recoveryUrl) {
    return NextResponse.json(
      {
        error: "storeDomain, cartItems, and recoveryUrl are required"
      },
      { status: 400 }
    );
  }

  const variants = await generateEmailVariants({
    storeDomain: body.storeDomain,
    customerFirstName: body.customerFirstName,
    cartItems: body.cartItems,
    browsingSignals: body.browsingSignals ?? [],
    cartValue:
      typeof body.cartValue === "number"
        ? body.cartValue
        : body.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    recoveryUrl: body.recoveryUrl
  });

  return NextResponse.json({
    ok: true,
    variants
  });
}
