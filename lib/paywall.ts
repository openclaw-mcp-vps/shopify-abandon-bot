import crypto from "node:crypto";

export const ACCESS_COOKIE_NAME = "sab_access";

export type AccessSession = {
  email: string;
  storeLimit: number;
  exp: number;
};

const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSigningSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "dev-only-signing-secret";
}

function signValue(value: string) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(value)
    .digest("hex");
}

export function createAccessToken(email: string, storeLimit: number) {
  const payload: AccessSession = {
    email: email.toLowerCase(),
    storeLimit,
    exp: Math.floor(Date.now() / 1000) + ACCESS_MAX_AGE_SECONDS
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessToken(token?: string | null): AccessSession | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signValue(encoded);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as AccessSession;

    if (!parsed.email || !parsed.storeLimit || !parsed.exp) {
      return null;
    }

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getAccessCookieMaxAge() {
  return ACCESS_MAX_AGE_SECONDS;
}
