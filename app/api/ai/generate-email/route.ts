import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAbandonEmail } from "@/lib/ai-email-generator";

export const runtime = "nodejs";

const requestSchema = z.object({
  storeName: z.string().min(2),
  shopDomain: z.string().optional(),
  customerFirstName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  currency: z.string().optional(),
  cartItems: z
    .array(
      z.object({
        title: z.string().min(1),
        quantity: z.number().int().positive(),
        price: z.number().nonnegative(),
      })
    )
    .min(1),
  cartValue: z.number().positive().optional(),
  browsingSignals: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const hasAccess = cookieStore.get("abandon_bot_paid")?.value === "true";

  if (!hasAccess) {
    return NextResponse.json(
      {
        error:
          "Paid access required. Complete checkout and unlock from onboarding first.",
      },
      { status: 402 }
    );
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const generated = await generateAbandonEmail({
    ...parsed.data,
    currency: parsed.data.currency ?? "USD",
  });

  return NextResponse.json({
    generated,
  });
}
