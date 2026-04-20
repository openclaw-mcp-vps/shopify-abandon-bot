import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

import { PAYWALL_COOKIE_NAME } from "@/lib/constants";
import { type BillingPlan, createPaywallSession } from "@/lib/database";

function isBillingPlan(value: string): value is BillingPlan {
  return value === "starter" || value === "agency";
}

export async function POST(request: Request): Promise<NextResponse> {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!productId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID is not configured." },
      { status: 400 },
    );
  }

  let body: { email?: string; plan?: string };

  try {
    body = (await request.json()) as { email?: string; plan?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const plan = String(body.plan ?? "").trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  if (!isBillingPlan(plan)) {
    return NextResponse.json(
      { error: "Plan must be starter or agency." },
      { status: 400 },
    );
  }

  if (process.env.LEMON_SQUEEZY_API_KEY) {
    lemonSqueezySetup({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY,
      onError: () => undefined,
    });
  }

  const session = await createPaywallSession({ email, plan });

  const params = new URLSearchParams({
    embed: "1",
    media: "0",
    logo: "0",
    "checkout[email]": email,
    "checkout[custom][paywall_token]": session.token,
    "checkout[custom][plan]": session.plan,
    "checkout[custom][store_limit]": String(session.storeLimit),
  });

  const checkoutUrl = `https://app.lemonsqueezy.com/checkout/buy/${productId}?${params.toString()}`;

  const cookieStore = await cookies();
  cookieStore.set(PAYWALL_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    checkoutUrl,
    token: session.token,
    plan: session.plan,
  });
}
