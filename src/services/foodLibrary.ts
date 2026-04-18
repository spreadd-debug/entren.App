import foodsData from '../data/foods-ar.json';

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
  category?: string;
  per100g: FoodMacros;
  commonPortions?: FoodPortion[];
  aliases?: string[];
}

// ─── Local (curated JSON) ───────────────────────────────────────────────────

const LOCAL_FOODS: LocalFoodRaw[] = foodsData as LocalFoodRaw[];

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
    const category = normalize(item.category ?? '');
    const aliases = (item.aliases ?? []).map(normalize);
    const haystack = `${name} ${category} ${aliases.join(' ')}`;

    if (!tokens.every(t => haystack.includes(t))) continue;

    let score = 0;
    for (const t of tokens) {
      if (name.startsWith(t)) score += 4;
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

export async function searchOpenFoodFacts(
  query: string,
  opts: { signal?: AbortSignal; pageSize?: number } = {},
): Promise<FoodLibraryItem[]> {
  const q = query.trim();
  if (!q) return [];

  const pageSize = opts.pageSize ?? 12;
  const base = 'https://world.openfoodfacts.org/api/v2/search';
  const common = `&countries_tags_en=argentina&page_size=${pageSize}&fields=${OFF_FIELDS}`;

  const termsUrl = `${base}?search_terms=${encodeURIComponent(q)}${common}`;
  const brandSlug = toBrandSlug(q);
  const brandsUrl = brandSlug.length >= 3
    ? `${base}?brands_tags=${encodeURIComponent(brandSlug)}${common}`
    : null;

  const fetchProducts = async (url: string): Promise<OFFProduct[]> => {
    const res = await fetch(url, { signal: opts.signal });
    if (!res.ok) {
      console.warn(`OFF search failed: HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as OFFResponse;
    return json.products ?? [];
  };

  try {
    const [brandProducts, termProducts] = await Promise.all([
      brandsUrl ? fetchProducts(brandsUrl) : Promise.resolve([]),
      fetchProducts(termsUrl),
    ]);

    // Brand matches first (exact-brand is more valuable), then term matches.
    const combined = [...brandProducts, ...termProducts];
    const seen = new Set<string>();
    const out: FoodLibraryItem[] = [];
    for (const p of combined) {
      const code = p.code ?? '';
      if (code && seen.has(code)) continue;
      if (code) seen.add(code);

      const mapped = mapOFFProduct(p);
      if (!mapped) continue;
      out.push(mapped);
      if (out.length >= pageSize) break;
    }
    return out;
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return [];
    console.warn('OFF search error:', err);
    return [];
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
