import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type BillingPlan = "starter" | "agency";
export type VariantId = "A" | "B";

export type CartItem = {
  title: string;
  quantity: number;
  price: number;
  variantTitle?: string;
};

export type EmailVariant = {
  variant: VariantId;
  subject: string;
  body: string;
  cta: string;
};

export type AbandonedCartRecord = {
  id: string;
  shopDomain: string;
  cartToken: string;
  email: string;
  customerName: string;
  currency: string;
  subtotal: number;
  items: CartItem[];
  browsingSignals: string[];
  status: "abandoned" | "emailed" | "converted";
  variants: EmailVariant[];
  assignedVariant: VariantId | null;
  emailMessageId: string | null;
  abandonedAt: string;
  emailedAt: string | null;
  convertedAt: string | null;
  recoveredRevenue: number;
};

export type PaywallSession = {
  token: string;
  email: string;
  plan: BillingPlan;
  storeLimit: number;
  status: "pending" | "active" | "expired";
  orderId: string | null;
  createdAt: string;
  activatedAt: string | null;
};

export type StoreInstall = {
  shopDomain: string;
  accessToken: string;
  scopes: string;
  installedAt: string;
  updatedAt: string;
};

type DatabaseSchema = {
  paywallSessions: PaywallSession[];
  storeInstalls: StoreInstall[];
  abandonedCarts: AbandonedCartRecord[];
};

export type DashboardStats = {
  totalAbandoned: number;
  emailsSent: number;
  converted: number;
  recoveredRevenue: number;
  averageCartValue: number;
  conversionRate: number;
  variantStats: Array<{
    variant: VariantId;
    sent: number;
    converted: number;
    conversionRate: number;
  }>;
  timeline: Array<{
    day: string;
    sent: number;
    converted: number;
    revenue: number;
  }>;
};

