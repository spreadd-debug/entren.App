import foodsData from '../data/foods-ar.json';
import foodsOffArData from '../data/foods-off-ar.json';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FoodMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodPortion {
  label: string;
  grams: number;
}

export interface FoodLibraryItem {
  id: string;                 // 'local:pollo-pechuga' | 'off:7791234567890'
  name: string;
  brand?: string;
  category?: string;
  per100g: FoodMacros;
  commonPortions?: FoodPortion[];
  imageUrl?: string;
  source: 'local' | 'off';
}

interface LocalFoodRaw {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  per100g: FoodMacros;
  commonPortions?: FoodPortion[];
  aliases?: string[];
}

// ─── Local (curated JSON) ───────────────────────────────────────────────────

// Two local catalogs merged at load time:
// - foods-ar.json: hand-curated AR staples (~190 items, with aliases & commonPortions).
// - foods-off-ar.json: top AR products from the Open Food Facts dump, ranked by
//   scan popularity. Regenerate with `npm run import:off-ar`.
const LOCAL_FOODS: LocalFoodRaw[] = [
  ...(foodsData as LocalFoodRaw[]),
  ...(foodsOffArData as LocalFoodRaw[]),
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function searchLocal(query: string, limit = 15): FoodLibraryItem[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { item: LocalFoodRaw; score: number }[] = [];
  for (const item of LOCAL_FOODS) {
    const name = normalize(item.name);
    const brand = normalize(item.brand ?? '');
    const category = normalize(item.category ?? '');
    const aliases = (item.aliases ?? []).map(normalize);
    const haystack = `${name} ${brand} ${category} ${aliases.join(' ')}`;

    if (!tokens.every(t => haystack.includes(t))) continue;

    let score = 0;
    for (const t of tokens) {
      if (brand && brand.includes(t)) score += 5;
      else if (name.startsWith(t)) score += 4;
      else if (name.includes(` ${t}`) || name.includes(`,${t}`) || name.includes(`, ${t}`)) score += 3;
      else if (aliases.some(a => a.startsWith(t))) score += 2;
      else if (name.includes(t) || aliases.some(a => a.includes(t))) score += 1;
      else if (category.includes(t)) score += 0.5;
    }
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ item }) => ({
    id: `local:${item.id}`,
    name: item.name,
    brand: item.brand,
    category: item.category,
    per100g: item.per100g,
    commonPortions: item.commonPortions,
    source: 'local',
  }));
}

// ─── Open Food Facts (AR) ───────────────────────────────────────────────────

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  categories?: string;
  nutriments?: OFFNutriments;
  image_small_url?: string;
}

interface OFFResponse {
  count?: number;
  products?: OFFProduct[];
}

const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_es',
  'brands',
  'categories',
  'nutriments',
  'image_small_url',
].join(',');

