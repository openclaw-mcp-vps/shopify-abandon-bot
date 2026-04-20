import crypto from "node:crypto";

import { calculateLiftFromBaseline, type ABVariant } from "@/lib/ab-testing";
import { readJsonFile, writeJsonFile } from "@/lib/storage";

const ANALYTICS_FILE = "analytics.json";

type AnalyticsStore = {
  events: AnalyticsEmailEvent[];
};

export type AnalyticsEmailEvent = {
  id: string;
  shopDomain: string;
  checkoutId: string;
  customerEmail: string;
  customerFirstName: string;
  cartValue: number;
  variant: ABVariant;
  subject: string;
  body: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  convertedAt?: string;
  revenueRecovered?: number;
};

export type DailyPerformancePoint = {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
};

export type DashboardStats = {
  sentCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  recoveredRevenue: number;
  liftVsShopifyBaseline: number;
  bestVariant: ABVariant | "-";
  dailyPerformance: DailyPerformancePoint[];
};

const EMPTY_STORE: AnalyticsStore = { events: [] };

function toPercent(count: number, total: number): number {
  if (!total) {
    return 0;
  }

  return (count / total) * 100;
}

function round(value: number, precision = 1): number {
  const p = 10 ** precision;
  return Math.round(value * p) / p;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createSeriesWindow(days: number): DailyPerformancePoint[] {
  const points: DailyPerformancePoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    points.push({
      date: toISODate(date),
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
    });
  }

  return points;
}

async function readStore(): Promise<AnalyticsStore> {
  return readJsonFile<AnalyticsStore>(ANALYTICS_FILE, EMPTY_STORE);
}

async function writeStore(store: AnalyticsStore): Promise<void> {
  await writeJsonFile(ANALYTICS_FILE, store);
}

export async function recordEmailSent(
  event: Omit<AnalyticsEmailEvent, "id" | "sentAt"> & {
    id?: string;
    sentAt?: string;
  }
): Promise<AnalyticsEmailEvent> {
  const store = await readStore();

  const entry: AnalyticsEmailEvent = {
    ...event,
    id: event.id ?? crypto.randomUUID(),
    sentAt: event.sentAt ?? new Date().toISOString(),
  };

  store.events.push(entry);
  await writeStore(store);

  return entry;
}

export async function markEmailInteraction(input: {
  checkoutId: string;
  opened?: boolean;
  clicked?: boolean;
  converted?: boolean;
  revenueRecovered?: number;
}) {
  const store = await readStore();
  const index = store.events.findIndex((event) => event.checkoutId === input.checkoutId);

  if (index === -1) {
    return null;
  }

  const now = new Date().toISOString();
  const event = store.events[index];

  if (input.opened && !event.openedAt) {
    event.openedAt = now;
  }

  if (input.clicked && !event.clickedAt) {
    event.clickedAt = now;
  }

  if (input.converted && !event.convertedAt) {
    event.convertedAt = now;
  }

  if (input.revenueRecovered && input.revenueRecovered > 0) {
    event.revenueRecovered = input.revenueRecovered;
  }

  store.events[index] = event;
  await writeStore(store);

  return event;
}

export async function getDashboardStats(shopDomain?: string): Promise<DashboardStats> {
  const store = await readStore();
  const events =
    shopDomain && shopDomain.length > 0
      ? store.events.filter((event) => event.shopDomain === shopDomain)
      : store.events;

  const sentCount = events.length;
  const openedCount = events.filter((event) => Boolean(event.openedAt)).length;
  const clickedCount = events.filter((event) => Boolean(event.clickedAt)).length;
  const convertedCount = events.filter((event) => Boolean(event.convertedAt)).length;
  const recoveredRevenue = events.reduce(
    (sum, event) => sum + (event.revenueRecovered ?? 0),
    0
  );

  const byVariant = new Map<ABVariant, { sent: number; converted: number }>();
  byVariant.set("A", { sent: 0, converted: 0 });
  byVariant.set("B", { sent: 0, converted: 0 });

  const performance = createSeriesWindow(14);
  const performanceIndex = new Map(performance.map((point, index) => [point.date, index]));

  for (const event of events) {
    const variantStats = byVariant.get(event.variant);
    if (variantStats) {
      variantStats.sent += 1;
      if (event.convertedAt) {
        variantStats.converted += 1;
      }
    }

    const day = event.sentAt.slice(0, 10);
    const dayIndex = performanceIndex.get(day);
    if (typeof dayIndex === "number") {
      performance[dayIndex].sent += 1;
      if (event.openedAt) {
        performance[dayIndex].opened += 1;
      }
      if (event.clickedAt) {
        performance[dayIndex].clicked += 1;
      }
      if (event.convertedAt) {
        performance[dayIndex].converted += 1;
      }
    }
  }

  const variantA = byVariant.get("A") ?? { sent: 0, converted: 0 };
  const variantB = byVariant.get("B") ?? { sent: 0, converted: 0 };
  const variantAConv = variantA.sent ? variantA.converted / variantA.sent : 0;
  const variantBConv = variantB.sent ? variantB.converted / variantB.sent : 0;

  let bestVariant: ABVariant | "-" = "-";
  if (variantA.sent > 0 || variantB.sent > 0) {
    bestVariant = variantAConv >= variantBConv ? "A" : "B";
  }

  const conversionRate = toPercent(convertedCount, sentCount);

  return {
    sentCount,
    openRate: round(toPercent(openedCount, sentCount)),
    clickRate: round(toPercent(clickedCount, sentCount)),
    conversionRate: round(conversionRate),
    recoveredRevenue: round(recoveredRevenue, 2),
    liftVsShopifyBaseline: round(calculateLiftFromBaseline(conversionRate / 100)),
    bestVariant,
    dailyPerformance: performance,
  };
}

export async function getRecentGeneratedTemplates(
  shopDomain?: string,
  limit = 6
): Promise<AnalyticsEmailEvent[]> {
  const store = await readStore();
  const filtered = shopDomain
    ? store.events.filter((event) => event.shopDomain === shopDomain)
    : store.events;

  return filtered
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, limit);
}
