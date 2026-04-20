import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type CartItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  variant?: string;
  productUrl?: string;
};

export type BrowseEvent = {
  path: string;
  title?: string;
  category?: string;
  secondsOnPage?: number;
};

export type DashboardSummary = {
  abandonedCarts: number;
  emailsSent: number;
  recoveredOrders: number;
  recoveredRevenue: number;
  conversionRate: number;
  estimatedUplift: number;
};

export type DashboardSeriesPoint = {
  day: string;
  sent: number;
  recovered: number;
  revenue: number;
};

export type VariantMetrics = {
  variant: "A" | "B";
  sent: number;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
};

export type EmailPreview = {
  id: number;
  customerEmail: string;
  customerName: string | null;
  shopDomain: string;
  cartTotal: number;
  currency: string;
  variant: "A" | "B";
  subject: string;
  body: string;
  sentAt: string;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(dataDir, "shopify-abandon-bot.db");

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    installed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    order_id TEXT,
    status TEXT NOT NULL,
    plan_name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT NOT NULL,
    cart_token TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    total_price REAL NOT NULL,
    currency TEXT NOT NULL,
    items_json TEXT NOT NULL,
    browse_json TEXT NOT NULL,
    abandoned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recovered_order_value REAL NOT NULL DEFAULT 0,
    UNIQUE(shop_domain, cart_token)
  );

  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    provider_message_id TEXT,
    sent_at TEXT,
    opens INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    revenue REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, variant),
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_carts_shop_domain ON carts(shop_domain);
  CREATE INDEX IF NOT EXISTS idx_emails_cart_id ON emails(cart_id);
  CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