const DEFAULT_DB: DatabaseSchema = {
  paywallSessions: [],
  storeInstalls: [],
  abandonedCarts: [],
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

let mutationChain: Promise<void> = Promise.resolve();

async function ensureDbFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DB_FILE, "utf8");
  } catch {
    await writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

async function readDb(): Promise<DatabaseSchema> {
  await ensureDbFile();
  const raw = await readFile(DB_FILE, "utf8");

  try {
    return { ...DEFAULT_DB, ...(JSON.parse(raw) as DatabaseSchema) };
  } catch {
    return DEFAULT_DB;
  }
}

async function writeDb(db: DatabaseSchema): Promise<void> {
  await ensureDbFile();
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function queueMutation<T>(task: () => Promise<T>): Promise<T> {
  const next = mutationChain.then(task, task);
  mutationChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function planToStoreLimit(plan: BillingPlan): number {
  return plan === "agency" ? 5 : 1;
}

export function assignVariant(seed: string): VariantId {
  const hash = createHash("sha256").update(seed).digest();
  return hash[0] % 2 === 0 ? "A" : "B";
}

export async function createPaywallSession(input: {
  email: string;
  plan: BillingPlan;
}): Promise<PaywallSession> {
  const token = randomBytes(24).toString("hex");
  const now = new Date().toISOString();

  const session: PaywallSession = {
    token,
    email: input.email.toLowerCase(),
    plan: input.plan,
    storeLimit: planToStoreLimit(input.plan),
    status: "pending",
    orderId: null,
    createdAt: now,
    activatedAt: null,
  };

  await queueMutation(async () => {
    const db = await readDb();
    db.paywallSessions.push(session);
    await writeDb(db);
  });

  return session;
}

export async function activatePaywallSession(input: {
  token?: string;
  orderId: string;
  email?: string;
}): Promise<PaywallSession | null> {
  return queueMutation(async () => {
    const db = await readDb();
    const normalizedEmail = input.email?.toLowerCase();

    let target = input.token
      ? db.paywallSessions.find((session) => session.token === input.token)
      : undefined;

    if (!target && normalizedEmail) {
      const pendingSessions = db.paywallSessions
        .filter(
          (session) =>
            session.email === normalizedEmail && session.status === "pending",
        )
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      target = pendingSessions[0];
    }

    if (!target) {
      return null;
    }

    target.status = "active";
    target.orderId = input.orderId;
    target.activatedAt = new Date().toISOString();

    await writeDb(db);
    return target;
  });
}

export async function getPaywallSession(
  token: string,
): Promise<PaywallSession | null> {
  const db = await readDb();
  return db.paywallSessions.find((session) => session.token === token) ?? null;
}

export async function hasActivePaywallAccess(
  token: string | undefined,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const session = await getPaywallSession(token);
  return session?.status === "active";
}

export async function upsertStoreInstall(input: {
  shopDomain: string;
  accessToken: string;
  scopes: string;
}): Promise<void> {
  await queueMutation(async () => {
    const db = await readDb();
    const now = new Date().toISOString();

    const existing = db.storeInstalls.find(
      (install) => install.shopDomain === input.shopDomain,
    );

    if (existing) {
      existing.accessToken = input.accessToken;
      existing.scopes = input.scopes;
      existing.updatedAt = now;
    } else {
      db.storeInstalls.push({
        shopDomain: input.shopDomain,
        accessToken: input.accessToken,
        scopes: input.scopes,
        installedAt: now,
        updatedAt: now,
      });
    }

    await writeDb(db);
  });
}

export async function recordAbandonedCart(input: {
  shopDomain: string;
  cartToken: string;
  email: string;
  customerName: string;
  currency: string;
  subtotal: number;
  items: CartItem[];
  browsingSignals: string[];
}): Promise<AbandonedCartRecord> {
  const record: AbandonedCartRecord = {
    id: randomBytes(16).toString("hex"),
    shopDomain: input.shopDomain,
    cartToken: input.cartToken,
    email: input.email.toLowerCase(),
    customerName: input.customerName,
    currency: input.currency,
    subtotal: input.subtotal,
    items: input.items,
    browsingSignals: input.browsingSignals,
    status: "abandoned",
    variants: [],
    assignedVariant: null,
    emailMessageId: null,
    abandonedAt: new Date().toISOString(),
    emailedAt: null,
    convertedAt: null,
    recoveredRevenue: 0,
  };

  await queueMutation(async () => {
    const db = await readDb();
    db.abandonedCarts.push(record);
    await writeDb(db);
  });

  return record;
}

export async function saveEmailVariants(input: {
  cartId: string;
  variants: EmailVariant[];
  assignedVariant: VariantId;
}): Promise<AbandonedCartRecord | null> {
  return queueMutation(async () => {
    const db = await readDb();
    const cart = db.abandonedCarts.find((item) => item.id === input.cartId);

    if (!cart) {
      return null;
    }

    cart.variants = input.variants;
    cart.assignedVariant = input.assignedVariant;

    await writeDb(db);
    return cart;
  });
}

export async function markCartEmailed(input: {
  cartId: string;
  emailMessageId?: string;
}): Promise<void> {
  await queueMutation(async () => {
    const db = await readDb();
    const cart = db.abandonedCarts.find((item) => item.id === input.cartId);

    if (!cart) {
      return;
    }

    cart.status = "emailed";
    cart.emailMessageId = input.emailMessageId ?? null;
    cart.emailedAt = new Date().toISOString();

    await writeDb(db);
  });
}

export async function markCartConverted(input: {
  shopDomain: string;
  cartToken?: string;
  email?: string;
  orderValue?: number;
}): Promise<void> {
  await queueMutation(async () => {
    const db = await readDb();

    const cart = db.abandonedCarts
      .filter((item) => item.shopDomain === input.shopDomain)
      .sort((a, b) => (a.abandonedAt > b.abandonedAt ? -1 : 1))
      .find((item) => {
        if (input.cartToken && item.cartToken === input.cartToken) {
          return true;
        }

        if (input.email && item.email === input.email.toLowerCase()) {
          return true;
        }

        return false;
      });

    if (!cart) {
      return;
    }

    cart.status = "converted";
    cart.convertedAt = new Date().toISOString();
    cart.recoveredRevenue = input.orderValue ?? cart.subtotal;

    await writeDb(db);
  });
}

export async function listRecentAbandonedCarts(
  limit = 20,
): Promise<AbandonedCartRecord[]> {
  const db = await readDb();
  return db.abandonedCarts
    .sort((a, b) => (a.abandonedAt > b.abandonedAt ? -1 : 1))
    .slice(0, limit);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await readDb();
  const carts = db.abandonedCarts;

  const totalAbandoned = carts.length;
  const emailsSent = carts.filter((cart) => cart.status !== "abandoned").length;
  const converted = carts.filter((cart) => cart.status === "converted").length;
  const recoveredRevenue = carts.reduce(
    (sum, cart) => sum + (cart.recoveredRevenue || 0),
    0,
  );
  const averageCartValue =
    totalAbandoned === 0
      ? 0
      : carts.reduce((sum, cart) => sum + cart.subtotal, 0) / totalAbandoned;
  const conversionRate = emailsSent === 0 ? 0 : (converted / emailsSent) * 100;

  const variantStats: DashboardStats["variantStats"] = (["A", "B"] as const).map(
    (variant) => {
      const sent = carts.filter((cart) => cart.assignedVariant === variant).length;
      const won = carts.filter(
        (cart) =>
          cart.assignedVariant === variant && cart.status === "converted",
      ).length;

      return {
        variant,
        sent,
        converted: won,
        conversionRate: sent === 0 ? 0 : (won / sent) * 100,
      };
    },
  );

  const timelineMap = new Map<
    string,
    { sent: number; converted: number; revenue: number }
  >();

  carts.forEach((cart) => {
    if (!cart.emailedAt) {
      return;
    }

    const day = cart.emailedAt.slice(5, 10);
    const previous = timelineMap.get(day) ?? { sent: 0, converted: 0, revenue: 0 };
    previous.sent += 1;

    if (cart.status === "converted") {
      previous.converted += 1;
      previous.revenue += cart.recoveredRevenue;
    }

    timelineMap.set(day, previous);
  });

  const timeline = [...timelineMap.entries()]
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .slice(-14)
    .map(([day, value]) => ({ day, ...value }));

  return {
    totalAbandoned,
    emailsSent,
    converted,
    recoveredRevenue,
    averageCartValue,
    conversionRate,
    variantStats,
    timeline,
  };
}
