import React, { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, DollarSign, Calendar, Hash } from 'lucide-react';
import { Card, Button, Input } from '../components/UI';
import { Plan } from '../../shared/types';

interface PlansViewProps {
  plans: Plan[];
  onBack: () => void;
  onSavePlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  onBack,
  onSavePlan,
  onDeletePlan,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);

  const safePlans = Array.isArray(plans) ? plans : [];

  const normalizedPlans = useMemo(() => {
    return safePlans.map((plan: any) => ({
      ...plan,
      name: plan.name ?? plan.nombre ?? '',
      price: Number(plan.price ?? plan.precio ?? 0),
      durationDays: Number(plan.durationDays ?? plan.duracion_dias ?? 30),
      classesPerWeek: plan.classesPerWeek ?? plan.clases_por_semana ?? undefined,
      active: plan.active ?? plan.activo ?? true,
      description: plan.description ?? plan.descripcion ?? '',
    }));
  }, [safePlans]);

  const handleEdit = (plan: any) => {
    setCurrentPlan(plan);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentPlan({
      name: '',
      price: 0,
      durationDays: 30,
      classesPerWeek: undefined,
      active: true,
      description: '',
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPlan) return;

    onSavePlan({
      ...(currentPlan.id ? { id: currentPlan.id } : {}),
      gym_id: currentPlan.gym_id,
      nombre: currentPlan.name,
      precio: Number(currentPlan.price ?? 0),
      duracion_dias: Number(currentPlan.durationDays ?? 30),
      clases_por_semana:
        currentPlan.classesPerWeek !== undefined && currentPlan.classesPerWeek !== ''
          ? Number(currentPlan.classesPerWeek)
          : null,
      activo: Boolean(currentPlan.active),
      descripcion: currentPlan.description || '',
    } as any);

    setIsEditing(false);
    setCurrentPlan(null);
  };

  if (isEditing && currentPlan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsEditing(false);
              setCurrentPlan(null);
            }}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900">
            {currentPlan.id ? 'Editar Plan' : 'Nuevo Plan'}
          </h2>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Nombre del Plan
              </label>
              <Input
                placeholder="Ej: Pase Libre"
                value={currentPlan.name ?? ''}
                onChange={(e) =>
                  setCurrentPlan({ ...currentPlan, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  Precio ($)
                </label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <Input
                    type="number"
                    className="pl-10"
                    placeholder="25000"
                    value={currentPlan.price ?? 0}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        price: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  Duración (Días)
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <Input
                    type="number"
                    className="pl-10"
                    placeholder="30"
                    value={currentPlan.durationDays ?? 30}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        durationDays: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Clases por Semana (Opcional)
              </label>
              <div className="relative">
                <Hash
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <Input
                  type="number"
                  className="pl-10"
                  placeholder="Ej: 3"
                  value={currentPlan.classesPerWeek ?? ''}
                  onChange={(e) =>
                    setCurrentPlan({
                      ...currentPlan,
                      classesPerWeek: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Descripción
              </label>
              <textarea
                className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium text-sm"
                rows={3}
                placeholder="Detalles del plan..."
                value={currentPlan.description ?? ''}
                onChange={(e) =>
                  setCurrentPlan({ ...currentPlan, description: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input
                type="checkbox"
                id="active"
                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                checked={!!currentPlan.active}
                onChange={(e) =>
                  setCurrentPlan({ ...currentPlan, active: e.target.checked })
                }
              />
              <label htmlFor="active" className="text-sm font-bold text-slate-700">
                Plan Activo
              </label>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setIsEditing(false);
                  setCurrentPlan(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                Guardar Plan
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900">Planes y Precios</h2>
        </div>

        <Button size="sm" className="gap-2" onClick={handleCreate}>
          <Plus size={18} />
          Nuevo Plan
        </Button>
      </div>

      <div className="grid gap-4">
        {normalizedPlans.map((plan: any) => (
          <Card
            key={plan.id}
            className={`p-5 relative overflow-hidden ${!plan.active ? 'opacity-60 grayscale' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">
                  {plan.name || 'Sin nombre'}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {plan.durationDays} días{' '}
                  {plan.classesPerWeek ? `• ${plan.classesPerWeek} veces x semana` : ''}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 tracking-tighter">
                  ${plan.price}
                </p>
                {!plan.active && (
                  <span className="text-[10px] font-black text-rose-500 uppercase">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            {plan.description && (
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                {plan.description}
              </p>
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-50">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                className="gap-2"
                onClick={() => handleEdit(plan)}
              >
                <Edit2 size={14} />
                Editar
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-rose-500 border-rose-100 hover:bg-rose-50"
                onClick={() => onDeletePlan(plan.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};