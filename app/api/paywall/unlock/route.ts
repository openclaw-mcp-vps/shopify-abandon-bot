import { NextResponse } from "next/server";

import { findPayment, markPaymentVerified } from "@/lib/database";
import { createAccessToken, PAYWALL_COOKIE_NAME } from "@/lib/paywall";

interface UnlockRequest {
  orderId: string;
  email: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as Partial<UnlockRequest>;
  const orderId = body.orderId?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!orderId || !email) {
    return NextResponse.json({ error: "Order ID and email are required" }, { status: 400 });
  }

  const payment = await findPayment(orderId, email);

  if (!payment) {
    return NextResponse.json(
      {
        error:
          "Purchase not found yet. Complete checkout first, then retry. If you just paid, webhook delivery can take up to 30 seconds."
      },
      { status: 404 }
    );
  }

  await markPaymentVerified(payment.id);

  const now = Math.floor(Date.now() / 1000);
  let accessToken: string;

  try {
    accessToken = createAccessToken({
      orderId: payment.orderId,
      email: payment.email,
      plan: payment.plan,
      storeLimit: payment.storeLimit,
      issuedAt: now,
      exp: now + 60 * 60 * 24 * 30
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Paywall signing secret is missing. Set PAYWALL_SECRET or LEMON_SQUEEZY_WEBHOOK_SECRET."
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true, plan: payment.plan, storeLimit: payment.storeLimit });

  response.cookies.set({
    name: PAYWALL_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
