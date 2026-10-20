export type LinkStatus = 'VERIFIED' | 'CODE_ONLY' | 'UNKNOWN';
export type OfferStatus = 'UNVERIFIED' | 'VERIFIED' | 'EXPIRED';

export interface Recommendation {
  id: string;
  name: string;
  category: string;
  shortDescription: string;
  logo?: string;
  code?: string;
  referralUrl?: string;
  enabled: boolean;
  disclosure: string;
  sortOrder: number;
  lastVerifiedAt: string;
  providedAt?: string;
  linkCheckedAt?: string | null;
  linkStatus?: LinkStatus;
  offerCheckedAt?: string | null;
  offerStatus?: OfferStatus;
  offerText?: string;
  offerExpiresAt?: string;
}

export interface RecommendationFile {
  items: unknown[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LOGO_PATH_PATTERN = /^\/logos\/[a-z0-9-]+\.(png|svg)$/i;
const VALID_LINK_STATUS = new Set<LinkStatus>(['VERIFIED', 'CODE_ONLY', 'UNKNOWN']);
const VALID_OFFER_STATUS = new Set<OfferStatus>(['UNVERIFIED', 'VERIFIED', 'EXPIRED']);

/**
 * Only explicitly verified official domains or verified referral share domains are allowed
 * in production referral URLs.
 */
export const ALLOWED_REFERRAL_HOSTNAMES = new Set<string>([
  'www.linebank.com.tw',
  'newnewbank.ubot.com.tw',
  'www.bankee.tw',
  'richart.tw',
  'ebank.nextbank.com.tw',
  'www.rakuten-bank.com.tw',
  'www.sinotrade.com.tw',
  'www.bitopro.com',
  'max.maicoin.com',
  'www.binance.com',
  'www.bybit.com',
  'partner.bybit.com',
  'crypto.com',
  'okx.com',
  'www.okx.com',
  'share.bitget.com',
  'www.bitget.com',
  'url.hk',
  'wap.redotpay.com',
  'hoyabit.com',
  'www.ether.fi',
]);

function str(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max ? value.trim() : undefined;
}

/** Only absolute https URLs are accepted; javascript:, data: and others are rejected. */
export function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export function isAllowedReferralHostname(value: string): boolean {
  try {
    const url = new URL(value);
    return ALLOWED_REFERRAL_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function validateNullableDate(value: unknown, where: string, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${where}.${field} 必須為 YYYY-MM-DD 或 null`);
  }
  return value;
}

/** Validate raw JSON content. Throws a descriptive error for malformed data so builds fail loudly. */
export function validateRecommendations(file: unknown): Recommendation[] {
  if (typeof file !== 'object' || file === null || !Array.isArray((file as RecommendationFile).items)) {
    throw new Error('recommendations.json 必須包含 items 陣列');
  }
  const seen = new Set<string>();
  return (file as RecommendationFile).items.map((raw, index) => {
    const where = `recommendations.json items[${index}]`;
    if (typeof raw !== 'object' || raw === null) throw new Error(`${where} 必須為物件`);
    const r = raw as Record<string, unknown>;
    const id = str(r.id, 64);
    if (!id || !ID_PATTERN.test(id)) throw new Error(`${where}.id 無效`);
    if (seen.has(id)) throw new Error(`${where}.id 重複：${id}`);
    seen.add(id);
    const name = str(r.name, 80);
    const category = str(r.category, 40);
    const shortDescription = str(r.shortDescription, 300);
    const disclosure = str(r.disclosure, 400);
    if (!name || !category || !shortDescription || !disclosure) {
      throw new Error(`${where} 缺少 name／category／shortDescription／disclosure`);
    }
    if (typeof r.enabled !== 'boolean') throw new Error(`${where}.enabled 必須為布林值`);
    if (typeof r.sortOrder !== 'number' || !Number.isFinite(r.sortOrder)) throw new Error(`${where}.sortOrder 必須為數字`);
    if (typeof r.lastVerifiedAt !== 'string' || !DATE_PATTERN.test(r.lastVerifiedAt)) {
      throw new Error(`${where}.lastVerifiedAt 必須為 YYYY-MM-DD`);
    }
    let logo: string | undefined;
    if (r.logo !== undefined) {
      if (typeof r.logo !== 'string' || !LOGO_PATH_PATTERN.test(r.logo)) {
        throw new Error(`${where}.logo 必須為 /logos/<id>.png 或 .svg 本機路徑`);
      }
      logo = r.logo;
    }

    const providedAt = validateNullableDate(r.providedAt, where, 'providedAt');
    if (providedAt === null) throw new Error(`${where}.providedAt 不可為 null`);
    const linkCheckedAt = validateNullableDate(r.linkCheckedAt, where, 'linkCheckedAt');
    const offerCheckedAt = validateNullableDate(r.offerCheckedAt, where, 'offerCheckedAt');

    let linkStatus: LinkStatus | undefined;
    if (r.linkStatus !== undefined) {
      if (typeof r.linkStatus !== 'string' || !VALID_LINK_STATUS.has(r.linkStatus as LinkStatus)) {
        throw new Error(`${where}.linkStatus 無效`);
      }
      linkStatus = r.linkStatus as LinkStatus;
    }

    let offerStatus: OfferStatus | undefined;
    if (r.offerStatus !== undefined) {
      if (typeof r.offerStatus !== 'string' || !VALID_OFFER_STATUS.has(r.offerStatus as OfferStatus)) {
        throw new Error(`${where}.offerStatus 無效`);
      }
      offerStatus = r.offerStatus as OfferStatus;
    }

    const hasUrl = r.referralUrl !== undefined && r.referralUrl !== null;
    const hasCode = r.code !== undefined && r.code !== null;

    if (hasUrl) {
      if (!isSafeHttpsUrl(r.referralUrl)) {
        throw new Error(`${where}.referralUrl 必須為 HTTPS 網址`);
      }
      if (!isAllowedReferralHostname(r.referralUrl)) {
        throw new Error(`${where}.referralUrl 網域未列於允許清單`);
      }
      if (linkStatus !== 'VERIFIED' && linkStatus !== 'UNKNOWN') {
        throw new Error(`${where}.referralUrl 必須搭配 linkStatus 為 VERIFIED 或 UNKNOWN`);
      }
    } else if (linkStatus === 'VERIFIED') {
      throw new Error(`${where}.linkStatus 為 VERIFIED 時必須提供 referralUrl`);
    }

    if (linkStatus === 'CODE_ONLY') {
      if (hasUrl || !hasCode) {
        throw new Error(`${where}.linkStatus 為 CODE_ONLY 時必須提供 code 且不可包含 referralUrl`);
      }
    }
    if (linkStatus === 'UNKNOWN' && r.enabled) {
      throw new Error(`${where}.linkStatus 為 UNKNOWN 時不可啟用 (enabled 必須為 false)`);
    }

    if (hasCode && !str(r.code, 80)) throw new Error(`${where}.code 無效`);
    if (r.offerExpiresAt !== undefined && (typeof r.offerExpiresAt !== 'string' || !DATE_PATTERN.test(r.offerExpiresAt))) {
      throw new Error(`${where}.offerExpiresAt 必須為 YYYY-MM-DD`);
    }
    if (r.offerText !== undefined) {
      if (!str(r.offerText, 200)) throw new Error(`${where}.offerText 無效`);
      if (offerStatus !== 'VERIFIED') {
        throw new Error(`${where}.offerText 僅允許在 offerStatus 為 VERIFIED 時提供`);
      }
    }

    return {
      id,
      name,
      category,
      shortDescription,
      logo,
      code: !hasCode ? undefined : (r.code as string).trim(),
      referralUrl: !hasUrl ? undefined : (r.referralUrl as string),
      enabled: r.enabled,
      disclosure,
      sortOrder: r.sortOrder,
      lastVerifiedAt: r.lastVerifiedAt,
      providedAt,
      linkCheckedAt,
      linkStatus,
      offerCheckedAt,
      offerStatus,
      offerText: r.offerText as string | undefined,
      offerExpiresAt: r.offerExpiresAt as string | undefined,
    };
  });
}

/**
 * Items shown on the public recommendations overview page (in fixed sortOrder),
 * including enabled items and items whose link status is pending confirmation (UNKNOWN).
 */
export function publicRecommendations(items: Recommendation[]): Recommendation[] {
  return items
    .filter(
      (item) =>
        (item.enabled &&
          ((item.linkStatus === 'VERIFIED' && item.referralUrl !== undefined) ||
            (item.linkStatus === 'CODE_ONLY' && item.code !== undefined))) ||
        item.linkStatus === 'UNKNOWN',
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** Enabled items that have something actionable to show (a code or a verified link), in a fixed order. */
export function activeRecommendations(items: Recommendation[]): Recommendation[] {
  return items
    .filter(
      (item) =>
        item.enabled &&
        ((item.linkStatus === 'VERIFIED' && item.referralUrl !== undefined) ||
          (item.linkStatus === 'CODE_ONLY' && item.code !== undefined)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** Sidebar and mobile drawer show enabled items in fixed sortOrder (default all 17). */
export function sidebarRecommendations(items: Recommendation[], maxCount: number = 17): Recommendation[] {
  return activeRecommendations(items).slice(0, maxCount);
}

/** Whether an item can render an active outbound referral link button. */
export function hasUsableReferralLink(item: Recommendation): boolean {
  return Boolean(item.enabled && item.referralUrl && item.linkStatus === 'VERIFIED');
}

/** An offer is shown only when explicitly verified and while it has not expired (end of the stated day, Asia/Taipei). */
export function isOfferActive(item: Recommendation, now: Date): boolean {
  if (!item.offerText || item.offerStatus !== 'VERIFIED') return false;
  if (!item.offerExpiresAt) return true;
  const end = new Date(`${item.offerExpiresAt}T23:59:59+08:00`);
  return now.getTime() <= end.getTime();
}

export function groupByCategory(items: Recommendation[]): Array<{ category: string; items: Recommendation[] }> {
  const order: string[] = [];
  const map = new Map<string, Recommendation[]>();
  for (const item of items) {
    if (!map.has(item.category)) {
      map.set(item.category, []);
      order.push(item.category);
    }
    map.get(item.category)!.push(item);
  }
  return order.map((category) => ({ category, items: map.get(category)! }));
}
