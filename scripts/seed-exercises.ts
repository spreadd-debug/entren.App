/**
 * Seed exercise_library from free-exercise-db
 * Run with: npx tsx scripts/seed-exercises.ts
 *
 * Source: https://github.com/yuhonas/free-exercise-db
 * 800+ exercises with muscle groups and instructions.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// ── Muscle group translation ─────────────────────────────────────────────────
const MUSCLE_MAP: Record<string, string> = {
  abdominals: "Abdomen",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Espalda",
  "lower back": "Espalda Baja",
  "middle back": "Espalda Media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
};

// ── Categories to import (most relevant for a gym) ───────────────────────────
const ALLOWED_CATEGORIES = new Set([
  "strength",
  "powerlifting",
  "olympic weightlifting",
  "plyometrics",
  "strongman",
]);

interface RawExercise {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  level: string;
  equipment: string;
}

async function fetchExercises(): Promise<RawExercise[]> {
  const url =
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
  console.log("Fetching exercises from free-exercise-db...");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function mapMuscle(muscle: string): string {
  return MUSCLE_MAP[muscle.toLowerCase()] ?? muscle;
}

function buildDescription(ex: RawExercise): string {
  const parts: string[] = [];

  if (ex.instructions.length > 0) {
    parts.push(ex.instructions.slice(0, 3).join(" "));
  }

  if (ex.secondaryMuscles.length > 0) {
    const secondary = ex.secondaryMuscles.map(mapMuscle).join(", ");
    parts.push(`Músculos secundarios: ${secondary}.`);
  }

  return parts.join(" ").slice(0, 500); // keep description reasonable length
}

async function main() {
  const raw = await fetchExercises();

  const filtered = raw.filter((ex) => ALLOWED_CATEGORIES.has(ex.category.toLowerCase()));

  console.log(`Total exercises: ${raw.length}`);
  console.log(`After category filter: ${filtered.length}`);

  const rows = filtered.map((ex) => ({
    name: ex.name,
    description: buildDescription(ex),
    muscle_group: ex.primaryMuscles.length > 0 ? mapMuscle(ex.primaryMuscles[0]) : null,
    video_url: null,
  }));

  // Insert in batches of 100
  const BATCH = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("exercise_library")
      .insert(batch);

    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
      skipped += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / BATCH + 1} (${inserted}/${rows.length})`);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped/errors: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
