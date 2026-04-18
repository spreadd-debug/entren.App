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
  const q = normalize(query);
  if (!q) return [];

  const scored: { item: LocalFoodRaw; score: number }[] = [];
  for (const item of LOCAL_FOODS) {
    const name = normalize(item.name);
    const aliases = (item.aliases ?? []).map(normalize);

    if (name.startsWith(q)) {
      scored.push({ item, score: 3 });
      continue;
    }
    if (aliases.some(a => a.startsWith(q))) {
      scored.push({ item, score: 2 });
      continue;
    }
    if (name.includes(q) || aliases.some(a => a.includes(q))) {
      scored.push({ item, score: 1 });
    }
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

export async function searchOpenFoodFacts(
  query: string,
  opts: { signal?: AbortSignal; pageSize?: number } = {},
): Promise<FoodLibraryItem[]> {
  const q = query.trim();
  if (!q) return [];

  const pageSize = opts.pageSize ?? 12;
  const url =
    'https://world.openfoodfacts.org/api/v2/search' +
    `?search_terms=${encodeURIComponent(q)}` +
    '&countries_tags_en=argentina' +
    `&page_size=${pageSize}` +
    `&fields=${OFF_FIELDS}`;

  try {
    const res = await fetch(url, { signal: opts.signal });
    if (!res.ok) {
      console.warn(`OFF search failed: HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as OFFResponse;
    const products = json.products ?? [];

    const out: FoodLibraryItem[] = [];
    for (const p of products) {
      const n = p.nutriments;
      const kcal = n?.['energy-kcal_100g'];
      if (typeof kcal !== 'number' || kcal <= 0) continue;

      const name = (p.product_name_es ?? p.product_name ?? '').trim();
      if (!name) continue;

      out.push({
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
      });
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
