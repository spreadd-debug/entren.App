import React, { useMemo, useState } from 'react';
import { Card, Button, Input } from '../../UI';
import {
  ChevronLeft, ChevronRight, Check, FileText, Calculator, Target, ClipboardCheck,
  Flame, Beef, Wheat, Droplets, Pencil,
} from 'lucide-react';
import type { NutritionDetailLevel, NutritionActivityLevel, NutritionTmbGoalType } from '../../../../shared/types';
import { TMBCalculator, TMBApplyPayload } from './TMBCalculator';
import { ACTIVITY_LABELS, GOAL_LABELS } from '../../../utils/tmbMath';
import type { TmbInputs } from '../../../utils/tmbMath';

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
}

interface NutritionPlanWizardProps {
  prefillInputs?: PrefillInputs | null;
  saving?: boolean;
  onSubmit: (args: NutritionPlanWizardSubmit) => void | Promise<void>;
  onCancel: () => void;
}

type Step = 'basics' | 'tmb' | 'targets' | 'review';

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'basics',  label: 'Básicos',  icon: FileText },
  { id: 'tmb',     label: 'Cálculo',  icon: Calculator },
  { id: 'targets', label: 'Targets',  icon: Target },
  { id: 'review',  label: 'Revisión', icon: ClipboardCheck },
];

const DETAIL_LEVELS: { value: NutritionDetailLevel; label: string; hint: string }[] = [
  { value: 'macros',   label: 'Solo macros',      hint: 'Objetivos diarios sin detallar comidas' },
  { value: 'meals',    label: 'Comidas del día',  hint: 'Objetivos + qué come en cada momento' },
  { value: 'detailed', label: 'Plan detallado',   hint: 'Todo lo anterior + alimentos con gramajes' },
];

export const NutritionPlanWizard: React.FC<NutritionPlanWizardProps> = ({
  prefillInputs, saving, onSubmit, onCancel,
}) => {
  const [step, setStep] = useState<Step>('basics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [detailLevel, setDetailLevel] = useState<NutritionDetailLevel>('macros');
  const [payload, setPayload] = useState<TMBApplyPayload | null>(null);

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const canAdvanceBasics = title.trim().length > 0;

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const handleTmbApply = (p: TMBApplyPayload) => {
    setPayload(p);
    setStep('targets');
  };

  const handleSubmit = async () => {
    if (!payload) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      detail_level: detailLevel,
      payload,
    });
  };

  // ── Progress indicator ─────────────────────────────────────────────────
  const progress = (
    <div className="flex items-center justify-between gap-1 px-1">
      {STEPS.map((s, i) => {
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
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full -mt-4 ${
                isDone ? 'bg-violet-500/40' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Step 1: Básicos ────────────────────────────────────────────────────
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

  // ── Step 2: TMB ────────────────────────────────────────────────────────
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

  // ── Step 3: Targets (read-only confirm) ───────────────────────────────
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

  // ── Step 4: Review ─────────────────────────────────────────────────────
  const reviewStep = (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Revisá el resumen y creá el plan. Más adelante vas a poder agregar comidas y alimentos.
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
      </Card>

      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
        El editor de comidas y alimentos está en camino. Por ahora el plan se crea solo con los objetivos diarios.
      </div>
    </div>
  );

  // ── Nav buttons ────────────────────────────────────────────────────────
  // TMB step manages its own buttons (calculator renders them)
  const nav = step === 'tmb' ? null : (
    <div className="flex gap-2 pt-2">
      {step === 'basics' ? (
        <Button variant="outline" fullWidth onClick={onCancel} disabled={saving}>Cancelar</Button>
      ) : (
        <Button variant="outline" fullWidth onClick={goBack} disabled={saving}>
          <ChevronLeft size={15} className="inline mr-1" /> Atrás
        </Button>
      )}
      {step === 'review' ? (
        <Button variant="secondary" fullWidth onClick={handleSubmit} disabled={saving || !payload}>
          {saving ? 'Creando...' : 'Crear plan'}
        </Button>
      ) : (
        <Button
          variant="secondary"
          fullWidth
          onClick={goNext}
          disabled={step === 'basics' ? !canAdvanceBasics : step === 'targets' ? !payload : false}
        >
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
        <span className="text-[10px] text-slate-400">Paso {stepIndex + 1} de {STEPS.length}</span>
      </div>
      {progress}
      <div className="pt-1">
        {step === 'basics' && basicsStep}
        {step === 'tmb' && tmbStep}
        {step === 'targets' && targetsStep}
        {step === 'review' && reviewStep}
      </div>
      {nav}
    </Card>
  );
};
