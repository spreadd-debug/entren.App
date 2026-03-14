/**
 * Translate exercise descriptions to Spanish using Lingva Translate (free, no API key).
 * Lingva is a Google Translate proxy — rate limits apply to their servers, not yours.
 * Run with: npx tsx scripts/translate-descriptions.ts
 *
 * Safe to re-run: skips descriptions that already look Spanish.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Lingva public instances — tried in order on error
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.thedaviddelta.com',
  'https://translate.plausibility.cloud',
];

function isEnglish(text: string): boolean {
  if (!text) return false;
  return /\b(the|and|your|with|while|keep|hold|stand|sit|lie|lower|raise|push|pull|grip|grasp|starting position|return|repeat|slowly|until|toward|away|both|each|other side)\b/i.test(text);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateWithLingva(text: string, baseUrl: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(text);
    const url = `${baseUrl}/api/v1/en/es/${encoded}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const json: any = await res.json();
    const t = json?.translation;
    if (!t || t === text) return null;
    return t;
  } catch {
    return null;
  }
}

async function translateText(text: string): Promise<string | null> {
  for (const instance of LINGVA_INSTANCES) {
    const result = await translateWithLingva(text, instance);
    if (result) return result;
    await sleep(300);
  }
  return null;
}

async function main() {
  console.log('Fetching exercises...');
  const { data, error } = await supabase
    .from('exercise_library')
    .select('id, name, description')
    .not('description', 'is', null);

  if (error) throw error;
  if (!data?.length) { console.log('No exercises found.'); return; }

  const toTranslate = (data as { id: string; name: string; description: string }[])
    .filter((e) => e.description && isEnglish(e.description));

  console.log(`${data.length} total — ${toTranslate.length} to translate, ${data.length - toTranslate.length} already in Spanish.\n`);

  if (!toTranslate.length) { console.log('Nothing to do.'); return; }

  let done = 0;
  let failed = 0;

  for (const ex of toTranslate) {
    process.stdout.write(`[${done + failed + 1}/${toTranslate.length}] ${ex.name.slice(0, 50).padEnd(50)} `);

    const translated = await translateText(ex.description);

    if (!translated) {
      console.log('✗ error');
      failed++;
    } else {
      const { error: upErr } = await supabase
        .from('exercise_library')
        .update({ description: translated })
        .eq('id', ex.id);

      if (upErr) {
        console.log('✗ DB error');
        failed++;
      } else {
        console.log('✓');
        done++;
      }
    }

    await sleep(400);
  }

  console.log(`\nDone! Translated: ${done}, Failed: ${failed}`);
  if (failed > 0) {
    console.log('Re-run the script to retry failed exercises.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
