export interface Recommendation {
  id: string;
  name: string;
  category: string;
  shortDescription: string;
  code?: string;
  referralUrl?: string;
  enabled: boolean;
  disclosure: string;
  sortOrder: number;
  lastVerifiedAt: string;
  offerText?: string;
  offerExpiresAt?: string;
}

export interface RecommendationFile {
  items: unknown[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

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
    if (r.referralUrl !== undefined && !isSafeHttpsUrl(r.referralUrl)) {
      throw new Error(`${where}.referralUrl 必須為 HTTPS 網址`);
    }
    if (r.code !== undefined && !str(r.code, 80)) throw new Error(`${where}.code 無效`);
    if (r.offerExpiresAt !== undefined && (typeof r.offerExpiresAt !== 'string' || !DATE_PATTERN.test(r.offerExpiresAt))) {
      throw new Error(`${where}.offerExpiresAt 必須為 YYYY-MM-DD`);
    }
    if (r.offerText !== undefined && !str(r.offerText, 200)) throw new Error(`${where}.offerText 無效`);
    return {
      id,
      name,
      category,
      shortDescription,
      code: r.code === undefined ? undefined : (r.code as string).trim(),
      referralUrl: r.referralUrl as string | undefined,
      enabled: r.enabled,
      disclosure,
      sortOrder: r.sortOrder,
      lastVerifiedAt: r.lastVerifiedAt,
      offerText: r.offerText as string | undefined,
      offerExpiresAt: r.offerExpiresAt as string | undefined,
    };
  });
}

/** Enabled items that have something real to show (a code or a valid link), in a fixed order. */
export function activeRecommendations(items: Recommendation[]): Recommendation[] {
  return items
    .filter((item) => item.enabled && (item.code !== undefined || item.referralUrl !== undefined))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** An offer is shown only while it has not expired (end of the stated day, Asia/Taipei). */
export function isOfferActive(item: Recommendation, now: Date): boolean {
  if (!item.offerText) return false;
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
