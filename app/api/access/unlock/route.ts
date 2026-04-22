import { NextResponse } from "next/server";

import { getActivePaymentByEmail } from "@/lib/database";
import { ACCESS_COOKIE_NAME, createAccessToken, getAccessCookieMaxAge } from "@/lib/paywall";
import { unlockSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = unlockSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid billing email." },
      { status: 400 }
    );
  }

  const payment = getActivePaymentByEmail(parsed.data.email);

  if (!payment) {
    return NextResponse.json(
      {
        error:
          "No active subscription found for that email yet. Complete checkout first, then retry after your Stripe webhook arrives."
      },
      { status: 402 }
    );
  }

  const token = createAccessToken(payment.customerEmail, payment.storeLimit);

  const response = NextResponse.json({
    message: `Access unlocked for ${payment.customerEmail}.`
  });

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    path: "/",
    maxAge: getAccessCookieMaxAge(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  return response;
}
