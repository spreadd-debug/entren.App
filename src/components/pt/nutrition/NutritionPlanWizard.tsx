import React, { useMemo, useState } from 'react';
import { Card, Button, Input } from '../../UI';
import {
  ChevronLeft, ChevronRight, Check, FileText, Calculator, Target, ClipboardCheck,
  Flame, Beef, Wheat, Droplets, Pencil, Utensils,
} from 'lucide-react';
import type { NutritionDetailLevel, NutritionActivityLevel, NutritionTmbGoalType } from '../../../../shared/types';
import { TMBCalculator, TMBApplyPayload } from './TMBCalculator';
import { ACTIVITY_LABELS, GOAL_LABELS } from '../../../utils/tmbMath';
import type { TmbInputs } from '../../../utils/tmbMath';
import { MealsEditor, DraftMeal } from './MealsEditor';
import type { CreateMealInput, CreateFoodInput } from '../../../services/pt/NutritionPlanService';

type PrefillInputs = Partial<TmbInputs> & {
  activityLevel?: NutritionActivityLevel;
  goalType?: NutritionTmbGoalType;
  goalAdjustmentPct?: number;
};

export interface NutritionPlanWizardSubmit {
  title: string;
  description: string | null;
  detail_level: NutritionDetailLevel;
  payload: TMBApplyPayload;
  meals: CreateMealInput[];
}

interface NutritionPlanWizardProps {
  prefillInputs?: PrefillInputs | null;
  saving?: boolean;
  onSubmit: (args: NutritionPlanWizardSubmit) => void | Promise<void>;
  onCancel: () => void;
}

type Step = 'basics' | 'tmb' | 'targets' | 'meals' | 'review';

const BASE_STEPS: { id: Step; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'basics',  label: 'Básicos',  icon: FileText },
  { id: 'tmb',     label: 'Cálculo',  icon: Calculator },
  { id: 'targets', label: 'Targets',  icon: Target },
  { id: 'meals',   label: 'Comidas',  icon: Utensils },
  { id: 'review',  label: 'Revisión', icon: ClipboardCheck },
];

const DETAIL_LEVELS: { value: NutritionDetailLevel; label: string; hint: string }[] = [
  { value: 'macros',   label: 'Solo macros',      hint: 'Objetivos diarios sin detallar comidas' },
  { value: 'meals',    label: 'Comidas del día',  hint: 'Objetivos + qué come en cada momento' },
  { value: 'detailed', label: 'Plan detallado',   hint: 'Todo lo anterior + alimentos con gramajes' },
];

