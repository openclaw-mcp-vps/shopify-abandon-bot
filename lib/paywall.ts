import crypto from "node:crypto";

import { z } from "zod";

import { readJsonFile, writeJsonFile } from "@/lib/storage";

const SUBSCRIPTIONS_FILE = "subscriptions.json";

const subscriptionRecordSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(["active", "cancelled", "past_due"]),
  plan: z.enum(["single-store", "multi-store"]),
  storesAllowed: z.number().int().positive(),
  lemonOrderId: z.string().optional(),
  lemonSubscriptionId: z.string().optional(),
  shopDomain: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SubscriptionRecord = z.infer<typeof subscriptionRecordSchema>;

type SubscriptionsStore = {
  subscriptions: SubscriptionRecord[];
};

const EMPTY_STORE: SubscriptionsStore = { subscriptions: [] };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readSubscriptions(): Promise<SubscriptionsStore> {
  return readJsonFile<SubscriptionsStore>(SUBSCRIPTIONS_FILE, EMPTY_STORE);
}

async function writeSubscriptions(store: SubscriptionsStore) {
  await writeJsonFile(SUBSCRIPTIONS_FILE, store);
}

export async function upsertSubscription(
  input: Omit<SubscriptionRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<SubscriptionRecord> {
  const store = await readSubscriptions();
  const normalizedEmail = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const existingIndex = store.subscriptions.findIndex(
    (subscription) =>
      subscription.email === normalizedEmail ||
      (input.lemonSubscriptionId &&
        subscription.lemonSubscriptionId === input.lemonSubscriptionId)
  );

  if (existingIndex >= 0) {
    const updated: SubscriptionRecord = {
      ...store.subscriptions[existingIndex],
      ...input,
      email: normalizedEmail,
      updatedAt: input.updatedAt ?? now,
    };

    const validated = subscriptionRecordSchema.parse(updated);
    store.subscriptions[existingIndex] = validated;
    await writeSubscriptions(store);
    return validated;
  }

  const created: SubscriptionRecord = subscriptionRecordSchema.parse({
    ...input,
    email: normalizedEmail,
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });

  store.subscriptions.push(created);
  await writeSubscriptions(store);
  return created;
}

export async function findActiveSubscriptionByEmail(
  email: string
): Promise<SubscriptionRecord | null> {
  const store = await readSubscriptions();
  const normalizedEmail = normalizeEmail(email);

  const subscription = store.subscriptions
    .filter((item) => item.email === normalizedEmail)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!subscription) {
    return null;
  }

  return subscription.status === "active" ? subscription : null;
}

export async function hasActiveAccess(email: string): Promise<boolean> {
  const subscription = await findActiveSubscriptionByEmail(email);
  return Boolean(subscription);
}
