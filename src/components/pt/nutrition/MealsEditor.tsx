import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../../UI';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Utensils, Apple, Flame, Beef, Wheat, Droplets, Search,
} from 'lucide-react';
import type { MealType, NutritionDetailLevel } from '../../../../shared/types';
import { FoodSearchPicker } from './FoodSearchPicker';

// ─── Drafts ──────────────────────────────────────────────────────────────────

export interface DraftFood {
  tempId: string;
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
  meal_type: MealType;
  name: string;
  time_hint: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  foods: DraftFood[];
}

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

// ─── Props ──────────────────────────────────────────────────────────────────

interface MealsEditorProps {
  meals: DraftMeal[];
  onChange: (meals: DraftMeal[]) => void;
  detailLevel: NutritionDetailLevel;  // 'meals' | 'detailed'
}

// ─── Component ──────────────────────────────────────────────────────────────

export const MealsEditor: React.FC<MealsEditorProps> = ({ meals, onChange, detailLevel }) => {
  const [expandedId, setExpandedId] = useState<string | null>(meals[0]?.tempId ?? null);
  const [pickerFor, setPickerFor] = useState<{ mealTempId: string; foodTempId: string } | null>(null);
  const showFoods = detailLevel === 'detailed';

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

                {/* Per-meal macros */}
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

                {/* Foods (solo si detailed) */}
                {showFoods && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Apple size={11} /> Alimentos ({m.foods.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => addFood(m.tempId)}
                        className="text-[11px] text-violet-500 hover:text-violet-600 font-medium inline-flex items-center gap-1"
                      >
                        <Plus size={11} /> Agregar
                      </button>
                    </div>

                    {m.foods.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">Sin alimentos cargados todavía.</p>
                    ) : (
                      <div className="space-y-2">
                        {m.foods.map((f) => (
                          <div key={f.tempId} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPickerFor({ mealTempId: m.tempId, foodTempId: f.tempId })}
                                className="p-2 rounded-lg text-violet-500 hover:text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 shrink-0"
                                title="Buscar alimento"
                              >
                                <Search size={13} />
                              </button>
                              <Input
                                type="text" placeholder="Ej: Pechuga de pollo"
                                value={f.food_name}
                                onChange={e => updateFood(m.tempId, f.tempId, { food_name: e.target.value })}
                                className="flex-1"
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
                              <Input
                                type="number" min="0" step="0.1" placeholder="Cantidad"
                                value={f.amount}
                                onChange={e => updateFood(m.tempId, f.tempId, { amount: e.target.value })}
                              />
                              <Select
                                value={f.unit}
                                onChange={e => updateFood(m.tempId, f.tempId, { unit: e.target.value })}
                              >
                                <option value="">Unidad…</option>
                                {UNIT_SUGGESTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              <Input type="number" min="0" placeholder="kcal"
                                value={f.calories} onChange={e => updateFood(m.tempId, f.tempId, { calories: e.target.value })} />
                              <Input type="number" min="0" placeholder="prot"
                                value={f.protein_g} onChange={e => updateFood(m.tempId, f.tempId, { protein_g: e.target.value })} />
                              <Input type="number" min="0" placeholder="carb"
                                value={f.carbs_g} onChange={e => updateFood(m.tempId, f.tempId, { carbs_g: e.target.value })} />
                              <Input type="number" min="0" placeholder="grasa"
                                value={f.fat_g} onChange={e => updateFood(m.tempId, f.tempId, { fat_g: e.target.value })} />
                            </div>
                          </div>
                        ))}
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
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={payload => {
          if (!pickerFor) return;
          updateFood(pickerFor.mealTempId, pickerFor.foodTempId, {
            food_name: payload.food_name,
            amount: String(payload.amount),
            unit: payload.unit,
            calories: String(payload.calories),
            protein_g: String(payload.protein_g),
            carbs_g: String(payload.carbs_g),
            fat_g: String(payload.fat_g),
          });
          setPickerFor(null);
        }}
      />
    </div>
  );
};
