import React, { useMemo, useState } from 'react';
import { Card, Button, Input, Select } from '../../UI';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Utensils, Apple, Flame, Beef, Wheat, Droplets, Search, AlertCircle,
} from 'lucide-react';
import type { MealType, NutritionDetailLevel } from '../../../../shared/types';
import { FoodSearchPicker } from './FoodSearchPicker';

// ─── Drafts ──────────────────────────────────────────────────────────────────

export interface DraftFood {
  tempId: string;
  existingId?: string; // db id when editing an existing food
  food_name: string;
  amount: string;
  unit: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

export interface DraftMeal {
  tempId: string;
  existingId?: string; // db id when editing an existing meal
  meal_type: MealType;
  name: string;
  time_hint: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  foods: DraftFood[];
}

// Parsed draft ready for persistence (numbers, trimmed strings). Includes
// existingId so the save path can decide between update/insert per item.
export interface ParsedDraftMeal {
  existingId?: string;
  meal_type: MealType;
  order_index: number;
  name: string | null;
  time_hint: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  foods: ParsedDraftFood[];
}

export interface ParsedDraftFood {
  existingId?: string;
  food_name: string;
  amount: number | null;
  unit: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  order_index: number;
}

const numOrNull = (s: string): number | null => {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const parseDraftMeal = (m: DraftMeal, order: number, includeFoods: boolean): ParsedDraftMeal => ({
  existingId: m.existingId,
  meal_type: m.meal_type,
  order_index: order,
  name: m.name.trim() || null,
  time_hint: m.time_hint.trim() || null,
  calories: numOrNull(m.calories),
  protein_g: numOrNull(m.protein_g),
  carbs_g: numOrNull(m.carbs_g),
  fat_g: numOrNull(m.fat_g),
  foods: includeFoods
    ? m.foods
        .filter(f => f.food_name.trim().length > 0)
        .map((f, i) => ({
          existingId: f.existingId,
          food_name: f.food_name.trim(),
          amount: numOrNull(f.amount),
          unit: f.unit.trim() || null,
          calories: numOrNull(f.calories),
          protein_g: numOrNull(f.protein_g),
          carbs_g: numOrNull(f.carbs_g),
          fat_g: numOrNull(f.fat_g),
          order_index: i,
        }))
    : [],
});

// Structurally-typed: accepts NutritionPlanMealWithFoods without importing it
// to avoid a circular dependency with NutritionPlanService.
interface ServerMeal {
  id: string;
  meal_type: MealType;
  name: string | null;
  time_hint: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  foods: {
    id: string;
    food_name: string;
    amount: number | null;
    unit: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  }[];
}

export const mealsToDrafts = (meals: ServerMeal[]): DraftMeal[] =>
  meals.map(m => ({
    tempId: crypto.randomUUID(),
    existingId: m.id,
    meal_type: m.meal_type,
    name: m.name ?? '',
    time_hint: m.time_hint ?? '',
    calories: m.calories != null ? String(m.calories) : '',
    protein_g: m.protein_g != null ? String(m.protein_g) : '',
    carbs_g: m.carbs_g != null ? String(m.carbs_g) : '',
    fat_g: m.fat_g != null ? String(m.fat_g) : '',
    foods: m.foods.map(f => ({
      tempId: crypto.randomUUID(),
      existingId: f.id,
      food_name: f.food_name,
      amount: f.amount != null ? String(f.amount) : '',
      unit: f.unit ?? '',
      calories: f.calories != null ? String(f.calories) : '',
      protein_g: f.protein_g != null ? String(f.protein_g) : '',
      carbs_g: f.carbs_g != null ? String(f.carbs_g) : '',
      fat_g: f.fat_g != null ? String(f.fat_g) : '',
    })),
  }));

const MEAL_LABELS: Record<MealType, { label: string; emoji: string; defaultTime: string }> = {
  desayuno:      { label: 'Desayuno',      emoji: '🌅', defaultTime: '08:00' },
  media_mañana:  { label: 'Media mañana',  emoji: '🥐', defaultTime: '10:30' },
  almuerzo:      { label: 'Almuerzo',      emoji: '🍽️', defaultTime: '13:00' },
  merienda:      { label: 'Merienda',      emoji: '☕', defaultTime: '17:00' },
  cena:          { label: 'Cena',          emoji: '🌙', defaultTime: '21:00' },
  pre_entreno:   { label: 'Pre-entreno',   emoji: '⚡', defaultTime: '' },
  post_entreno:  { label: 'Post-entreno',  emoji: '💪', defaultTime: '' },
  snack:         { label: 'Snack',         emoji: '🍎', defaultTime: '' },
};

const MEAL_TYPE_OPTIONS: MealType[] = [
  'desayuno', 'media_mañana', 'almuerzo', 'merienda', 'cena', 'pre_entreno', 'post_entreno', 'snack',
];

const UNIT_SUGGESTIONS = ['g', 'ml', 'un', 'taza', 'cda', 'cdta', 'rebanada', 'porción'];

// kcal vs macros vs amount consistency check — warning string or null
function checkFoodMacros(f: DraftFood): string | null {
  const hasAny = [f.calories, f.protein_g, f.carbs_g, f.fat_g].some(v => v.trim().length > 0);
  if (!hasAny) return null;

  const cal = Number(f.calories);
  const p = Number(f.protein_g);
  const c = Number(f.carbs_g);
  const fat = Number(f.fat_g);
  const amt = Number(f.amount);

  if ([cal, p, c, fat].some(n => Number.isFinite(n) && n < 0)) {
    return 'Los macros no pueden ser negativos.';
  }

  // Macros (en gramos) no pueden superar la cantidad del alimento cuando unit === 'g'
  if (f.unit === 'g' && Number.isFinite(amt) && amt > 0) {
    const sum = (Number.isFinite(p) ? p : 0) + (Number.isFinite(c) ? c : 0) + (Number.isFinite(fat) ? fat : 0);
    if (sum > amt * 1.05) {
      return `Los macros suman ${sum.toFixed(1)}g pero el alimento son ${amt}g.`;
    }
  }

  // kcal vs macros: p*4 + c*4 + f*9. Tolerancia ±25% (alcohol, fibra, redondeos)
  if (Number.isFinite(cal) && cal > 0) {
    const expected = (Number.isFinite(p) ? p : 0) * 4 + (Number.isFinite(c) ? c : 0) * 4 + (Number.isFinite(fat) ? fat : 0) * 9;
    if (expected > 0) {
      const pct = Math.abs(cal - expected) / Math.max(cal, expected);
      if (pct > 0.25) {
        return `Las kcal (${Math.round(cal)}) no cuadran con los macros (~${Math.round(expected)} esperadas).`;
      }
    }
  }

  return null;
}

export const emptyFood = (): DraftFood => ({
  tempId: crypto.randomUUID(),
  food_name: '',
  amount: '',
  unit: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
});

export const emptyMeal = (mealType: MealType = 'desayuno'): DraftMeal => ({
  tempId: crypto.randomUUID(),
  meal_type: mealType,
  name: '',
  time_hint: MEAL_LABELS[mealType].defaultTime,
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  foods: [],
});

const TEMPLATES: { label: string; mealTypes: MealType[] }[] = [
  { label: '4 comidas',  mealTypes: ['desayuno', 'almuerzo', 'merienda', 'cena'] },
  { label: '5 comidas',  mealTypes: ['desayuno', 'media_mañana', 'almuerzo', 'merienda', 'cena'] },
  { label: '6 comidas',  mealTypes: ['desayuno', 'media_mañana', 'almuerzo', 'merienda', 'cena', 'snack'] },
];

// ─── Daily totals ──────────────────────────────────────────────────────────

export interface MealsDailyTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealsTargets {
  kcal?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

const toNumOrZero = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

// En 'detailed' la suma sale de los alimentos (los macros por comida se ignoran).
// En 'meals' sale de los macros cargados a nivel comida.
export function computeMealTotals(
  meals: DraftMeal[],
  detailLevel: NutritionDetailLevel,
): MealsDailyTotals {
  const t: MealsDailyTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    if (detailLevel === 'detailed') {
      for (const f of m.foods) {
        t.kcal    += toNumOrZero(f.calories);
        t.protein += toNumOrZero(f.protein_g);
        t.carbs   += toNumOrZero(f.carbs_g);
        t.fat     += toNumOrZero(f.fat_g);
      }
    } else {
      t.kcal    += toNumOrZero(m.calories);
      t.protein += toNumOrZero(m.protein_g);
      t.carbs   += toNumOrZero(m.carbs_g);
      t.fat     += toNumOrZero(m.fat_g);
    }
  }
  return t;
}

function pctBarColor(pct: number): string {
  if (pct < 95) return 'bg-violet-500';
  if (pct <= 105) return 'bg-emerald-500';
  if (pct <= 115) return 'bg-amber-500';
  return 'bg-rose-500';
}

function pctTextColor(pct: number): string {
  if (pct < 95) return 'text-violet-600 dark:text-violet-400';
  if (pct <= 105) return 'text-emerald-600 dark:text-emerald-400';
  if (pct <= 115) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

interface TotalRowProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  unit: string;
}

const TotalRow: React.FC<TotalRowProps> = ({ icon, label, current, target, unit }) => {
  const pct = target > 0 ? (current / target) * 100 : 0;
  const barWidth = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0 w-4 flex justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
            <span className="font-bold text-slate-900 dark:text-white">{Math.round(current)}</span>
            <span className="text-slate-400"> / {Math.round(target)}{unit}</span>
            <span className="text-slate-400 ml-1">{label}</span>
          </span>
          <span className={`text-[10px] font-semibold shrink-0 ${pctTextColor(pct)}`}>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full ${pctBarColor(pct)} transition-all`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface MealsTotalsPanelProps {
  totals: MealsDailyTotals;
  targets: MealsTargets;
}

const MealsTotalsPanel: React.FC<MealsTotalsPanelProps> = ({ totals, targets }) => {
  const rows: TotalRowProps[] = [];
  if ((targets.kcal ?? 0) > 0) {
    rows.push({ icon: <Flame size={12} className="text-orange-500" />, label: 'kcal', current: totals.kcal, target: targets.kcal!, unit: '' });
  }
  if ((targets.protein ?? 0) > 0) {
    rows.push({ icon: <Beef size={12} className="text-rose-500" />, label: 'prot', current: totals.protein, target: targets.protein!, unit: 'g' });
  }
  if ((targets.carbs ?? 0) > 0) {
    rows.push({ icon: <Wheat size={12} className="text-amber-500" />, label: 'carb', current: totals.carbs, target: targets.carbs!, unit: 'g' });
  }
  if ((targets.fat ?? 0) > 0) {
    rows.push({ icon: <Droplets size={12} className="text-cyan-500" />, label: 'gra', current: totals.fat, target: targets.fat!, unit: 'g' });
  }
  if (rows.length === 0) return null;

  const remaining: string[] = [];
  const excess: string[] = [];
  const pushDiff = (cur: number, tgt: number | null | undefined, unit: string, label: string) => {
    if (!tgt || tgt <= 0) return;
    const d = tgt - cur;
    if (d > 0.5) remaining.push(`${Math.round(d)}${unit} ${label}`);
    else if (d < -0.5) excess.push(`${Math.round(-d)}${unit} ${label}`);
  };
  pushDiff(totals.kcal, targets.kcal, '', 'kcal');
  pushDiff(totals.protein, targets.protein, 'g', 'P');
  pushDiff(totals.carbs, targets.carbs, 'g', 'C');
  pushDiff(totals.fat, targets.fat, 'g', 'G');

  return (
    <Card className="p-3 bg-violet-500/5 border-violet-500/20">
      <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-2">
        Totales del día
      </p>
      <div className="space-y-2">
        {rows.map(r => (
          <TotalRow key={r.label} {...r} />
        ))}
      </div>
      {(remaining.length > 0 || excess.length > 0) && (
        <div className="mt-2.5 pt-2 border-t border-violet-500/15 text-[10px] space-y-0.5">
          {remaining.length > 0 && (
            <p className="text-slate-500 dark:text-slate-400">
              Faltan: <span className="font-semibold text-slate-700 dark:text-slate-200">{remaining.join(' · ')}</span>
            </p>
          )}
          {excess.length > 0 && (
            <p className="text-rose-500 dark:text-rose-400">
              Excedido: <span className="font-semibold">{excess.join(' · ')}</span>
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface MealsEditorProps {
  meals: DraftMeal[];
  onChange: (meals: DraftMeal[]) => void;
  detailLevel: NutritionDetailLevel;  // 'meals' | 'detailed'
  targets?: MealsTargets;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const MealsEditor: React.FC<MealsEditorProps> = ({ meals, onChange, detailLevel, targets }) => {
  const [expandedId, setExpandedId] = useState<string | null>(meals[0]?.tempId ?? null);
  const [pickerForMeal, setPickerForMeal] = useState<string | null>(null);
  const showFoods = detailLevel === 'detailed';

  const totals = useMemo(() => computeMealTotals(meals, detailLevel), [meals, detailLevel]);
  const totalsPanel = targets ? <MealsTotalsPanel totals={totals} targets={targets} /> : null;

  const updateMeal = (tempId: string, patch: Partial<DraftMeal>) => {
    onChange(meals.map(m => (m.tempId === tempId ? { ...m, ...patch } : m)));
  };

  const addMeal = (mealType: MealType = 'desayuno') => {
    const m = emptyMeal(mealType);
    onChange([...meals, m]);
    setExpandedId(m.tempId);
  };

  const removeMeal = (tempId: string) => {
    onChange(meals.filter(m => m.tempId !== tempId));
  };

  const moveMeal = (tempId: string, dir: -1 | 1) => {
    const idx = meals.findIndex(m => m.tempId === tempId);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= meals.length) return;
    const copy = [...meals];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange(copy);
  };

  const loadTemplate = (mealTypes: MealType[]) => {
    if (meals.length > 0) {
      const ok = window.confirm('Esto reemplaza las comidas actuales. ¿Continuar?');
      if (!ok) return;
    }
    onChange(mealTypes.map(mt => emptyMeal(mt)));
    // expand first after micro-delay
  };

  // ── Food ops ─────────────────────────────────────────────────────────
  const addFood = (mealTempId: string) => {
    const meal = meals.find(m => m.tempId === mealTempId);
    if (!meal) return;
    updateMeal(mealTempId, { foods: [...meal.foods, emptyFood()] });
  };

  const updateFood = (mealTempId: string, foodTempId: string, patch: Partial<DraftFood>) => {
    const meal = meals.find(m => m.tempId === mealTempId);
    if (!meal) return;
    updateMeal(mealTempId, {
      foods: meal.foods.map(f => (f.tempId === foodTempId ? { ...f, ...patch } : f)),
    });
  };

  const removeFood = (mealTempId: string, foodTempId: string) => {
    const meal = meals.find(m => m.tempId === mealTempId);
    if (!meal) return;
    updateMeal(mealTempId, { foods: meal.foods.filter(f => f.tempId !== foodTempId) });
  };

  // ── Empty state ──────────────────────────────────────────────────────
  if (meals.length === 0) {
    return (
      <div className="space-y-3">
        {totalsPanel}
        <Card className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 border-dashed">
          <Utensils className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={28} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Sin comidas todavía. Arrancá con una plantilla o agregá una.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                type="button"
                onClick={() => loadTemplate(t.mealTypes)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>
        <Button variant="outline" fullWidth onClick={() => addMeal('desayuno')}>
          <Plus size={15} className="inline mr-1" /> Agregar comida
        </Button>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {totalsPanel}
      {meals.map((m, idx) => {
        const label = MEAL_LABELS[m.meal_type];
        const expanded = expandedId === m.tempId;
        return (
          <Card key={m.tempId} className="p-0 overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-1 p-2.5 bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : m.tempId)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <span className="text-base">{label.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {m.name.trim() || label.label}
                  </p>
                  {m.time_hint && (
                    <p className="text-[10px] text-slate-400">{m.time_hint}</p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveMeal(m.tempId, -1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Subir"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={idx === meals.length - 1}
                  onClick={() => moveMeal(m.tempId, 1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Bajar"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => removeMeal(m.tempId)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                  title="Eliminar comida"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Body (expanded) */}
            {expanded && (
              <div className="p-3 space-y-3 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block px-1">Tipo de comida</label>
                    <Select
                      value={m.meal_type}
                      onChange={e => updateMeal(m.tempId, { meal_type: e.target.value as MealType })}
                    >
                      {MEAL_TYPE_OPTIONS.map(mt => (
                        <option key={mt} value={mt}>{MEAL_LABELS[mt].emoji} {MEAL_LABELS[mt].label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block px-1">Hora (opcional)</label>
                    <Input
                      type="text" placeholder="Ej: 08:00"
                      value={m.time_hint}
                      onChange={e => updateMeal(m.tempId, { time_hint: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block px-1">Nombre personalizado (opcional)</label>
                  <Input
                    type="text" placeholder={`Ej: ${label.label} rápido`}
                    value={m.name}
                    onChange={e => updateMeal(m.tempId, { name: e.target.value })}
                  />
                </div>

                {/* Per-meal macros (solo cuando no detallamos alimentos — ahí los macros los dan los alimentos) */}
                {!showFoods && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">Macros de la comida (opcional)</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div>
                        <label className="text-[10px] font-medium text-orange-500 mb-0.5 block px-1 flex items-center gap-0.5">
                          <Flame size={10} /> kcal
                        </label>
                        <Input type="number" min="0" placeholder="—"
                          value={m.calories} onChange={e => updateMeal(m.tempId, { calories: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-rose-500 mb-0.5 block px-1 flex items-center gap-0.5">
                          <Beef size={10} /> prot
                        </label>
                        <Input type="number" min="0" placeholder="—"
                          value={m.protein_g} onChange={e => updateMeal(m.tempId, { protein_g: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-amber-500 mb-0.5 block px-1 flex items-center gap-0.5">
                          <Wheat size={10} /> carbs
                        </label>
                        <Input type="number" min="0" placeholder="—"
                          value={m.carbs_g} onChange={e => updateMeal(m.tempId, { carbs_g: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-cyan-500 mb-0.5 block px-1 flex items-center gap-0.5">
                          <Droplets size={10} /> grasa
                        </label>
                        <Input type="number" min="0" placeholder="—"
                          value={m.fat_g} onChange={e => updateMeal(m.tempId, { fat_g: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Foods (solo si detailed) */}
                {showFoods && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 min-w-0">
                        <Apple size={11} className="shrink-0" /> Alimentos ({m.foods.length})
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPickerForMeal(m.tempId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
                          title="Buscar en biblioteca y productos argentinos"
                        >
                          <Search size={11} /> Buscar
                        </button>
                        <button
                          type="button"
                          onClick={() => addFood(m.tempId)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                          title="Cargar alimento manualmente"
                        >
                          <Plus size={11} /> Manual
                        </button>
                      </div>
                    </div>

                    {m.foods.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-3">
                        Tocá <span className="font-semibold text-violet-500">Buscar</span> para encontrar alimentos o <span className="font-semibold">Manual</span> para cargarlo a mano.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {m.foods.map((f) => {
                          const warning = checkFoodMacros(f);
                          return (
                            <div key={f.tempId} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="text" placeholder="Nombre del alimento"
                                  value={f.food_name}
                                  onChange={e => updateFood(m.tempId, f.tempId, { food_name: e.target.value })}
                                  className="flex-1 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFood(m.tempId, f.tempId)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                                  title="Eliminar alimento"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block px-1">Cantidad</label>
                                  <Input
                                    type="number" min="0" step="0.1" placeholder="—"
                                    value={f.amount}
                                    onChange={e => updateFood(m.tempId, f.tempId, { amount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block px-1">Unidad</label>
                                  <Select
                                    value={f.unit}
                                    onChange={e => updateFood(m.tempId, f.tempId, { unit: e.target.value })}
                                  >
                                    <option value="">—</option>
                                    {UNIT_SUGGESTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-1">
                                <div>
                                  <label className="text-[10px] font-medium text-orange-500 mb-0.5 px-1 flex items-center gap-0.5">
                                    <Flame size={9} /> kcal
                                  </label>
                                  <Input type="number" min="0" placeholder="—"
                                    value={f.calories} onChange={e => updateFood(m.tempId, f.tempId, { calories: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-rose-500 mb-0.5 px-1 flex items-center gap-0.5">
                                    <Beef size={9} /> prot
                                  </label>
                                  <Input type="number" min="0" placeholder="—"
                                    value={f.protein_g} onChange={e => updateFood(m.tempId, f.tempId, { protein_g: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-amber-500 mb-0.5 px-1 flex items-center gap-0.5">
                                    <Wheat size={9} /> carbs
                                  </label>
                                  <Input type="number" min="0" placeholder="—"
                                    value={f.carbs_g} onChange={e => updateFood(m.tempId, f.tempId, { carbs_g: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-cyan-500 mb-0.5 px-1 flex items-center gap-0.5">
                                    <Droplets size={9} /> grasa
                                  </label>
                                  <Input type="number" min="0" placeholder="—"
                                    value={f.fat_g} onChange={e => updateFood(m.tempId, f.tempId, { fat_g: e.target.value })} />
                                </div>
                              </div>

                              {warning && (
                                <div className="flex items-start gap-1 px-1 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                                  <p className="text-[10px] font-medium">{warning}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <Button variant="outline" fullWidth onClick={() => addMeal('desayuno')}>
        <Plus size={15} className="inline mr-1" /> Agregar comida
      </Button>

      <FoodSearchPicker
        open={pickerForMeal !== null}
        onClose={() => setPickerForMeal(null)}
        onAddManual={() => {
          if (!pickerForMeal) return;
          addFood(pickerForMeal);
          setPickerForMeal(null);
        }}
        onSelect={payload => {
          if (!pickerForMeal) return;
          const meal = meals.find(mm => mm.tempId === pickerForMeal);
          if (!meal) return;
          const newFood: DraftFood = {
            tempId: crypto.randomUUID(),
            food_name: payload.food_name,
            amount: String(payload.amount),
            unit: payload.unit,
            calories: String(payload.calories),
            protein_g: String(payload.protein_g),
            carbs_g: String(payload.carbs_g),
            fat_g: String(payload.fat_g),
          };
          updateMeal(pickerForMeal, { foods: [...meal.foods, newFood] });
          setPickerForMeal(null);
        }}
      />
    </div>
  );
};
