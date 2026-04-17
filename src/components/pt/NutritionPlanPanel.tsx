import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Archive, Apple, Flame, Beef, Wheat, Droplets, Info, AlertTriangle } from 'lucide-react';
import { Card, Button, Input } from '../UI';
import { NutritionPlanService, NutritionPlanFull } from '../../services/pt/NutritionPlanService';
import { NutritionPlan, NutritionDetailLevel, MealType } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';

interface NutritionPlanPanelProps {
  studentId: string;
  gymId: string;
}

const MEAL_LABEL: Record<MealType, { label: string; emoji: string }> = {
  desayuno:      { label: 'Desayuno',      emoji: '🌅' },
  media_mañana:  { label: 'Media mañana',  emoji: '🥐' },
  almuerzo:      { label: 'Almuerzo',      emoji: '🍽️' },
  merienda:      { label: 'Merienda',      emoji: '☕' },
  cena:          { label: 'Cena',          emoji: '🌙' },
  pre_entreno:   { label: 'Pre-entreno',   emoji: '⚡' },
  post_entreno:  { label: 'Post-entreno',  emoji: '💪' },
  snack:         { label: 'Snack',         emoji: '🍎' },
};

const DETAIL_LEVELS: { value: NutritionDetailLevel; label: string; hint: string }[] = [
  { value: 'macros',   label: 'Solo macros',      hint: 'Objetivos diarios sin detallar comidas' },
  { value: 'meals',    label: 'Comidas del día',  hint: 'Objetivos + qué come en cada momento' },
  { value: 'detailed', label: 'Plan detallado',   hint: 'Todo lo anterior + alimentos con gramajes' },
];

