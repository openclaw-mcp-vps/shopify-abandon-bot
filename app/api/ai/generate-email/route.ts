import { NextResponse } from "next/server";

import { generateAbandonEmail } from "@/lib/ai";
import { generateEmailSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = generateEmailSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const variants = await generateAbandonEmail(parsed.data);

  return NextResponse.json({
    success: true,
    variants
  });
}
