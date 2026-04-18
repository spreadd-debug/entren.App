import type {
  NutritionActivityLevel,
  NutritionTmbGoalType,
} from '../../shared/types';

export type BiologicalSex = 'male' | 'female';

export interface TmbInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  biologicalSex: BiologicalSex;
}

export interface NutritionTargetInputs extends TmbInputs {
  activityLevel: NutritionActivityLevel;
  goalType: NutritionTmbGoalType;
  goalAdjustmentPct: number;
  proteinGPerKg?: number;
  fatPctOfKcal?: number;
}

export interface MacroBreakdown {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
}

export interface NutritionTargets {
  tmbKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  macros: MacroBreakdown;
  inputs: NutritionTargetInputs;
}

export const ACTIVITY_FACTORS: Record<NutritionActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

export const DEFAULT_GOAL_ADJUSTMENT: Record<NutritionTmbGoalType, number> = {
  lose_fat: -15,
  maintain: 0,
  gain_muscle: 10,
};

export const ACTIVITY_LABELS: Record<NutritionActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: 'Sedentario', hint: 'Trabajo de oficina, sin ejercicio' },
  light: { label: 'Ligero', hint: '1–3 entrenos por semana' },
  moderate: { label: 'Moderado', hint: '3–5 entrenos por semana' },
  high: { label: 'Alto', hint: '6–7 entrenos por semana' },
  very_high: { label: 'Muy alto', hint: 'Entrenos intensos 2x/día o trabajo físico' },
};

export const GOAL_LABELS: Record<NutritionTmbGoalType, { label: string; defaultPct: number }> = {
  lose_fat: { label: 'Perder grasa', defaultPct: -15 },
  maintain: { label: 'Mantener', defaultPct: 0 },
  gain_muscle: { label: 'Ganar músculo', defaultPct: 10 },
};

const DEFAULT_PROTEIN_G_PER_KG = 2.0;
const DEFAULT_FAT_PCT = 0.25;

// Mifflin-St Jeor (1990)
//   male:   10·peso + 6.25·altura − 5·edad + 5
//   female: 10·peso + 6.25·altura − 5·edad − 161
export function calcTmb(inputs: TmbInputs): number {
  const { weightKg, heightCm, age, biologicalSex } = inputs;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const sexOffset = biologicalSex === 'male' ? 5 : -161;
  return Math.round(base + sexOffset);
}

export function calcTdee(tmbKcal: number, level: NutritionActivityLevel): number {
  return Math.round(tmbKcal * ACTIVITY_FACTORS[level]);
}

export function applyGoalAdjustment(tdeeKcal: number, adjustmentPct: number): number {
  return Math.round(tdeeKcal * (1 + adjustmentPct / 100));
}

export function calcMacros(params: {
  targetKcal: number;
  weightKg: number;
  proteinGPerKg?: number;
  fatPctOfKcal?: number;
}): MacroBreakdown {
  const proteinGPerKg = params.proteinGPerKg ?? DEFAULT_PROTEIN_G_PER_KG;
  const fatPctOfKcal = params.fatPctOfKcal ?? DEFAULT_FAT_PCT;

  const proteinG = Math.round(params.weightKg * proteinGPerKg);
  const proteinKcal = proteinG * 4;

  const fatKcalRaw = params.targetKcal * fatPctOfKcal;
  const fatG = Math.round(fatKcalRaw / 9);
  const fatKcal = fatG * 9;

  const remainingKcal = params.targetKcal - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.round(remainingKcal / 4));
  const carbsKcal = carbsG * 4;

  return { proteinG, carbsG, fatG, proteinKcal, carbsKcal, fatKcal };
}

export function calcNutritionTargets(inputs: NutritionTargetInputs): NutritionTargets {
  const tmbKcal = calcTmb(inputs);
  const tdeeKcal = calcTdee(tmbKcal, inputs.activityLevel);
  const targetKcal = applyGoalAdjustment(tdeeKcal, inputs.goalAdjustmentPct);
  const macros = calcMacros({
    targetKcal,
    weightKg: inputs.weightKg,
    proteinGPerKg: inputs.proteinGPerKg,
    fatPctOfKcal: inputs.fatPctOfKcal,
  });
  return { tmbKcal, tdeeKcal, targetKcal, macros, inputs };
}

export type TmbValidationReason =
  | 'missing'
  | 'age_out_of_range'
  | 'weight_out_of_range'
  | 'height_out_of_range';

export function validateTmbInputs(
  inputs: Partial<TmbInputs>
): { ok: true } | { ok: false; reason: TmbValidationReason } {
  const { weightKg, heightCm, age, biologicalSex } = inputs;

  if (
    weightKg === undefined || weightKg === null || Number.isNaN(weightKg) ||
    heightCm === undefined || heightCm === null || Number.isNaN(heightCm) ||
    age === undefined || age === null || Number.isNaN(age) ||
    !biologicalSex
  ) {
    return { ok: false, reason: 'missing' };
  }

  if (age < 10 || age > 100) return { ok: false, reason: 'age_out_of_range' };
  if (weightKg < 20 || weightKg > 300) return { ok: false, reason: 'weight_out_of_range' };
  if (heightCm < 100 || heightCm > 230) return { ok: false, reason: 'height_out_of_range' };

  return { ok: true };
}
