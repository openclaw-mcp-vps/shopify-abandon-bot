import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type CartLineItem = {
  productId?: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
};

export type EmailVariant = {
  subject: string;
  body: string;
};

export type CampaignRecord = {
  id: string;
  storeDomain: string;
  customerEmail: string;
  customerName?: string;
  source: "shopify-webhook" | "manual";
  cartValue: number;
  currency: string;
  lineItems: CartLineItem[];
  browsingSignals: string[];
  variantA: EmailVariant;
  variantB: EmailVariant;
  sentVariant: "A" | "B";
  emailProviderId?: string;
  status: "queued" | "sent" | "failed";
  metrics: {
    opened: boolean;
    clicked: boolean;
    converted: boolean;
    recoveredRevenue: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type StoreRecord = {
  id: string;
  shopDomain: string;
  accessToken?: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  provider: "stripe" | "lemonsqueezy";
  customerEmail: string;
  active: boolean;
  storeLimit: number;
  referenceId: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
};

export type WebhookEventRecord = {
  id: string;
  provider: "shopify" | "stripe" | "lemonsqueezy";
  topic: string;
  payload: Record<string, unknown>;
  receivedAt: string;
};

type DatabaseSchema = {
  stores: StoreRecord[];
  campaigns: CampaignRecord[];
  payments: PaymentRecord[];
  webhookEvents: WebhookEventRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app-db.json");

function initialData(): DatabaseSchema {
  return {
    stores: [],
    campaigns: [],
    payments: [],
    webhookEvents: []
  };
}

function ensureDbFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(initialData(), null, 2), "utf8");
  }
}

function readDb(): DatabaseSchema {
  ensureDbFile();

  const raw = readFileSync(DB_FILE, "utf8");
  const parsed = JSON.parse(raw) as DatabaseSchema;

  return {
    stores: parsed.stores ?? [],
    campaigns: parsed.campaigns ?? [],
    payments: parsed.payments ?? [],
    webhookEvents: parsed.webhookEvents ?? []
  };
}

function writeDb(next: DatabaseSchema) {
  ensureDbFile();
  writeFileSync(DB_FILE, JSON.stringify(next, null, 2), "utf8");
}

export function logWebhookEvent(
  provider: WebhookEventRecord["provider"],
  topic: string,
  payload: Record<string, unknown>
) {
  const db = readDb();
  db.webhookEvents.unshift({
    id: crypto.randomUUID(),
    provider,
    topic,
    payload,
    receivedAt: new Date().toISOString()
  });

  db.webhookEvents = db.webhookEvents.slice(0, 1000);
  writeDb(db);
}

export function upsertStore(input: {
  shopDomain: string;
  accessToken?: string;
  ownerEmail?: string;
}) {
  const db = readDb();
  const now = new Date().toISOString();

  const existing = db.stores.find((store) => store.shopDomain === input.shopDomain);

  if (existing) {
    existing.updatedAt = now;
    if (input.accessToken) {
      existing.accessToken = input.accessToken;
    }
    if (input.ownerEmail) {
      existing.ownerEmail = input.ownerEmail;
    }

    writeDb(db);
    return existing;
  }

  const created: StoreRecord = {
    id: crypto.randomUUID(),
    shopDomain: input.shopDomain,
    accessToken: input.accessToken,
    ownerEmail: input.ownerEmail,
    createdAt: now,
    updatedAt: now
  };

  db.stores.unshift(created);
  writeDb(db);
  return created;
}

export function getStoreByDomain(shopDomain: string) {
  const db = readDb();
  return db.stores.find((store) => store.shopDomain === shopDomain) ?? null;
}

export function saveCampaign(
  campaign: Omit<CampaignRecord, "id" | "createdAt" | "updatedAt">
) {
  const db = readDb();
  const now = new Date().toISOString();

  const created: CampaignRecord = {
    ...campaign,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };

  db.campaigns.unshift(created);
  writeDb(db);
  return created;
}

export function updateCampaign(
  campaignId: string,
  updates: Partial<
    Pick<CampaignRecord, "status" | "emailProviderId" | "metrics" | "sentVariant">
  >
) {
  const db = readDb();
  const campaign = db.campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    return null;
  }

  if (updates.status) {
    campaign.status = updates.status;
  }

  if (updates.emailProviderId) {
    campaign.emailProviderId = updates.emailProviderId;
  }

  if (updates.sentVariant) {
    campaign.sentVariant = updates.sentVariant;
  }

  if (updates.metrics) {
    campaign.metrics = updates.metrics;
  }

  campaign.updatedAt = new Date().toISOString();
  writeDb(db);
  return campaign;
}

export function getCampaigns(options?: { storeDomain?: string; limit?: number }) {
  const db = readDb();

  let rows = db.campaigns;
  if (options?.storeDomain) {
    rows = rows.filter((item) => item.storeDomain === options.storeDomain);
  }

  if (options?.limit) {
    rows = rows.slice(0, options.limit);
  }

  return rows;
}

export function getDashboardMetrics(storeDomain?: string) {
  const campaigns = getCampaigns({ storeDomain });

  const total = campaigns.length;
  const sent = campaigns.filter((item) => item.status === "sent").length;
  const opened = campaigns.filter((item) => item.metrics.opened).length;
  const clicked = campaigns.filter((item) => item.metrics.clicked).length;
  const converted = campaigns.filter((item) => item.metrics.converted).length;
  const recoveredRevenue = campaigns.reduce(
    (sum, item) => sum + item.metrics.recoveredRevenue,
    0
  );

  return {
    totalCampaigns: total,
    sentCampaigns: sent,
    openRate: sent > 0 ? opened / sent : 0,
    clickRate: sent > 0 ? clicked / sent : 0,
    conversionRate: sent > 0 ? converted / sent : 0,
    recoveredRevenue
  };
}

export function upsertPayment(input: {
  provider: PaymentRecord["provider"];
  customerEmail: string;
  active: boolean;
  storeLimit: number;
  referenceId: string;
  metadata?: Record<string, string | number | boolean>;
}) {
  const db = readDb();
  const now = new Date().toISOString();
  const normalizedEmail = input.customerEmail.toLowerCase();

  if (!input.active) {
    for (const payment of db.payments) {
      if (
        payment.provider === input.provider &&
        payment.customerEmail === normalizedEmail &&
        payment.active
      ) {
        payment.active = false;
        payment.updatedAt = now;
      }
    }
  }

  const existing = db.payments.find(
    (payment) =>
      payment.provider === input.provider && payment.referenceId === input.referenceId
  );

  if (existing) {
    existing.customerEmail = normalizedEmail;
    existing.active = input.active;
    existing.storeLimit = input.storeLimit;
    existing.metadata = input.metadata;
    existing.updatedAt = now;
    writeDb(db);
    return existing;
  }

  const created: PaymentRecord = {
    id: crypto.randomUUID(),
    provider: input.provider,
    customerEmail: normalizedEmail,
    active: input.active,
    storeLimit: input.storeLimit,
    referenceId: input.referenceId,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now
  };

  db.payments.unshift(created);
  writeDb(db);
  return created;
}

export function getActivePaymentByEmail(email: string) {
  const db = readDb();
  return (
    db.payments.find(
      (payment) => payment.customerEmail === email.toLowerCase() && payment.active
    ) ?? null
  );
}
