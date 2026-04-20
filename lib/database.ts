import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type {
  AppDatabase,
  Campaign,
  CampaignSummary,
  PaymentRecord,
  StoreConnection,
  WebhookEvent
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const defaultDb: AppDatabase = {
  stores: [],
  campaigns: [],
  payments: [],
  webhookEvents: []
};

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultDb, null, 2), "utf8");
  }
}

async function readDb(): Promise<AppDatabase> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppDatabase>;

  return {
    stores: parsed.stores ?? [],
    campaigns: parsed.campaigns ?? [],
    payments: parsed.payments ?? [],
    webhookEvents: parsed.webhookEvents ?? []
  };
}

async function writeDb(nextDb: AppDatabase): Promise<void> {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(nextDb, null, 2), "utf8");
}

async function withWriteLock<T>(operation: (current: AppDatabase) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    writeQueue = writeQueue
      .then(async () => {
        const current = await readDb();
        const result = await operation(current);
        await writeDb(current);
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export async function upsertStore(input: {
  storeDomain: string;
  accessToken: string;
  senderEmail: string;
}): Promise<StoreConnection> {
  return withWriteLock((current) => {
    const existingIndex = current.stores.findIndex((store) => store.storeDomain === input.storeDomain);

    const nextStore: StoreConnection = {
      id: existingIndex >= 0 ? current.stores[existingIndex].id : randomUUID(),
      storeDomain: input.storeDomain,
      accessToken: input.accessToken,
      senderEmail: input.senderEmail,
      installedAt: existingIndex >= 0 ? current.stores[existingIndex].installedAt : new Date().toISOString(),
      active: true
    };

    if (existingIndex >= 0) {
      current.stores[existingIndex] = nextStore;
    } else {
      current.stores.push(nextStore);
    }

    return nextStore;
  });
}

export async function getStoreByDomain(storeDomain: string): Promise<StoreConnection | null> {
  const db = await readDb();
  return db.stores.find((store) => store.storeDomain === storeDomain && store.active) ?? null;
}

export async function listStores(): Promise<StoreConnection[]> {
  const db = await readDb();
  return db.stores;
}

export async function createCampaign(campaign: Omit<Campaign, "id">): Promise<Campaign> {
  return withWriteLock((current) => {
    const nextCampaign: Campaign = {
      ...campaign,
      id: randomUUID()
    };

    current.campaigns.push(nextCampaign);
    return nextCampaign;
  });
}

export async function listCampaigns(storeDomain?: string): Promise<Campaign[]> {
  const db = await readDb();
  const filtered = storeDomain
    ? db.campaigns.filter((campaign) => campaign.storeDomain === storeDomain)
    : db.campaigns;

  return filtered.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

export async function updateCampaign(
  campaignId: string,
  updater: (campaign: Campaign) => Campaign
): Promise<Campaign | null> {
  return withWriteLock((current) => {
    const index = current.campaigns.findIndex((campaign) => campaign.id === campaignId);
    if (index === -1) {
      return null;
    }

    current.campaigns[index] = updater(current.campaigns[index]);
    return current.campaigns[index];
  });
}

export async function findCampaignByCheckoutId(checkoutId: string): Promise<Campaign | null> {
  const db = await readDb();
  return db.campaigns.find((campaign) => campaign.checkoutId === checkoutId) ?? null;
}

export function summarizeCampaigns(campaigns: Campaign[]): CampaignSummary {
  const sentCampaigns = campaigns.filter((campaign) => ["sent", "opened", "converted"].includes(campaign.status));
  const convertedCampaigns = campaigns.filter((campaign) => campaign.status === "converted");

  const variantA = sentCampaigns.filter((campaign) => campaign.assignedVariant === "A");
  const variantB = sentCampaigns.filter((campaign) => campaign.assignedVariant === "B");
  const variantAConverted = variantA.filter((campaign) => campaign.status === "converted").length;
  const variantBConverted = variantB.filter((campaign) => campaign.status === "converted").length;

  const totalRecoveredRevenue = convertedCampaigns.reduce((sum, campaign) => sum + campaign.recoveredRevenue, 0);

  return {
    totalCampaigns: campaigns.length,
    totalSent: sentCampaigns.length,
    totalConverted: convertedCampaigns.length,
    totalRecoveredRevenue,
    conversionRate: sentCampaigns.length === 0 ? 0 : (convertedCampaigns.length / sentCampaigns.length) * 100,
    variantAConversionRate: variantA.length === 0 ? 0 : (variantAConverted / variantA.length) * 100,
    variantBConversionRate: variantB.length === 0 ? 0 : (variantBConverted / variantB.length) * 100
  };
}

export async function recordPayment(input: {
  orderId: string;
  email: string;
  plan: "starter" | "growth";
  storeLimit: number;
}): Promise<PaymentRecord> {
  return withWriteLock((current) => {
    const existing = current.payments.find((payment) => payment.orderId === input.orderId);
    if (existing) {
      return existing;
    }

    const payment: PaymentRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      email: input.email.toLowerCase(),
      plan: input.plan,
      storeLimit: input.storeLimit,
      createdAt: new Date().toISOString()
    };

    current.payments.push(payment);
    return payment;
  });
}

export async function findPayment(orderId: string, email: string): Promise<PaymentRecord | null> {
  const db = await readDb();
  return (
    db.payments.find(
      (payment) => payment.orderId.toLowerCase() === orderId.toLowerCase() && payment.email === email.toLowerCase()
    ) ?? null
  );
}

export async function markPaymentVerified(paymentId: string): Promise<PaymentRecord | null> {
  return withWriteLock((current) => {
    const index = current.payments.findIndex((payment) => payment.id === paymentId);
    if (index === -1) {
      return null;
    }

    const existing = current.payments[index];
    current.payments[index] = {
      ...existing,
      verifiedAt: new Date().toISOString()
    };

    return current.payments[index];
  });
}

export async function recordWebhookEvent(input: {
  source: "shopify" | "lemonsqueezy";
  topic: string;
  rawPayload: string;
}): Promise<WebhookEvent> {
  return withWriteLock((current) => {
    const payloadHash = createHash("sha256").update(input.rawPayload).digest("hex");

    const event: WebhookEvent = {
      id: randomUUID(),
      source: input.source,
      topic: input.topic,
      payloadHash,
      receivedAt: new Date().toISOString()
    };

    current.webhookEvents.push(event);

    if (current.webhookEvents.length > 1000) {
      current.webhookEvents = current.webhookEvents.slice(-1000);
    }

    return event;
  });
}
