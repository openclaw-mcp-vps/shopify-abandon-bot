export type CampaignVariantId = "A" | "B";

export interface CartItem {
  productId?: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  productUrl?: string;
}

export interface BrowsingSignal {
  path: string;
  secondsOnPage: number;
  referrer?: string;
  viewedAt: string;
}

export interface EmailVariant {
  id: CampaignVariantId;
  subject: string;
  bodyText: string;
  ctaLabel: string;
}

export interface Campaign {
  id: string;
  storeDomain: string;
  checkoutId: string;
  customerEmail: string;
  customerFirstName?: string;
  cartItems: CartItem[];
  browsingSignals: BrowsingSignal[];
  cartValue: number;
  recoveryUrl: string;
  variants: EmailVariant[];
  assignedVariant: CampaignVariantId;
  status: "queued" | "sent" | "opened" | "converted" | "failed";
  providerMessageId?: string;
  failureReason?: string;
  generatedAt: string;
  sentAt?: string;
  openedAt?: string;
  convertedAt?: string;
  recoveredRevenue: number;
}

export interface StoreConnection {
  id: string;
  storeDomain: string;
  accessToken: string;
  senderEmail: string;
  installedAt: string;
  active: boolean;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  email: string;
  plan: "starter" | "growth";
  storeLimit: number;
  createdAt: string;
  verifiedAt?: string;
}

export interface WebhookEvent {
  id: string;
  source: "shopify" | "lemonsqueezy";
  topic: string;
  receivedAt: string;
  payloadHash: string;
}

export interface AppDatabase {
  stores: StoreConnection[];
  campaigns: Campaign[];
  payments: PaymentRecord[];
  webhookEvents: WebhookEvent[];
}

export interface CampaignSummary {
  totalCampaigns: number;
  totalSent: number;
  totalConverted: number;
  totalRecoveredRevenue: number;
  conversionRate: number;
  variantAConversionRate: number;
  variantBConversionRate: number;
}

export interface AccessPayload {
  orderId: string;
  email: string;
  plan: "starter" | "growth";
  storeLimit: number;
  issuedAt: number;
  exp: number;
}
