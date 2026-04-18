#!/usr/bin/env node
// Downloads the Open Food Facts CSV dump, filters to Argentine products
// with complete + sane nutrition, ranks by popularity, and writes the
// top N as src/data/foods-off-ar.json in the LocalFoodRaw shape so it
// can be merged into the curated local library.
//
// Usage:
//   node scripts/import-off-ar.mjs              # default 500 items
//   node scripts/import-off-ar.mjs --limit=800
//   node scripts/import-off-ar.mjs --force      # force re-download

import { createWriteStream, createReadStream, statSync, existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.cache');
const DUMP_PATH = path.join(CACHE_DIR, 'off-products.csv.gz');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'foods-off-ar.json');

const DUMP_URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';

const args = process.argv.slice(2);
const LIMIT = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 500;
const FORCE_DOWNLOAD = args.includes('--force');

const log = (msg) => process.stderr.write(`[off-import] ${msg}\n`);

// ─── Download ───────────────────────────────────────────────────────────────

async function downloadDump() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  if (existsSync(DUMP_PATH) && !FORCE_DOWNLOAD) {
    const size = statSync(DUMP_PATH).size;
    if (size > 1_000_000_000) {
      log(`using cached dump (${(size / 1e9).toFixed(2)} GB)`);
      return;
    }
    log(`cached dump looks incomplete (${size} bytes), re-downloading`);
  }

  log(`downloading ${DUMP_URL}`);
  const res = await fetch(DUMP_URL, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status} ${res.statusText}`);

  const total = Number(res.headers.get('content-length') ?? 0);
  let received = 0;
  let lastLog = 0;

  const reader = Readable.fromWeb(res.body);
  reader.on('data', (chunk) => {
    received += chunk.length;
    if (received - lastLog > 50_000_000) {
      const pct = total ? ((received / total) * 100).toFixed(1) : '?';
      log(`  ${(received / 1e6).toFixed(0)} MB / ${(total / 1e6).toFixed(0)} MB (${pct}%)`);
      lastLog = received;
    }
  });

  await pipeline(reader, createWriteStream(DUMP_PATH));
  log(`download complete: ${(statSync(DUMP_PATH).size / 1e9).toFixed(2)} GB`);
}

// ─── Parse + filter ─────────────────────────────────────────────────────────

const num = (s) => {
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const pickName = (row, cols) =>
  (row[cols['product_name_es']] ||
    row[cols['product_name']] ||
    row[cols['product_name_en']] ||
    '').trim();

async function filterArgentineProducts() {
  log('streaming CSV (filter: en:argentina + sane macros)...');
  const gz = createReadStream(DUMP_PATH).pipe(createGunzip());
  const rl = createInterface({ input: gz, crlfDelay: Infinity });

  let cols = null;
  let total = 0;
  let arMatches = 0;
  let kept = 0;
  const out = [];

  for await (const line of rl) {
    total++;

    if (!cols) {
      const headers = line.split('\t');
      cols = {};
      headers.forEach((h, i) => (cols[h] = i));
      const required = [
        'code', 'product_name', 'brands', 'categories', 'countries_tags',
        'energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 'fat_100g',
      ];
      for (const r of required) {
        if (cols[r] === undefined) throw new Error(`CSV missing column: ${r}`);
      }
      continue;
    }

    if (total % 250_000 === 0) {
      log(`  scanned ${total.toLocaleString()}  AR: ${arMatches}  kept: ${kept}`);
    }

    // Fast-reject before splitting the 200-column row.
    if (!line.includes('argentina')) continue;

    const row = line.split('\t');
    const countries = row[cols['countries_tags']] ?? '';
    if (!countries.includes('en:argentina')) continue;
    arMatches++;

    const kcal = num(row[cols['energy-kcal_100g']]);
    if (!(kcal > 0 && kcal < 1200)) continue;

    const protein = num(row[cols['proteins_100g']]);
    const carbs = num(row[cols['carbohydrates_100g']]);
    const fat = num(row[cols['fat_100g']]);
    if (![protein, carbs, fat].every(Number.isFinite)) continue;
    if (protein < 0 || carbs < 0 || fat < 0) continue;
    if (protein > 100 || carbs > 100 || fat > 100) continue;
    if (protein + carbs + fat > 105) continue;

    // Drop entries whose declared kcal doesn't match the macros. OFF is
    // user-submitted, so garbage is common. Same threshold the in-app
    // MealsEditor warning uses (±25%), but stricter cutoff here since we
    // want this library to stay clean.
    const est = protein * 4 + carbs * 4 + fat * 9;
    if (est > 0 && Math.abs(kcal - est) / kcal > 0.3) continue;

    const name = pickName(row, cols);
    if (!name || name.length < 2 || name.length > 80) continue;

    const code = (row[cols['code']] ?? '').trim();
    if (!code || !/^\d{6,14}$/.test(code)) continue;

    const brand = (row[cols['brands']] ?? '').split(',')[0]?.trim();
    const category = (row[cols['categories']] ?? '').split(',')[0]?.trim();
    const scans = num(row[cols['unique_scans_n']]) || 0;
    const completeness = num(row[cols['completeness']]) || 0;

    kept++;
    out.push({
      code, name,
      brand: brand || undefined,
      category: category || undefined,
      kcal, protein, carbs, fat,
      scans, completeness,
    });
  }

  log(`total rows:     ${total.toLocaleString()}`);
  log(`argentine rows: ${arMatches.toLocaleString()}`);
  log(`passed filters: ${kept.toLocaleString()}`);
  return out;
}

// ─── Rank and emit ──────────────────────────────────────────────────────────

function score(item) {
  // Popularity dominates (log-scaled so blockbuster items don't crush the rest),
  // completeness breaks ties, brand presence is a small bonus.
  const pop = Math.log10(1 + item.scans);
  const complete = item.completeness ?? 0;
  const hasBrand = item.brand ? 0.3 : 0;
  return pop * 2 + complete + hasBrand;
}

function toLocalFoodRaw(item) {
  const obj = {
    id: `off-ar-${item.code}`,
    name: item.name,
    per100g: {
      kcal: Math.round(item.kcal),
      protein: Math.round(item.protein * 10) / 10,
      carbs: Math.round(item.carbs * 10) / 10,
      fat: Math.round(item.fat * 10) / 10,
    },
  };
  if (item.brand) obj.brand = item.brand;
  if (item.category) obj.category = item.category;
  return obj;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await downloadDump();
  const matches = await filterArgentineProducts();
  matches.sort((a, b) => score(b) - score(a));

  // Dedupe by brand+name so OFF's occasional duplicates (same product under
  // slightly different names) don't eat slots in the final list.
  const seen = new Set();
  const final = [];
  for (const m of matches) {
    const key = `${(m.brand ?? '').toLowerCase()}::${m.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    final.push(toLocalFoodRaw(m));
    if (final.length >= LIMIT) break;
  }

  await writeFile(OUT_PATH, JSON.stringify(final, null, 2) + '\n', 'utf8');
  log(`wrote ${final.length} items → ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
