import { supabase } from '../db/supabase';

// dolarapi.com API pública (sin auth) — devuelve un array con todas las
// cotizaciones (oficial, blue, MEP, CCL, tarjeta, mayorista, cripto).
// Doc: https://dolarapi.com/docs/argentina
const DOLARAPI_URL = 'https://dolarapi.com/v1/dolares';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

interface DolarApiQuote {
  moneda: string;
  casa: string;       // 'oficial' | 'blue' | 'bolsa' | 'contadoconliqui' | 'tarjeta' | 'mayorista' | 'cripto'
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
}

export interface FxRate {
  name: string;
  buy: number | null;
  sell: number | null;
  captured_at: string;
}

interface CacheEntry {
  rates: FxRate[];
  fetchedAt: number;
}

let memoryCache: CacheEntry | null = null;

// Map del 'casa' field de dolarapi a nombres más cortos/usables.
function normalizeCasa(casa: string): string {
  if (casa === 'bolsa') return 'mep';
  if (casa === 'contadoconliqui') return 'ccl';
  return casa;
}

async function fetchFromDolarApi(): Promise<FxRate[]> {
  const res = await fetch(DOLARAPI_URL, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`dolarapi failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as DolarApiQuote[];
  if (!Array.isArray(data)) throw new Error('dolarapi: unexpected response shape');

  const now = new Date().toISOString();
  return data.map(q => ({
    name: normalizeCasa(q.casa),
    buy: q.compra ?? null,
    sell: q.venta ?? null,
    captured_at: q.fechaActualizacion ?? now,
  }));
}

async function persistSnapshots(rates: FxRate[]): Promise<void> {
  if (rates.length === 0) return;
  const rows = rates.map(r => ({
    captured_at: r.captured_at,
    source: 'dolarapi',
    pair: 'USD/ARS',
    name: r.name,
    buy: r.buy,
    sell: r.sell,
  }));
  const { error } = await supabase.from('fx_rate_snapshots').insert(rows);
  if (error) console.error('[fx] persist snapshots failed', error);
}

async function loadLatestFromDb(): Promise<FxRate[]> {
  // Trae el último snapshot por nombre (group by name + max captured_at).
  // Hacemos una query simple y agrupamos en memoria — el dataset es chico.
  const { data, error } = await supabase
    .from('fx_rate_snapshots')
    .select('name, buy, sell, captured_at')
    .order('captured_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[fx] load latest failed', error);
    return [];
  }
  const map = new Map<string, FxRate>();
  for (const row of (data ?? []) as any[]) {
    if (!map.has(row.name)) {
      map.set(row.name, {
        name: row.name,
        buy: row.buy,
        sell: row.sell,
        captured_at: row.captured_at,
      });
    }
  }
  return Array.from(map.values());
}

export const FxRateService = {
  async getLatest(): Promise<FxRate[]> {
    if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
      return memoryCache.rates;
    }
    try {
      const fresh = await fetchFromDolarApi();
      memoryCache = { rates: fresh, fetchedAt: Date.now() };
      // Persist en background (no bloquear la respuesta).
      persistSnapshots(fresh).catch(err => console.error('[fx] persist failed', err));
      return fresh;
    } catch (err) {
      console.warn('[fx] dolarapi fetch failed, falling back to DB', err);
      const fallback = await loadLatestFromDb();
      if (fallback.length > 0) return fallback;
      throw err;
    }
  },

  // Forzar fetch + snapshot (usado por el cron diario para tener histórico).
  async snapshotDaily(): Promise<{ saved: number }> {
    try {
      const fresh = await fetchFromDolarApi();
      await persistSnapshots(fresh);
      memoryCache = { rates: fresh, fetchedAt: Date.now() };
      return { saved: fresh.length };
    } catch (err) {
      console.error('[fx] daily snapshot failed', err);
      return { saved: 0 };
    }
  },

  async getHistory(name: string, days = 30): Promise<FxRate[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('fx_rate_snapshots')
      .select('name, buy, sell, captured_at')
      .eq('name', name)
      .gte('captured_at', since)
      .order('captured_at', { ascending: true });
    if (error) {
      console.error('[fx] history failed', error);
      return [];
    }
    return (data ?? []) as FxRate[];
  },
};
