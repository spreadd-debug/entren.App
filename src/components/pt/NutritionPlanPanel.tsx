import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Archive, ChevronDown, ChevronRight, Apple, Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { Card, Button, Input } from '../UI';
import { NutritionPlanService, NutritionPlanWithItems } from '../../services/pt/NutritionPlanService';
import { NutritionPlan, NutritionItem, MealLabel } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';

interface NutritionPlanPanelProps {
  studentId: string;
  gymId: string;
}

const MEAL_LABELS: MealLabel[] = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Snack'];

const MEAL_ICONS: Record<string, string> = {
  Desayuno: '🌅',
  Almuerzo: '🍽️',
  Merienda: '☕',
  Cena: '🌙',
  Snack: '🍎',
};

export const NutritionPlanPanel: React.FC<NutritionPlanPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<NutritionPlanWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(MEAL_LABELS));

  const [planForm, setPlanForm] = useState({
    title: '', description: '', calories_target: '', protein_g: '', carbs_g: '', fat_g: '',
  });
  const [itemForm, setItemForm] = useState({
    meal_label: 'Desayuno' as MealLabel, food_name: '', portion: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '',
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

  const handleCreatePlan = async () => {
    if (!planForm.title.trim()) { toast.error('Ingresá un título'); return; }
    setSaving(true);
    try {
      await NutritionPlanService.createPlan({
        gym_id: gymId,
        student_id: studentId,
        title: planForm.title.trim(),
        description: planForm.description.trim() || undefined,
        calories_target: planForm.calories_target ? Number(planForm.calories_target) : undefined,
        protein_g: planForm.protein_g ? Number(planForm.protein_g) : undefined,
        carbs_g: planForm.carbs_g ? Number(planForm.carbs_g) : undefined,
        fat_g: planForm.fat_g ? Number(planForm.fat_g) : undefined,
      });
      toast.success('Plan nutricional creado');
      setPlanForm({ title: '', description: '', calories_target: '', protein_g: '', carbs_g: '', fat_g: '' });
      setShowNewPlan(false);
      await load();
    } catch (err: any) { toast.error(err?.message ?? 'Error al crear'); }
    setSaving(false);
  };

  const handleAddItem = async () => {
    if (!activePlan) return;
    if (!itemForm.food_name.trim()) { toast.error('Ingresá un alimento'); return; }
    setSaving(true);
    try {
      const nextOrder = activePlan.items.filter(i => i.meal_label === itemForm.meal_label).length;
      await NutritionPlanService.addItem({
        plan_id: activePlan.id,
        meal_label: itemForm.meal_label,
        food_name: itemForm.food_name.trim(),
        portion: itemForm.portion.trim() || undefined,
        calories: itemForm.calories ? Number(itemForm.calories) : undefined,
        protein_g: itemForm.protein_g ? Number(itemForm.protein_g) : undefined,
        carbs_g: itemForm.carbs_g ? Number(itemForm.carbs_g) : undefined,
        fat_g: itemForm.fat_g ? Number(itemForm.fat_g) : undefined,
        notes: itemForm.notes.trim() || undefined,
        item_order: nextOrder,
      });
      toast.success('Alimento agregado');
      setItemForm({ meal_label: itemForm.meal_label, food_name: '', portion: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' });
      setShowAddItem(false);
      await load();
    } catch (err: any) { toast.error(err?.message ?? 'Error al agregar'); }
    setSaving(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await NutritionPlanService.deleteItem(itemId);
      setActivePlan(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : null);
    } catch { toast.error('No se pudo eliminar'); }
  };

  const handleArchivePlan = async (planId: string) => {
    try {
      await NutritionPlanService.updatePlan(planId, { status: 'archived' });
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

  const toggleMeal = (meal: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev);
      next.has(meal) ? next.delete(meal) : next.add(meal);
      return next;
    });
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
      {/* Active plan */}
      {activePlan ? (
        <>
          {/* Plan header */}
          <Card className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activePlan.title}</h3>
                {activePlan.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{activePlan.description}</p>
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

            {/* Macro targets */}
            {(activePlan.calories_target || activePlan.protein_g || activePlan.carbs_g || activePlan.fat_g) && (
              <div className="grid grid-cols-4 gap-2 mt-3">
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
                    <p className="text-[10px] text-slate-400">proteína</p>
                  </div>
                )}
                {activePlan.carbs_g && (
                  <div className="text-center p-2 rounded-xl bg-amber-500/10">
                    <Wheat size={14} className="mx-auto text-amber-500 mb-0.5" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.carbs_g}g</p>
                    <p className="text-[10px] text-slate-400">carbos</p>
                  </div>
                )}
                {activePlan.fat_g && (
                  <div className="text-center p-2 rounded-xl bg-cyan-500/10">
                    <Droplets size={14} className="mx-auto text-cyan-500 mb-0.5" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.fat_g}g</p>
                    <p className="text-[10px] text-slate-400">grasas</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Meals grouped */}
          {MEAL_LABELS.map((meal) => {
            const items = activePlan.items.filter(i => i.meal_label === meal);
            if (items.length === 0 && !expandedMeals.has(meal)) return null;
            const expanded = expandedMeals.has(meal);

            return (
              <Card key={meal} className="overflow-hidden">
                <button
                  onClick={() => toggleMeal(meal)}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm">{MEAL_ICONS[meal]}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex-1 text-left">{meal}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {items.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">Sin alimentos</p>
                    )}
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white font-medium">{item.food_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.portion && <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.portion}</span>}
                            {item.calories && <span className="text-[10px] text-orange-500 font-medium">{item.calories} kcal</span>}
                            {item.protein_g && <span className="text-[10px] text-rose-500 font-medium">{item.protein_g}g P</span>}
                            {item.carbs_g && <span className="text-[10px] text-amber-500 font-medium">{item.carbs_g}g C</span>}
                            {item.fat_g && <span className="text-[10px] text-cyan-500 font-medium">{item.fat_g}g G</span>}
                          </div>
                          {item.notes && <p className="text-[10px] text-slate-400 mt-0.5">{item.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Add item */}
          {!showAddItem ? (
            <Button variant="outline" fullWidth onClick={() => setShowAddItem(true)}>
              <Plus size={15} className="inline mr-1" />
              Agregar alimento
            </Button>
          ) : (
            <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
              <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nuevo alimento</h4>
              <select
                value={itemForm.meal_label}
                onChange={(e) => setItemForm({ ...itemForm, meal_label: e.target.value as MealLabel })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
              >
                {MEAL_LABELS.map(m => <option key={m} value={m}>{MEAL_ICONS[m]} {m}</option>)}
              </select>
              <Input placeholder="Alimento (ej: Avena con banana)" value={itemForm.food_name} onChange={e => setItemForm({ ...itemForm, food_name: e.target.value })} />
              <Input placeholder="Porción (ej: 1 taza, 200g)" value={itemForm.portion} onChange={e => setItemForm({ ...itemForm, portion: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Calorías" value={itemForm.calories} onChange={e => setItemForm({ ...itemForm, calories: e.target.value })} />
                <Input type="number" placeholder="Proteína (g)" value={itemForm.protein_g} onChange={e => setItemForm({ ...itemForm, protein_g: e.target.value })} />
                <Input type="number" placeholder="Carbos (g)" value={itemForm.carbs_g} onChange={e => setItemForm({ ...itemForm, carbs_g: e.target.value })} />
                <Input type="number" placeholder="Grasas (g)" value={itemForm.fat_g} onChange={e => setItemForm({ ...itemForm, fat_g: e.target.value })} />
              </div>
              <textarea
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                rows={2}
                placeholder="Notas (opcional)"
                value={itemForm.notes}
                onChange={e => setItemForm({ ...itemForm, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button variant="outline" fullWidth onClick={() => setShowAddItem(false)}>Cancelar</Button>
                <Button variant="secondary" fullWidth onClick={handleAddItem} disabled={saving}>
                  {saving ? 'Guardando...' : 'Agregar'}
                </Button>
              </div>
            </Card>
          )}
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

      {/* New plan form */}
      {showNewPlan && (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nuevo plan nutricional</h4>
          <Input placeholder="Título (ej: Plan hipercalórico)" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} />
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            rows={2}
            placeholder="Descripción / pautas generales (opcional)"
            value={planForm.description}
            onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Calorías diarias" value={planForm.calories_target} onChange={e => setPlanForm({ ...planForm, calories_target: e.target.value })} />
            <Input type="number" placeholder="Proteína (g)" value={planForm.protein_g} onChange={e => setPlanForm({ ...planForm, protein_g: e.target.value })} />
            <Input type="number" placeholder="Carbos (g)" value={planForm.carbs_g} onChange={e => setPlanForm({ ...planForm, carbs_g: e.target.value })} />
            <Input type="number" placeholder="Grasas (g)" value={planForm.fat_g} onChange={e => setPlanForm({ ...planForm, fat_g: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => { setShowNewPlan(false); setPlanForm({ title: '', description: '', calories_target: '', protein_g: '', carbs_g: '', fat_g: '' }); }}>
              Cancelar
            </Button>
            <Button variant="secondary" fullWidth onClick={handleCreatePlan} disabled={saving}>
              {saving ? 'Creando...' : 'Crear plan'}
            </Button>
          </div>
        </Card>
      )}

      {/* Archived plans */}
      {plans.filter(p => p.status === 'archived').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">Planes archivados</h4>
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