`);

export function upsertStoreAuth(input: { shopDomain: string; accessToken: string }) {
  const normalizedShop = input.shopDomain.toLowerCase();
  db.prepare(
    `
      INSERT INTO stores (shop_domain, access_token)
      VALUES (?, ?)
      ON CONFLICT(shop_domain)
      DO UPDATE SET
        access_token = excluded.access_token,
        updated_at = CURRENT_TIMESTAMP
    `
  ).run(normalizedShop, input.accessToken);
}

export function createOrUpdateCart(input: {
  shopDomain: string;
  cartToken: string;
  customerEmail: string;
  customerName?: string;
  totalPrice: number;
  currency: string;
  items: CartItem[];
  browseHistory: BrowseEvent[];
}) {
  const normalizedShop = input.shopDomain.toLowerCase();
  const normalizedEmail = input.customerEmail.toLowerCase();
  const existing = db
    .prepare(
      `
        SELECT id
        FROM carts
        WHERE shop_domain = ? AND cart_token = ?
      `
    )
    .get(normalizedShop, input.cartToken) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `
        UPDATE carts
        SET customer_email = ?,
            customer_name = ?,
            total_price = ?,
            currency = ?,
            items_json = ?,
            browse_json = ?,
            abandoned_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    ).run(
      normalizedEmail,
      input.customerName ?? null,
      input.totalPrice,
      input.currency,
      JSON.stringify(input.items),
      JSON.stringify(input.browseHistory),
      existing.id
    );

    return { cartId: existing.id, isNew: false };
  }

  const insertResult = db
    .prepare(
      `
        INSERT INTO carts (
          shop_domain,
          cart_token,
          customer_email,
          customer_name,
          total_price,
          currency,
          items_json,
          browse_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      normalizedShop,
      input.cartToken,
      normalizedEmail,
      input.customerName ?? null,
      input.totalPrice,
      input.currency,
      JSON.stringify(input.items),
      JSON.stringify(input.browseHistory)
    );

  return { cartId: Number(insertResult.lastInsertRowid), isNew: true };
}

export function hasSentEmailForCart(cartId: number) {
  const row = db
    .prepare(
      `
        SELECT id
        FROM emails
        WHERE cart_id = ? AND sent_at IS NOT NULL
        LIMIT 1
      `
    )
    .get(cartId) as { id: number } | undefined;

  return Boolean(row);
}

export function saveGeneratedEmailVariant(input: {
  cartId: number;
  variant: "A" | "B";
  subject: string;
  body: string;
}) {
  db.prepare(
    `
      INSERT INTO emails (cart_id, variant, subject, body)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cart_id, variant)
      DO UPDATE SET
        subject = excluded.subject,
        body = excluded.body,
        created_at = CURRENT_TIMESTAMP
    `
  ).run(input.cartId, input.variant, input.subject, input.body);

  const row = db
    .prepare(
      `
        SELECT id
        FROM emails
        WHERE cart_id = ? AND variant = ?
      `
    )
    .get(input.cartId, input.variant) as { id: number };

  return row.id;
}

export function getEmailById(emailId: number) {
  return db
    .prepare(
      `
        SELECT
          e.id,
          e.variant,
          e.subject,
          e.body,
          e.sent_at AS sentAt,
          c.customer_email AS customerEmail,
          c.customer_name AS customerName,
          c.shop_domain AS shopDomain,
          c.total_price AS cartTotal,
          c.currency AS currency
        FROM emails e
        JOIN carts c ON c.id = e.cart_id
        WHERE e.id = ?
      `
    )
    .get(emailId) as
    | {
        id: number;
        variant: "A" | "B";
        subject: string;
        body: string;
        sentAt: string | null;
        customerEmail: string;
        customerName: string | null;
        shopDomain: string;
        cartTotal: number;
        currency: string;
      }
    | undefined;
}

export function markEmailSent(emailId: number, providerMessageId?: string) {
  db.prepare(
    `
      UPDATE emails
      SET sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP),
          provider_message_id = ?
      WHERE id = ?
    `
  ).run(providerMessageId ?? null, emailId);
}

export function recordEmailOpen(emailId: number) {
  db.prepare(
    `
      UPDATE emails
      SET opens = opens + 1
      WHERE id = ?
    `
  ).run(emailId);
}

export function recordEmailClick(emailId: number) {
  db.prepare(
    `
      UPDATE emails
      SET clicks = clicks + 1
      WHERE id = ?
    `
  ).run(emailId);
}

export function recordRecoveredOrder(input: {
  shopDomain: string;
  cartToken: string;
  orderValue: number;
}) {
  const normalizedShop = input.shopDomain.toLowerCase();

  const emailRow = db
    .prepare(
      `
        SELECT e.id
        FROM emails e
        JOIN carts c ON c.id = e.cart_id
        WHERE c.shop_domain = ?
          AND c.cart_token = ?
          AND e.sent_at IS NOT NULL
        ORDER BY e.sent_at DESC
        LIMIT 1
      `
    )
    .get(normalizedShop, input.cartToken) as { id: number } | undefined;

  if (!emailRow) {
    return false;
  }

  db.prepare(
    `
      UPDATE emails
      SET conversions = conversions + 1,
          revenue = revenue + ?,
          clicks = clicks + 1,
          opens = opens + 1
      WHERE id = ?
    `
  ).run(input.orderValue, emailRow.id);

  db.prepare(
    `
      UPDATE carts
      SET recovered_order_value = recovered_order_value + ?
      WHERE shop_domain = ? AND cart_token = ?
    `
  ).run(input.orderValue, normalizedShop, input.cartToken);

  return true;
}

export function recordLemonPurchase(input: {
  email: string;
  orderId?: string;
  status: "active" | "cancelled" | "refunded";
  planName?: string;
}) {
  const normalizedEmail = input.email.toLowerCase();

  db.prepare(
    `
      INSERT INTO purchases (email, order_id, status, plan_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email)
      DO UPDATE SET
        order_id = excluded.order_id,
        status = excluded.status,
        plan_name = excluded.plan_name,
        updated_at = CURRENT_TIMESTAMP
    `
  ).run(normalizedEmail, input.orderId ?? null, input.status, input.planName ?? null);
}

export function hasActivePurchase(email: string) {
  const normalizedEmail = email.toLowerCase();
  const row = db
    .prepare(
      `
        SELECT status
        FROM purchases
        WHERE email = ?
      `
    )
    .get(normalizedEmail) as { status: string } | undefined;

  return row?.status === "active";
}

export function getDashboardSnapshot() {
  const summaryRow = db
    .prepare(
      `
        SELECT
          COUNT(DISTINCT c.id) AS abandonedCarts,
          COALESCE(SUM(CASE WHEN e.sent_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS emailsSent,
          COALESCE(SUM(e.conversions), 0) AS recoveredOrders,
          COALESCE(SUM(e.revenue), 0) AS recoveredRevenue
        FROM carts c
        LEFT JOIN emails e ON e.cart_id = c.id
      `
    )
    .get() as {
    abandonedCarts: number;
    emailsSent: number;
    recoveredOrders: number;
    recoveredRevenue: number;
  };

  const conversionRate =
    summaryRow.emailsSent > 0 ? (summaryRow.recoveredOrders / summaryRow.emailsSent) * 100 : 0;

  const estimatedUplift = Math.max(conversionRate - 10, 0);

  const summary: DashboardSummary = {
    abandonedCarts: summaryRow.abandonedCarts ?? 0,
    emailsSent: summaryRow.emailsSent ?? 0,
    recoveredOrders: summaryRow.recoveredOrders ?? 0,
    recoveredRevenue: summaryRow.recoveredRevenue ?? 0,
    conversionRate,
    estimatedUplift
  };

  const seriesRows = db
    .prepare(
      `
        SELECT
          date(c.abandoned_at) AS day,
          COALESCE(SUM(CASE WHEN e.sent_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS sent,
          COALESCE(SUM(e.conversions), 0) AS recovered,
          COALESCE(SUM(e.revenue), 0) AS revenue
        FROM carts c
        LEFT JOIN emails e ON e.cart_id = c.id
        WHERE c.abandoned_at >= datetime('now', '-13 day')
        GROUP BY day
        ORDER BY day ASC
      `
    )
    .all() as DashboardSeriesPoint[];

  const variantRows = db
    .prepare(
      `
        SELECT
          variant,
          COALESCE(SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS sent,
          COALESCE(SUM(opens), 0) AS opens,
          COALESCE(SUM(clicks), 0) AS clicks,
          COALESCE(SUM(conversions), 0) AS conversions,
          COALESCE(SUM(revenue), 0) AS revenue
        FROM emails
        GROUP BY variant
        ORDER BY variant ASC
      `
    )
    .all() as Array<{
    variant: "A" | "B";
    sent: number;
    opens: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;

  const variants: VariantMetrics[] = (["A", "B"] as const).map((variantLabel) => {
    const row = variantRows.find((entry) => entry.variant === variantLabel);
    const sent = row?.sent ?? 0;
    const opens = row?.opens ?? 0;
    const clicks = row?.clicks ?? 0;
    const conversions = row?.conversions ?? 0;
    const revenue = row?.revenue ?? 0;

    return {
      variant: variantLabel,
      sent,
      opens,
      clicks,
      conversions,
      revenue,
      openRate: sent > 0 ? (opens / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicks / sent) * 100 : 0,
      conversionRate: sent > 0 ? (conversions / sent) * 100 : 0
    };
  });

  const previews = db
    .prepare(
      `
        SELECT
          e.id,
          c.customer_email AS customerEmail,
          c.customer_name AS customerName,
          c.shop_domain AS shopDomain,
          c.total_price AS cartTotal,
          c.currency AS currency,
          e.variant,
          e.subject,
          e.body,
          e.sent_at AS sentAt,
          e.opens,
          e.clicks,
          e.conversions,
          e.revenue
        FROM emails e
        JOIN carts c ON c.id = e.cart_id
        WHERE e.sent_at IS NOT NULL
        ORDER BY e.sent_at DESC
        LIMIT 8
      `
    )
    .all() as EmailPreview[];

  return {
    summary,
    series: seriesRows,
    variants,
    previews
  };
}