const draftToCreateMeal = (m: DraftMeal, order: number, includeFoods: boolean): CreateMealInput => {
  const num = (s: string): number | null => {
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const foods: CreateFoodInput[] | undefined = includeFoods
    ? m.foods
        .filter(f => f.food_name.trim().length > 0)
        .map((f, i) => ({
          food_name: f.food_name.trim(),
          amount: num(f.amount),
          unit: f.unit.trim() || null,
          calories: num(f.calories),
          protein_g: num(f.protein_g),
          carbs_g: num(f.carbs_g),
          fat_g: num(f.fat_g),
          order_index: i,
        }))
    : undefined;
  return {
    meal_type: m.meal_type,
    order_index: order,
    name: m.name.trim() || null,
    time_hint: m.time_hint.trim() || null,
    calories: num(m.calories),
    protein_g: num(m.protein_g),
    carbs_g: num(m.carbs_g),
    fat_g: num(m.fat_g),
    foods,
  };
};

export const NutritionPlanWizard: React.FC<NutritionPlanWizardProps> = ({
  prefillInputs, saving, onSubmit, onCancel,
}) => {
  const [step, setStep] = useState<Step>('basics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [detailLevel, setDetailLevel] = useState<NutritionDetailLevel>('macros');
  const [payload, setPayload] = useState<TMBApplyPayload | null>(null);
  const [meals, setMeals] = useState<DraftMeal[]>([]);

  // Steps visibles según nivel de detalle (si es 'macros', saltamos el paso de comidas)
  const activeSteps = useMemo(
    () => (detailLevel === 'macros' ? BASE_STEPS.filter(s => s.id !== 'meals') : BASE_STEPS),
    [detailLevel]
  );

  // Si el paso actual ya no está en activeSteps (coach bajó a 'macros' estando en 'meals'), volver a basics
  React.useEffect(() => {
    if (!activeSteps.some(s => s.id === step)) setStep('basics');
  }, [activeSteps, step]);

  const stepIndex = activeSteps.findIndex(s => s.id === step);
  const canAdvanceBasics = title.trim().length > 0;

  const goNext = () => {
    const next = activeSteps[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goBack = () => {
    const prev = activeSteps[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const handleTmbApply = (p: TMBApplyPayload) => {
    setPayload(p);
    setStep('targets');
  };

  const handleSubmit = async () => {
    if (!payload) return;
    // Auto-promo: si el coach eligió 'meals' pero igual cargó alimentos, el
    // plan pasa a 'detailed' para que esos alimentos se persistan.
    const anyFoodAdded = meals.some(m => m.foods.some(f => f.food_name.trim().length > 0));
    const effectiveLevel: NutritionDetailLevel =
      detailLevel === 'meals' && anyFoodAdded ? 'detailed' : detailLevel;
    const includeFoods = effectiveLevel === 'detailed';
    const mealsToCreate = effectiveLevel === 'macros'
      ? []
      : meals.map((m, i) => draftToCreateMeal(m, i, includeFoods));
    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      detail_level: effectiveLevel,
      payload,
      meals: mealsToCreate,
    });
  };

  // ── Progress indicator ─────────────────────────────────────────────────
  const progress = (
    <div className="flex items-center justify-between gap-1 px-1">
      {activeSteps.map((s, i) => {
        const Icon = s.icon;
        const isActive = s.id === step;
        const isDone = i < stepIndex;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'bg-violet-500 text-white'
                : isDone ? 'bg-violet-500/20 text-violet-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {isDone ? <Check size={14} /> : <Icon size={13} />}
              </div>
              <span className={`text-[10px] font-medium truncate ${
                isActive ? 'text-violet-500'
                : isDone ? 'text-slate-500'
                : 'text-slate-400'
              }`}>{s.label}</span>
            </div>
            {i < activeSteps.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full -mt-4 ${
                isDone ? 'bg-violet-500/40' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Step: Básicos ──────────────────────────────────────────────────────
  const basicsStep = (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
          Título del plan <span className="text-rose-500">*</span>
        </label>
        <Input
          placeholder="Ej: Plan hipercalórico de volumen"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
          Descripción (opcional)
        </label>
        <textarea
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
          rows={2}
          placeholder="Pautas generales, recomendaciones, horarios..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
          Nivel de detalle
        </label>
        <div className="space-y-2">
          {DETAIL_LEVELS.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDetailLevel(d.value)}
              className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                detailLevel === d.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">{d.label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{d.hint}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step: TMB ──────────────────────────────────────────────────────────
  const tmbStep = (
    <TMBCalculator
      variant="embedded"
      applyLabel="Siguiente →"
      initialInputs={prefillInputs ?? undefined}
      initialTargets={payload ? {
        caloriesTarget: payload.calories_target,
        proteinG: payload.protein_g,
        carbsG: payload.carbs_g,
        fatG: payload.fat_g,
      } : undefined}
      initialMode={payload && payload.tmb_kcal == null ? 'manual' : 'tmb'}
      onApply={handleTmbApply}
      onCancel={goBack}
    />
  );

  // ── Step: Targets (read-only confirm) ─────────────────────────────────
  const targetsStep = useMemo(() => {
    if (!payload) {
      return (
        <Card className="p-4 bg-slate-50 dark:bg-slate-800/50 border-dashed">
          <p className="text-xs text-slate-500 text-center">Volvé al paso anterior y calculá los targets.</p>
        </Card>
      );
    }
    const usedTmb = payload.tmb_kcal != null;
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {usedTmb
            ? 'Confirmá los targets calculados. Podés volver al cálculo si querés ajustar.'
            : 'Confirmá los targets que cargaste manualmente.'}
        </p>

        {usedTmb && (
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-700 dark:text-violet-300 space-y-0.5">
            <p>
              TMB <span className="font-bold">{payload.tmb_kcal}</span> kcal ·
              GET <span className="font-bold">{payload.tdee_kcal}</span> kcal
            </p>
            <p className="text-violet-600/80 dark:text-violet-400/80">
              {payload.activity_level && ACTIVITY_LABELS[payload.activity_level].label} ·
              {' '}{payload.tmb_goal_type && GOAL_LABELS[payload.tmb_goal_type].label}
              {' '}({(payload.goal_adjustment_pct ?? 0) > 0 ? '+' : ''}{payload.goal_adjustment_pct ?? 0}% sobre GET)
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {payload.calories_target != null && (
            <div className="text-center p-3 rounded-xl bg-orange-500/10">
              <Flame size={16} className="mx-auto text-orange-500 mb-1" />
              <p className="text-sm font-black text-slate-900 dark:text-white">{payload.calories_target}</p>
              <p className="text-[10px] text-orange-500 font-medium">kcal</p>
            </div>
          )}
          {payload.protein_g != null && (
            <div className="text-center p-3 rounded-xl bg-rose-500/10">
              <Beef size={16} className="mx-auto text-rose-500 mb-1" />
              <p className="text-sm font-black text-slate-900 dark:text-white">{payload.protein_g}g</p>
              <p className="text-[10px] text-rose-500 font-medium">prot</p>
            </div>
          )}
          {payload.carbs_g != null && (
            <div className="text-center p-3 rounded-xl bg-amber-500/10">
              <Wheat size={16} className="mx-auto text-amber-500 mb-1" />
              <p className="text-sm font-black text-slate-900 dark:text-white">{payload.carbs_g}g</p>
              <p className="text-[10px] text-amber-500 font-medium">carbs</p>
            </div>
          )}
          {payload.fat_g != null && (
            <div className="text-center p-3 rounded-xl bg-cyan-500/10">
              <Droplets size={16} className="mx-auto text-cyan-500 mb-1" />
              <p className="text-sm font-black text-slate-900 dark:text-white">{payload.fat_g}g</p>
              <p className="text-[10px] text-cyan-500 font-medium">grasas</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setStep('tmb')}
          className="inline-flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-600 font-medium"
        >
          <Pencil size={11} /> Volver a ajustar
        </button>
      </div>
    );
  }, [payload]);

  // ── Step: Meals ────────────────────────────────────────────────────────
  const mealsStep = (
    <div className="space-y-3">
      <div className="p-2.5 rounded-xl bg-violet-500/5 border border-violet-500/20 text-[11px] text-slate-600 dark:text-slate-400">
        {detailLevel === 'detailed'
          ? 'Cargá las comidas del día y, dentro de cada una, los alimentos con sus gramajes.'
          : 'Cargá las comidas del día. Podés dejar los macros por comida en blanco, o usar Buscar para agregar alimentos (el plan se marca como detallado al guardar).'}
      </div>
      <MealsEditor
        meals={meals}
        onChange={setMeals}
        detailLevel={detailLevel}
        targets={payload ? {
          kcal: payload.calories_target,
          protein: payload.protein_g,
          carbs: payload.carbs_g,
          fat: payload.fat_g,
        } : undefined}
      />
    </div>
  );

  // ── Step: Review ───────────────────────────────────────────────────────
  const reviewStep = (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Revisá el resumen y creá el plan. Después de crearlo vas a poder ajustarlo desde la ficha.
      </p>

      <Card className="p-3 space-y-2">
        <div>
          <p className="text-[10px] font-medium text-violet-500 uppercase tracking-wider">Básicos</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{title || '(sin título)'}</p>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Nivel: <span className="font-medium">{DETAIL_LEVELS.find(d => d.value === detailLevel)?.label}</span>
          </p>
        </div>

        {payload && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-medium text-violet-500 uppercase tracking-wider">Targets diarios</p>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {payload.calories_target != null && (
                <div className="text-center p-2 rounded-xl bg-orange-500/10">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{payload.calories_target}</p>
                  <p className="text-[9px] text-orange-500">kcal</p>
                </div>
              )}
              {payload.protein_g != null && (
                <div className="text-center p-2 rounded-xl bg-rose-500/10">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{payload.protein_g}g</p>
                  <p className="text-[9px] text-rose-500">prot</p>
                </div>
              )}
              {payload.carbs_g != null && (
                <div className="text-center p-2 rounded-xl bg-amber-500/10">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{payload.carbs_g}g</p>
                  <p className="text-[9px] text-amber-500">carbs</p>
                </div>
              )}
              {payload.fat_g != null && (
                <div className="text-center p-2 rounded-xl bg-cyan-500/10">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{payload.fat_g}g</p>
                  <p className="text-[9px] text-cyan-500">grasas</p>
                </div>
              )}
            </div>
          </div>
        )}

        {detailLevel !== 'macros' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-medium text-violet-500 uppercase tracking-wider">Comidas</p>
            {meals.length === 0 ? (
              <p className="text-[11px] text-slate-400 mt-1">Sin comidas cargadas.</p>
            ) : (
              <div className="mt-1 space-y-0.5">
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-medium">{meals.length}</span> comida{meals.length === 1 ? '' : 's'}
                  {detailLevel === 'detailed' && (() => {
                    const totalFoods = meals.reduce((acc, m) => acc + m.foods.filter(f => f.food_name.trim()).length, 0);
                    return ` · ${totalFoods} alimento${totalFoods === 1 ? '' : 's'}`;
                  })()}
                </p>
                <p className="text-[10px] text-slate-400">
                  {meals.map(m => m.name.trim() || m.meal_type.replace('_', ' ')).join(' · ')}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );

  // ── Nav buttons ────────────────────────────────────────────────────────
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === activeSteps.length - 1;
  const disableNext =
    step === 'basics' ? !canAdvanceBasics
    : step === 'targets' ? !payload
    : false;

  const nav = step === 'tmb' ? null : (
    <div className="flex gap-2 pt-2">
      {isFirst ? (
        <Button variant="outline" fullWidth onClick={onCancel} disabled={saving}>Cancelar</Button>
      ) : (
        <Button variant="outline" fullWidth onClick={goBack} disabled={saving}>
          <ChevronLeft size={15} className="inline mr-1" /> Atrás
        </Button>
      )}
      {isLast ? (
        <Button variant="secondary" fullWidth onClick={handleSubmit} disabled={saving || !payload}>
          {saving ? 'Creando...' : 'Crear plan'}
        </Button>
      ) : (
        <Button variant="secondary" fullWidth onClick={goNext} disabled={disableNext}>
          Siguiente <ChevronRight size={15} className="inline ml-1" />
        </Button>
      )}
    </div>
  );

  return (
    <Card className="p-4 space-y-4 border-violet-200 dark:border-violet-500/30">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">
          Nuevo plan nutricional
        </h4>
        <span className="text-[10px] text-slate-400">Paso {stepIndex + 1} de {activeSteps.length}</span>
      </div>
      {progress}
      <div className="pt-1">
        {step === 'basics' && basicsStep}
        {step === 'tmb' && tmbStep}
        {step === 'targets' && targetsStep}
        {step === 'meals' && mealsStep}
        {step === 'review' && reviewStep}
      </div>
      {nav}
    </Card>
  );
};
