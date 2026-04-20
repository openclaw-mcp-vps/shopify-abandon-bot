import { NextRequest, NextResponse } from "next/server";

import { hasActivePurchase } from "@/lib/database";

export async function POST(request: NextRequest) {
  let payload: { email?: string };

  try {
    payload = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const hasPurchase = hasActivePurchase(email);

  if (!hasPurchase) {
    return NextResponse.json(
      {
        error: "No active purchase found for this email.",
        help: "Complete checkout first or verify the billing email used in Lemon Squeezy."
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ status: "unlocked" });
  response.cookies.set("shopify_abandon_paid", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  response.cookies.set("shopify_abandon_paid_hint", "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  return response;
}