export const NutritionPlanPanel: React.FC<NutritionPlanPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<NutritionPlanFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [saving, setSaving] = useState(false);

  const [planForm, setPlanForm] = useState({
    title: '',
    description: '',
    detail_level: 'macros' as NutritionDetailLevel,
    calories_target: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [allPlans, active] = await Promise.all([
        NutritionPlanService.getByStudent(studentId),
        NutritionPlanService.getActivePlan(studentId),
      ]);
      setPlans(allPlans);
      setActivePlan(active);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const resetForm = () => setPlanForm({
    title: '', description: '', detail_level: 'macros',
    calories_target: '', protein_g: '', carbs_g: '', fat_g: '',
  });

  // kcal a partir de macros: P*4 + C*4 + G*9
  const macroBreakdown = useMemo(() => {
    const p = Number(planForm.protein_g) || 0;
    const c = Number(planForm.carbs_g) || 0;
    const f = Number(planForm.fat_g) || 0;
    const target = Number(planForm.calories_target) || 0;
    const fromMacros = p * 4 + c * 4 + f * 9;
    const hasAnyMacro = p > 0 || c > 0 || f > 0;
    const diff = fromMacros - target;
    // Tolerancia ±5% (o mínimo 20 kcal) por redondeos
    const tolerance = Math.max(20, Math.round(target * 0.05));
    const mismatched = hasAnyMacro && target > 0 && Math.abs(diff) > tolerance;
    const exceeds = hasAnyMacro && target > 0 && diff > tolerance;
    return { fromMacros, target, hasAnyMacro, diff, tolerance, mismatched, exceeds };
  }, [planForm.protein_g, planForm.carbs_g, planForm.fat_g, planForm.calories_target]);

  const handleCreatePlan = async () => {
    if (!planForm.title.trim()) { toast.error('Ingresá un título'); return; }
    if (macroBreakdown.exceeds) {
      toast.error(`Los macros suman ${macroBreakdown.fromMacros} kcal y superan el objetivo de ${macroBreakdown.target} kcal`);
      return;
    }
    setSaving(true);
    try {
      await NutritionPlanService.createPlan({
        gym_id: gymId,
        student_id: studentId,
        title: planForm.title.trim(),
        description: planForm.description.trim() || null,
        detail_level: planForm.detail_level,
        calories_target: planForm.calories_target ? Number(planForm.calories_target) : null,
        protein_g: planForm.protein_g ? Number(planForm.protein_g) : null,
        carbs_g: planForm.carbs_g ? Number(planForm.carbs_g) : null,
        fat_g: planForm.fat_g ? Number(planForm.fat_g) : null,
      });
      toast.success('Plan nutricional creado');
      resetForm();
      setShowNewPlan(false);
      await load();
    } catch (err: any) { toast.error(err?.message ?? 'Error al crear'); }
    setSaving(false);
  };

  const handleArchivePlan = async (planId: string) => {
    try {
      await NutritionPlanService.archivePlan(planId);
      toast.success('Plan archivado');
      await load();
    } catch { toast.error('Error al archivar'); }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await NutritionPlanService.deletePlan(planId);
      toast.success('Plan eliminado');
      await load();
    } catch { toast.error('Error al eliminar'); }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Plan activo — modo lectura */}
      {activePlan ? (
        <>
          <Card className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activePlan.title}</h3>
                <p className="text-[10px] font-medium text-violet-500 uppercase tracking-wider mt-0.5">
                  {DETAIL_LEVELS.find(d => d.value === activePlan.detail_level)?.label}
                </p>
                {activePlan.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{activePlan.description}</p>
                )}
              </div>
              <button
                onClick={() => handleArchivePlan(activePlan.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                title="Archivar plan"
              >
                <Archive size={14} />
              </button>
            </div>

            {/* Targets diarios */}
            {(activePlan.calories_target || activePlan.protein_g || activePlan.carbs_g || activePlan.fat_g) && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {activePlan.calories_target && (
                  <div className="text-center p-2 rounded-xl bg-orange-500/10">
                    <Flame size={14} className="mx-auto text-orange-500 mb-0.5" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.calories_target}</p>
                    <p className="text-[10px] text-slate-400">kcal</p>
                  </div>
                )}
                {activePlan.protein_g && (
                  <div className="text-center p-2 rounded-xl bg-rose-500/10">
                    <Beef size={14} className="mx-auto text-rose-500 mb-0.5" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.protein_g}g</p>
                    <p className="text-[10px] text-rose-500">prot</p>
                  </div>
                )}
                {activePlan.carbs_g && (
                  <div className="text-center p-2 rounded-xl bg-amber-500/10">
                    <Wheat size={14} className="mx-auto text-amber-500 mb-0.5" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.carbs_g}g</p>
                    <p className="text-[10px] text-amber-500">carbs</p>
                  </div>
                )}
                {activePlan.fat_g && (
                  <div className="text-center p-2 rounded-xl bg-cyan-500/10">
                    <Droplets size={14} className="mx-auto text-cyan-500 mb-0.5" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.fat_g}g</p>
                    <p className="text-[10px] text-cyan-500">grasas</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Meals (si las hay) */}
          {activePlan.meals.length > 0 && (
            <div className="space-y-2">
              {activePlan.meals.map((meal) => {
                const label = MEAL_LABEL[meal.meal_type];
                return (
                  <Card key={meal.id} className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{label.emoji}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {meal.name || label.label}
                      </span>
                      {meal.time_hint && (
                        <span className="text-[10px] text-slate-400 ml-1">{meal.time_hint}</span>
                      )}
                    </div>
                    {activePlan.detail_level === 'detailed' && meal.foods.length > 0 ? (
                      <div className="space-y-1 mt-2">
                        {meal.foods.map((food) => (
                          <div key={food.id} className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-900 dark:text-white">{food.food_name}</span>
                            {food.amount && food.unit && <span className="text-slate-400">({food.amount} {food.unit})</span>}
                            {food.calories && <span className="text-orange-500">{food.calories}kcal</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        {meal.calories && <span className="text-orange-500">{meal.calories}kcal</span>}
                        {meal.protein_g && <span className="text-rose-500">{meal.protein_g}g P</span>}
                        {meal.carbs_g && <span className="text-amber-500">{meal.carbs_g}g C</span>}
                        {meal.fat_g && <span className="text-cyan-500">{meal.fat_g}g G</span>}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Hint: wizard completo viene en Fase 3 */}
          <Card className="p-3 bg-violet-500/5 border-violet-200 dark:border-violet-500/20">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Para editar meals, alimentos y recalcular TMB usá el wizard (próximamente).
                Por ahora podés archivar el plan y crear uno nuevo.
              </p>
            </div>
          </Card>
        </>
      ) : !showNewPlan ? (
        <Card className="p-6 text-center">
          <Apple className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={32} />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Sin plan nutricional activo</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowNewPlan(true)}>
            <Plus size={15} className="inline mr-1" />
            Crear plan nutricional
          </Button>
        </Card>
      ) : null}

      {/* Form nuevo plan */}
      {showNewPlan && (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nuevo plan nutricional</h4>

          <Input
            placeholder="Título (ej: Plan hipercalórico)"
            value={planForm.title}
            onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
          />

          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            rows={2}
            placeholder="Descripción / pautas generales (opcional)"
            value={planForm.description}
            onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
          />

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Nivel de detalle</label>
            <select
              value={planForm.detail_level}
              onChange={e => setPlanForm({ ...planForm, detail_level: e.target.value as NutritionDetailLevel })}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            >
              {DETAIL_LEVELS.map(d => (
                <option key={d.value} value={d.value}>{d.label} — {d.hint}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Targets diarios</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Calorías" value={planForm.calories_target} onChange={e => setPlanForm({ ...planForm, calories_target: e.target.value })} />
              <Input type="number" placeholder="Proteína (g)" value={planForm.protein_g} onChange={e => setPlanForm({ ...planForm, protein_g: e.target.value })} />
              <Input type="number" placeholder="Carbos (g)" value={planForm.carbs_g} onChange={e => setPlanForm({ ...planForm, carbs_g: e.target.value })} />
              <Input type="number" placeholder="Grasas (g)" value={planForm.fat_g} onChange={e => setPlanForm({ ...planForm, fat_g: e.target.value })} />
            </div>

            {macroBreakdown.hasAnyMacro && (
              <div className={`mt-2 p-2.5 rounded-xl text-[11px] border ${
                macroBreakdown.exceeds
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  : macroBreakdown.mismatched
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              }`}>
                <div className="flex items-start gap-1.5">
                  {macroBreakdown.exceeds && <AlertTriangle size={13} className="shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium">
                      Macros = {macroBreakdown.fromMacros} kcal
                      {macroBreakdown.target > 0 && (
                        <span className="opacity-70"> · objetivo {macroBreakdown.target} kcal</span>
                      )}
                    </p>
                    {macroBreakdown.exceeds && (
                      <p className="opacity-90 mt-0.5">
                        Supera el objetivo en {macroBreakdown.diff} kcal. Reducí macros o subí las calorías.
                      </p>
                    )}
                    {!macroBreakdown.exceeds && macroBreakdown.mismatched && (
                      <p className="opacity-90 mt-0.5">
                        Faltan {Math.abs(macroBreakdown.diff)} kcal respecto al objetivo. ¿Querés ajustar?
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1.5">
              Referencia: 1g proteína = 4 kcal · 1g carbos = 4 kcal · 1g grasa = 9 kcal
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => { setShowNewPlan(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="secondary" fullWidth onClick={handleCreatePlan} disabled={saving || macroBreakdown.exceeds}>
              {saving ? 'Guardando...' : 'Crear plan'}
            </Button>
          </div>
        </Card>
      )}

      {/* Planes archivados */}
      {plans.filter(p => p.status === 'archived').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">
            Planes archivados
          </h4>
          {plans.filter(p => p.status === 'archived').map(plan => (
            <Card key={plan.id} className="p-3 flex items-center gap-3 opacity-60">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">{plan.title}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(plan.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
