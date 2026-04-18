import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Beef, Wheat, Droplets, RotateCcw, AlertTriangle, Calculator, Info, Sparkles } from 'lucide-react';
import { Card, Button, Input, Select } from '../../UI';
import type { NutritionActivityLevel, NutritionTmbGoalType } from '../../../../shared/types';
import {
  BiologicalSex,
  TmbInputs,
  TmbValidationReason,
  calcNutritionTargets,
  validateTmbInputs,
  DEFAULT_GOAL_ADJUSTMENT,
  ACTIVITY_LABELS,
  GOAL_LABELS,
} from '../../../utils/tmbMath';

export interface TMBApplyPayload {
  // Snapshot
  tmb_kcal: number | null;
  tdee_kcal: number | null;
  activity_level: NutritionActivityLevel | null;
  tmb_goal_type: NutritionTmbGoalType | null;
  goal_adjustment_pct: number | null;
  calc_weight_kg: number | null;
  calc_height_cm: number | null;
  calc_age: number | null;
  calc_biological_sex: BiologicalSex | null;
  // Targets finales
  calories_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

interface TMBCalculatorProps {
  initialInputs?: Partial<TmbInputs> & {
    activityLevel?: NutritionActivityLevel;
    goalType?: NutritionTmbGoalType;
    goalAdjustmentPct?: number;
  };
  onApply: (payload: TMBApplyPayload) => void;
  onCancel?: () => void;
  applyLabel?: string;
  variant?: 'standalone' | 'embedded';
}

const ACTIVITY_OPTIONS: NutritionActivityLevel[] = ['sedentary', 'light', 'moderate', 'high', 'very_high'];
const GOAL_OPTIONS: NutritionTmbGoalType[] = ['lose_fat', 'maintain', 'gain_muscle'];

const toNum = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export const TMBCalculator: React.FC<TMBCalculatorProps> = ({
  initialInputs,
  onApply,
  onCancel,
  applyLabel = 'Aplicar al plan',
  variant = 'standalone',
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [hasPrefill] = useState(() =>
    Boolean(
      initialInputs?.weightKg ||
      initialInputs?.heightCm ||
      initialInputs?.age ||
      initialInputs?.biologicalSex
    )
  );

  // Inputs alumno
  const [weightKg, setWeightKg] = useState(initialInputs?.weightKg?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(initialInputs?.heightCm?.toString() ?? '');
  const [age, setAge] = useState(initialInputs?.age?.toString() ?? '');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | ''>(initialInputs?.biologicalSex ?? '');
  const [activityLevel, setActivityLevel] = useState<NutritionActivityLevel>(initialInputs?.activityLevel ?? 'moderate');
  const [goalType, setGoalType] = useState<NutritionTmbGoalType>(initialInputs?.goalType ?? 'maintain');
  const [goalPct, setGoalPct] = useState(
    (initialInputs?.goalAdjustmentPct ?? DEFAULT_GOAL_ADJUSTMENT[initialInputs?.goalType ?? 'maintain']).toString()
  );
  const [pctTouched, setPctTouched] = useState(false);
  const [proteinGPerKg, setProteinGPerKg] = useState('2.0');
  const [fatPct, setFatPct] = useState('25');

  // Overrides de targets (lo que el coach termina aplicando)
  const [kcalOverride, setKcalOverride] = useState('');
  const [proteinOverride, setProteinOverride] = useState('');
  const [carbsOverride, setCarbsOverride] = useState('');
  const [fatOverride, setFatOverride] = useState('');
  const [kcalTouched, setKcalTouched] = useState(false);
  const [proteinTouched, setProteinTouched] = useState(false);
  const [carbsTouched, setCarbsTouched] = useState(false);
  const [fatTouched, setFatTouched] = useState(false);

  // Reset de ajuste al cambiar objetivo (si el coach no lo tocó manualmente)
  useEffect(() => {
    if (!pctTouched) setGoalPct(DEFAULT_GOAL_ADJUSTMENT[goalType].toString());
  }, [goalType, pctTouched]);

  const validation = useMemo(() => validateTmbInputs({
    weightKg: toNum(weightKg),
    heightCm: toNum(heightCm),
    age: toNum(age),
    biologicalSex: (biologicalSex || undefined) as BiologicalSex | undefined,
  }), [weightKg, heightCm, age, biologicalSex]);

  const validationReason: TmbValidationReason | null =
    'reason' in validation ? validation.reason : null;

  const suggested = useMemo(() => {
    if (!validation.ok) return null;
    return calcNutritionTargets({
      weightKg: toNum(weightKg),
      heightCm: toNum(heightCm),
      age: toNum(age),
      biologicalSex: biologicalSex as BiologicalSex,
      activityLevel,
      goalType,
      goalAdjustmentPct: toNum(goalPct) || 0,
      proteinGPerKg: toNum(proteinGPerKg) || undefined,
      fatPctOfKcal: toNum(fatPct) ? toNum(fatPct) / 100 : undefined,
    });
  }, [validation.ok, weightKg, heightCm, age, biologicalSex, activityLevel, goalType, goalPct, proteinGPerKg, fatPct]);

  // Valores efectivos (override si el coach los tocó, si no sugerido)
  const effective = useMemo(() => {
    if (!suggested) return null;
    return {
      kcal: kcalTouched && kcalOverride ? Number(kcalOverride) : suggested.targetKcal,
      protein: proteinTouched && proteinOverride ? Number(proteinOverride) : suggested.macros.proteinG,
      carbs: carbsTouched && carbsOverride ? Number(carbsOverride) : suggested.macros.carbsG,
      fat: fatTouched && fatOverride ? Number(fatOverride) : suggested.macros.fatG,
    };
  }, [suggested, kcalTouched, kcalOverride, proteinTouched, proteinOverride, carbsTouched, carbsOverride, fatTouched, fatOverride]);

  const anyTouched = kcalTouched || proteinTouched || carbsTouched || fatTouched;

  const resetToSuggested = () => {
    setKcalTouched(false); setKcalOverride('');
    setProteinTouched(false); setProteinOverride('');
    setCarbsTouched(false); setCarbsOverride('');
    setFatTouched(false); setFatOverride('');
  };

  // Macros-vs-kcal check sobre los efectivos
  const macroSanity = useMemo(() => {
    if (!effective) return null;
    const kcalFromMacros = effective.protein * 4 + effective.carbs * 4 + effective.fat * 9;
    const diff = kcalFromMacros - effective.kcal;
    const tolerance = Math.max(20, Math.round(effective.kcal * 0.05));
    return {
      kcalFromMacros,
      diff,
      mismatched: Math.abs(diff) > tolerance,
      exceeds: diff > tolerance,
    };
  }, [effective]);

  // ── Modo manual ──────────────────────────────────────────────────────────
  const [manualTitle] = useState(''); // placeholder — el padre maneja título
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const manualBreakdown = useMemo(() => {
    const p = Number(manualProtein) || 0;
    const c = Number(manualCarbs) || 0;
    const f = Number(manualFat) || 0;
    const target = Number(manualKcal) || 0;
    const fromMacros = p * 4 + c * 4 + f * 9;
    const hasAnyMacro = p > 0 || c > 0 || f > 0;
    const diff = fromMacros - target;
    const tolerance = Math.max(20, Math.round(target * 0.05));
    return {
      fromMacros,
      target,
      hasAnyMacro,
      diff,
      exceeds: hasAnyMacro && target > 0 && diff > tolerance,
      mismatched: hasAnyMacro && target > 0 && Math.abs(diff) > tolerance,
    };
  }, [manualTitle, manualKcal, manualProtein, manualCarbs, manualFat]);

  const handleApply = () => {
    if (manualMode) {
      onApply({
        tmb_kcal: null,
        tdee_kcal: null,
        activity_level: null,
        tmb_goal_type: null,
        goal_adjustment_pct: null,
        calc_weight_kg: null,
        calc_height_cm: null,
        calc_age: null,
        calc_biological_sex: null,
        calories_target: manualKcal ? Number(manualKcal) : null,
        protein_g: manualProtein ? Number(manualProtein) : null,
        carbs_g: manualCarbs ? Number(manualCarbs) : null,
        fat_g: manualFat ? Number(manualFat) : null,
      });
      return;
    }
    if (!suggested || !effective) return;
    onApply({
      tmb_kcal: suggested.tmbKcal,
      tdee_kcal: suggested.tdeeKcal,
      activity_level: activityLevel,
      tmb_goal_type: goalType,
      goal_adjustment_pct: toNum(goalPct) || 0,
      calc_weight_kg: toNum(weightKg),
      calc_height_cm: toNum(heightCm),
      calc_age: toNum(age),
      calc_biological_sex: biologicalSex as BiologicalSex,
      calories_target: effective.kcal,
      protein_g: effective.protein,
      carbs_g: effective.carbs,
      fat_g: effective.fat,
    });
  };

  const canApply = manualMode
    ? !manualBreakdown.exceeds && !!manualKcal
    : !!suggested && !!effective && !(macroSanity?.exceeds ?? false);

  // ─── Delta helpers ──────────────────────────────────────────────────────────
  const kcalDeltaLabel = (): string | null => {
    if (!suggested || !effective) return null;
    const diff = effective.kcal - suggested.targetKcal;
    if (diff === 0) return null;
    const sign = diff > 0 ? '+' : '−';
    const pctOverGet = Math.round(((effective.kcal - suggested.tdeeKcal) / suggested.tdeeKcal) * 100);
    const meaning = pctOverGet > 0 ? `superávit del ${pctOverGet}%` : pctOverGet < 0 ? `déficit del ${Math.abs(pctOverGet)}%` : 'mantenimiento';
    return `${sign}${Math.abs(diff)} vs recomendado · ${meaning} sobre GET`;
  };

  const macroDeltaLabel = (override: number, suggestedVal: number, unit = 'g'): string | null => {
    const diff = override - suggestedVal;
    if (diff === 0) return null;
    const sign = diff > 0 ? '+' : '−';
    return `${sign}${Math.abs(diff)}${unit} vs recomendado`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  const content = (
    <>
      <div className="flex items-center gap-2">
        <Calculator size={14} className="text-violet-500" />
        <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">
          Calculadora TMB · Mifflin-St Jeor
        </h4>
      </div>

      {/* ── Intro / explicación ──────────────────────────────────────── */}
      {!manualMode && (
        <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setShowHow(s => !s)}
            className="flex items-center justify-between gap-1.5 font-medium text-violet-600 dark:text-violet-400 w-full text-left"
          >
            <span className="inline-flex items-center gap-1.5">
              <Info size={12} /> ¿Cómo funciona el cálculo?
            </span>
            <span className="text-slate-400">{showHow ? '−' : '+'}</span>
          </button>
          {showHow && (
            <div className="mt-2 space-y-1.5 leading-relaxed">
              <p>• <strong className="text-slate-700 dark:text-slate-200">TMB</strong> (Tasa Metabólica Basal): calorías que quema el cuerpo en reposo. Calculado con Mifflin-St Jeor.</p>
              <p>• <strong className="text-slate-700 dark:text-slate-200">GET</strong> (Gasto Energético Total): TMB × factor de actividad — lo que el alumno gasta por día.</p>
              <p>• <strong className="text-slate-700 dark:text-slate-200">Objetivo</strong>: GET ± un % según la meta (perder grasa, mantener, ganar músculo).</p>
              <p className="pt-1 text-slate-500 dark:text-slate-500">Los valores sugeridos son una recomendación. Editalos si tenés más contexto del alumno.</p>
            </div>
          )}
        </div>
      )}

      {!manualMode && (
        <>
          {/* ── Sección A: Datos del alumno ────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Datos del alumno</p>
              {hasPrefill && (
                <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400">
                  <Sparkles size={10} /> Cargado desde el perfil — editá si necesitás
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number" step="0.1" min="0" placeholder="Peso (kg)"
                value={weightKg} onChange={e => setWeightKg(e.target.value)}
              />
              <Input
                type="number" step="0.1" min="0" placeholder="Altura (cm)"
                value={heightCm} onChange={e => setHeightCm(e.target.value)}
              />
              <Input
                type="number" min="0" placeholder="Edad"
                value={age} onChange={e => setAge(e.target.value)}
              />
              <Select value={biologicalSex} onChange={e => setBiologicalSex(e.target.value as BiologicalSex | '')}>
                <option value="">Sexo biológico</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
              </Select>
            </div>

            <div>
              <Select value={activityLevel} onChange={e => setActivityLevel(e.target.value as NutritionActivityLevel)}>
                {ACTIVITY_OPTIONS.map(lv => (
                  <option key={lv} value={lv}>{ACTIVITY_LABELS[lv].label}</option>
                ))}
              </Select>
              <p className="text-[10px] text-slate-400 mt-1 px-1">{ACTIVITY_LABELS[activityLevel].hint}</p>
            </div>

            <div>
              <Select value={goalType} onChange={e => { setGoalType(e.target.value as NutritionTmbGoalType); setPctTouched(false); }}>
                {GOAL_OPTIONS.map(g => (
                  <option key={g} value={g}>{GOAL_LABELS[g].label} ({GOAL_LABELS[g].defaultPct > 0 ? '+' : ''}{GOAL_LABELS[g].defaultPct}%)</option>
                ))}
              </Select>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number" step="1"
                  value={goalPct}
                  onChange={e => { setGoalPct(e.target.value); setPctTouched(true); }}
                  className="flex-1"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">% sobre GET</span>
                {pctTouched && (
                  <button
                    type="button"
                    onClick={() => { setGoalPct(DEFAULT_GOAL_ADJUSTMENT[goalType].toString()); setPctTouched(false); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10"
                    title="Volver al default"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Sección B: Objetivos sugeridos ─────────────────────────── */}
          {!validation.ok ? (
            <Card className="p-4 bg-slate-50 dark:bg-slate-800/50 border-dashed">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                {validationReason === 'missing' && 'Completá los datos del alumno para ver el cálculo.'}
                {validationReason === 'age_out_of_range' && 'Edad fuera de rango (10–100 años).'}
                {validationReason === 'weight_out_of_range' && 'Peso fuera de rango plausible (20–300 kg).'}
                {validationReason === 'height_out_of_range' && 'Altura fuera de rango plausible (100–230 cm).'}
              </p>
            </Card>
          ) : suggested && effective && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Objetivos sugeridos</p>
                {anyTouched && (
                  <button
                    type="button"
                    onClick={resetToSuggested}
                    className="text-[10px] text-violet-500 hover:text-violet-600 font-medium inline-flex items-center gap-1"
                  >
                    <RotateCcw size={10} /> Volver a los sugeridos
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-[11px] text-violet-700 dark:text-violet-300">
                  TMB <span className="font-bold">{suggested.tmbKcal}</span> kcal ·
                  GET <span className="font-bold">{suggested.tdeeKcal}</span> kcal ·
                  Objetivo <span className="font-bold">{suggested.targetKcal}</span> kcal
                  {' '}({(toNum(goalPct) || 0) > 0 ? '+' : ''}{toNum(goalPct) || 0}% sobre GET)
                </p>
              </div>

              {/* Calorías */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Flame size={11} className="text-orange-500" /> Calorías objetivo (kcal)
                </label>
                <Input
                  type="number" min="0"
                  value={kcalTouched ? kcalOverride : suggested.targetKcal.toString()}
                  onChange={e => { setKcalOverride(e.target.value); setKcalTouched(true); }}
                />
                <p className={`text-[10px] mt-0.5 px-1 ${
                  kcalTouched && kcalDeltaLabel() ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                }`}>
                  {kcalTouched && kcalDeltaLabel() ? kcalDeltaLabel() : '= recomendado'}
                </p>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mb-1">
                    <Beef size={11} /> Proteína (g)
                  </label>
                  <Input
                    type="number" min="0"
                    value={proteinTouched ? proteinOverride : suggested.macros.proteinG.toString()}
                    onChange={e => { setProteinOverride(e.target.value); setProteinTouched(true); }}
                  />
                  <p className={`text-[10px] mt-0.5 px-1 ${
                    proteinTouched && macroDeltaLabel(effective.protein, suggested.macros.proteinG) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`}>
                    {proteinTouched && macroDeltaLabel(effective.protein, suggested.macros.proteinG) || '= rec.'}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-amber-500 flex items-center gap-1 mb-1">
                    <Wheat size={11} /> Carbos (g)
                  </label>
                  <Input
                    type="number" min="0"
                    value={carbsTouched ? carbsOverride : suggested.macros.carbsG.toString()}
                    onChange={e => { setCarbsOverride(e.target.value); setCarbsTouched(true); }}
                  />
                  <p className={`text-[10px] mt-0.5 px-1 ${
                    carbsTouched && macroDeltaLabel(effective.carbs, suggested.macros.carbsG) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`}>
                    {carbsTouched && macroDeltaLabel(effective.carbs, suggested.macros.carbsG) || '= rec.'}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-cyan-500 flex items-center gap-1 mb-1">
                    <Droplets size={11} /> Grasas (g)
                  </label>
                  <Input
                    type="number" min="0"
                    value={fatTouched ? fatOverride : suggested.macros.fatG.toString()}
                    onChange={e => { setFatOverride(e.target.value); setFatTouched(true); }}
                  />
                  <p className={`text-[10px] mt-0.5 px-1 ${
                    fatTouched && macroDeltaLabel(effective.fat, suggested.macros.fatG) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`}>
                    {fatTouched && macroDeltaLabel(effective.fat, suggested.macros.fatG) || '= rec.'}
                  </p>
                </div>
              </div>

              {/* Sanity footer */}
              {macroSanity && (
                <div className={`p-2 rounded-xl text-[11px] border ${
                  macroSanity.exceeds
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : macroSanity.mismatched
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <div className="flex items-start gap-1.5">
                    {macroSanity.exceeds && <AlertTriangle size={12} className="shrink-0 mt-0.5" />}
                    <div>
                      Macros = <span className="font-bold">{macroSanity.kcalFromMacros}</span> kcal ·
                      objetivo <span className="font-bold">{effective.kcal}</span> kcal
                      {macroSanity.exceeds && <p className="opacity-90 mt-0.5">Los macros superan las calorías objetivo en {macroSanity.diff} kcal.</p>}
                      {!macroSanity.exceeds && macroSanity.mismatched && <p className="opacity-90 mt-0.5">Faltan {Math.abs(macroSanity.diff)} kcal respecto al objetivo.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modo manual (escape hatch) ─────────────────────────────────── */}
      {manualMode && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Targets manuales</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Calorías" value={manualKcal} onChange={e => setManualKcal(e.target.value)} />
            <Input type="number" placeholder="Proteína (g)" value={manualProtein} onChange={e => setManualProtein(e.target.value)} />
            <Input type="number" placeholder="Carbos (g)" value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} />
            <Input type="number" placeholder="Grasas (g)" value={manualFat} onChange={e => setManualFat(e.target.value)} />
          </div>
          {manualBreakdown.hasAnyMacro && (
            <div className={`p-2 rounded-xl text-[11px] border ${
              manualBreakdown.exceeds
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                : manualBreakdown.mismatched
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            }`}>
              Macros = {manualBreakdown.fromMacros} kcal
              {manualBreakdown.target > 0 && <> · objetivo {manualBreakdown.target} kcal</>}
              {manualBreakdown.exceeds && <p className="opacity-90 mt-0.5">Supera el objetivo en {manualBreakdown.diff} kcal.</p>}
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            Referencia: 1g proteína = 4 kcal · 1g carbos = 4 kcal · 1g grasa = 9 kcal
          </p>
        </div>
      )}

      {/* Toggle modo avanzado — link chiquito, poco prominente */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => setManualMode(m => !m)}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2"
        >
          {manualMode ? '← Volver a la calculadora TMB' : 'Ya tengo los números — ingresarlos manualmente'}
        </button>
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button variant="outline" fullWidth onClick={onCancel}>Cancelar</Button>
        )}
        <Button variant="secondary" fullWidth onClick={handleApply} disabled={!canApply}>
          {applyLabel}
        </Button>
      </div>
    </>
  );

  return variant === 'embedded'
    ? <div className="space-y-4">{content}</div>
    : <Card className="p-4 space-y-4 border-violet-200 dark:border-violet-500/30">{content}</Card>;
};
