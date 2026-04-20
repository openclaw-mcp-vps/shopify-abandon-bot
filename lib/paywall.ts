import { createHmac, timingSafeEqual } from "crypto";

import type { AccessPayload } from "@/lib/types";

export const PAYWALL_COOKIE_NAME = "sb_access";

function getSecret(): string | null {
  return process.env.PAYWALL_SECRET || process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || null;
}

function sign(value: string): string | null {
  const secret = getSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAccessToken(payload: AccessPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encoded);

  if (!signature) {
    throw new Error("Missing PAYWALL_SECRET or LEMON_SQUEEZY_WEBHOOK_SECRET");
  }

  return `${encoded}.${signature}`;
}

export function parseAccessToken(token: string | undefined): AccessPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encoded);
  if (!expectedSignature) {
    return null;
  }

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  const isValid = timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AccessPayload;

    if (Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
