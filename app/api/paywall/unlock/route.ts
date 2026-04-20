import { NextResponse } from "next/server";
import { z } from "zod";

import { findActiveSubscriptionByEmail } from "@/lib/paywall";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "A valid billing email is required.",
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const activeSubscription = await findActiveSubscriptionByEmail(email);

  if (!activeSubscription) {
    return NextResponse.json(
      {
        error:
          "No active subscription found for this email yet. Wait 30-60 seconds for webhook sync, then try again.",
      },
      { status: 402 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    email,
    plan: activeSubscription.plan,
    storesAllowed: activeSubscription.storesAllowed,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };

  response.cookies.set("abandon_bot_paid", "true", cookieOptions);
  response.cookies.set("abandon_bot_email", email, cookieOptions);
  response.cookies.set("abandon_bot_plan", activeSubscription.plan, cookieOptions);

  return response;
}