function toBrandSlug(s: string): string {
  return normalize(s)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function mapOFFProduct(p: OFFProduct): FoodLibraryItem | null {
  const n = p.nutriments;
  const kcal = n?.['energy-kcal_100g'];
  if (typeof kcal !== 'number' || kcal <= 0) return null;

  const name = (p.product_name_es ?? p.product_name ?? '').trim();
  if (!name) return null;

  return {
    id: `off:${p.code ?? name}`,
    name,
    brand: (p.brands ?? '').split(',')[0]?.trim() || undefined,
    category: (p.categories ?? '').split(',')[0]?.trim() || undefined,
    per100g: {
      kcal: Math.round(kcal),
      protein: Math.round((n?.proteins_100g ?? 0) * 10) / 10,
      carbs: Math.round((n?.carbohydrates_100g ?? 0) * 10) / 10,
      fat: Math.round((n?.fat_100g ?? 0) * 10) / 10,
    },
    imageUrl: p.image_small_url,
    source: 'off',
  };
}

export interface OFFSearchResult {
  items: FoodLibraryItem[];
  unavailable: boolean;
}

export async function searchOpenFoodFacts(
  query: string,
  opts: { signal?: AbortSignal; pageSize?: number } = {},
): Promise<OFFSearchResult> {
  const q = query.trim();
  if (!q) return { items: [], unavailable: false };

  const pageSize = opts.pageSize ?? 12;
  const base = 'https://world.openfoodfacts.org/api/v2/search';
  const common = `&countries_tags_en=argentina&page_size=${pageSize}&fields=${OFF_FIELDS}`;

  const termsUrl = `${base}?search_terms=${encodeURIComponent(q)}${common}`;
  const brandSlug = toBrandSlug(q);
  const brandsUrl = brandSlug.length >= 3
    ? `${base}?brands_tags=${encodeURIComponent(brandSlug)}${common}`
    : null;

  // OFF occasionally serves an HTML "Page temporarily unavailable" instead of
  // JSON (especially on brand-tag queries). Guard against that so one bad
  // endpoint never kills the whole search. `ok: false` lets the caller
  // detect full-service outages (both endpoints down) and show a banner.
  const fetchProducts = async (url: string): Promise<{ products: OFFProduct[]; ok: boolean }> => {
    try {
      const res = await fetch(url, { signal: opts.signal });
      if (!res.ok) return { products: [], ok: false };
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) return { products: [], ok: false };
      const json = (await res.json()) as OFFResponse;
      return { products: json.products ?? [], ok: true };
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') throw err;
      return { products: [], ok: false };
    }
  };

  try {
    const [brandRes, termRes] = await Promise.all([
      brandsUrl ? fetchProducts(brandsUrl) : Promise.resolve({ products: [] as OFFProduct[], ok: true }),
      fetchProducts(termsUrl),
    ]);

    // If the only endpoint we actually queried failed, OFF is unavailable.
    // (When brandsUrl is null we resolve `ok: true` above so we don't falsely
    // flag short queries as outage.)
    const unavailable = !brandRes.ok && !termRes.ok;

    // Brand-filter hits first, then full-text hits; dedupe by code.
    const combined = [...brandRes.products, ...termRes.products];
    const seen = new Set<string>();
    const out: FoodLibraryItem[] = [];
    for (const p of combined) {
      const code = p.code ?? '';
      if (code && seen.has(code)) continue;
      if (code) seen.add(code);

      const mapped = mapOFFProduct(p);
      if (!mapped) continue;
      out.push(mapped);
    }

    // Client-side re-rank: products whose brand or name matches every query
    // token bubble up. OFF's default ranking is noisy for brand-style queries
    // (e.g. "don satur" returns unrelated products before the actual Don Satur
    // items), so we fix it on our side.
    const qTokens = normalize(q).split(/\s+/).filter(Boolean);
    const scoreItem = (it: FoodLibraryItem): number => {
      const brand = normalize(it.brand ?? '');
      const name = normalize(it.name);
      const brandHit = brand && qTokens.every(t => brand.includes(t));
      const nameHit = qTokens.every(t => name.includes(t));
      if (brandHit) return 3;
      if (nameHit) return 2;
      // Partial: at least one token matches brand or name.
      if (qTokens.some(t => brand.includes(t) || name.includes(t))) return 1;
      return 0;
    };
    out.sort((a, b) => scoreItem(b) - scoreItem(a));

    return { items: out.slice(0, pageSize), unavailable };
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return { items: [], unavailable: false };
    console.warn('OFF search error:', err);
    return { items: [], unavailable: true };
  }
}

// ─── Scaling ────────────────────────────────────────────────────────────────

export function scaleMacros(item: FoodLibraryItem, grams: number): FoodMacros {
  const factor = grams / 100;
  return {
    kcal: Math.round(item.per100g.kcal * factor),
    protein: Math.round(item.per100g.protein * factor * 10) / 10,
    carbs: Math.round(item.per100g.carbs * factor * 10) / 10,
    fat: Math.round(item.per100g.fat * factor * 10) / 10,
  };
}
