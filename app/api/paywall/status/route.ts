import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { PAYWALL_COOKIE_NAME } from "@/lib/constants";
import { getPaywallSession } from "@/lib/database";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ active: false });
  }

  const session = await getPaywallSession(token);
  return NextResponse.json({
    active: session?.status === "active",
    status: session?.status ?? "missing",
    plan: session?.plan ?? null,
    storeLimit: session?.storeLimit ?? 0,
  });
}
