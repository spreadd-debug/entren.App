import React, { useEffect, useState } from 'react';
import { Plus, Target, Trophy, Pause, XCircle, ChevronDown } from 'lucide-react';
import { Card, Button } from '../UI';
import { GoalsService } from '../../services/pt/GoalsService';
import { ClientGoal, GoalType, GoalStatus } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';

interface GoalsPanelProps {
  studentId: string;
  gymId: string;
}

const GOAL_TYPES: { value: GoalType; label: string; emoji: string }[] = [
  { value: 'lose_weight', label: 'Bajar de peso', emoji: '⬇️' },
  { value: 'gain_muscle', label: 'Ganar músculo', emoji: '💪' },
  { value: 'strength', label: 'Fuerza', emoji: '🏋️' },
  { value: 'endurance', label: 'Resistencia', emoji: '🏃' },
  { value: 'flexibility', label: 'Flexibilidad', emoji: '🧘' },
  { value: 'rehab', label: 'Rehabilitación', emoji: '🩺' },
  { value: 'general_fitness', label: 'Fitness general', emoji: '✨' },
  { value: 'other', label: 'Otro', emoji: '📌' },
];

const STATUS_CONFIG: Record<GoalStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active: { label: 'Activo', icon: Target, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  achieved: { label: 'Logrado', icon: Trophy, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  paused: { label: 'Pausado', icon: Pause, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  abandoned: { label: 'Abandonado', icon: XCircle, color: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' },
};

export const GoalsPanel: React.FC<GoalsPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const [form, setForm] = useState({
    goal_type: 'lose_weight' as GoalType,
    description: '',
    target_value: '',
    target_date: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      setGoals(await GoalsService.getByStudent(studentId));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await GoalsService.create({
        gym_id: gymId,
        student_id: studentId,
        goal_type: form.goal_type,
        description: form.description || null,
        target_value: form.target_value || null,
        target_date: form.target_date || null,
      });
      toast.success('Objetivo creado');
      setForm({ goal_type: 'lose_weight', description: '', target_value: '', target_date: '' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al crear');
    }
    setSaving(false);
  };

  const handleChangeStatus = async (id: string, status: GoalStatus) => {
    try {
      await GoalsService.updateStatus(id, status);
      setGoals(prev => prev.map(g => g.id === id ? { ...g, status } : g));
      setStatusMenuId(null);
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await GoalsService.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const otherGoals = goals.filter(g => g.status !== 'active');

  return (
    <div className="space-y-4">
      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Objetivos activos
          </h4>
          {activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              showStatusMenu={statusMenuId === goal.id}
              onToggleMenu={() => setStatusMenuId(statusMenuId === goal.id ? null : goal.id)}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add */}
      {!showForm ? (
        <Button variant="outline" fullWidth onClick={() => setShowForm(true)}>
          <Plus size={15} className="inline mr-1" />
          Nuevo objetivo
        </Button>
      ) : (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nuevo objetivo</h4>
          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
            value={form.goal_type}
            onChange={e => setForm({ ...form, goal_type: e.target.value as GoalType })}
          >
            {GOAL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            rows={2}
            placeholder='Descripción (ej: "Llegar a 75kg para julio")'
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
              placeholder="Meta (ej: 75 kg)"
              value={form.target_value}
              onChange={e => setForm({ ...form, target_value: e.target.value })}
            />
            <input
              type="date"
              className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
              value={form.target_date}
              onChange={e => setForm({ ...form, target_date: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="secondary" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear'}
            </Button>
          </div>
        </Card>
      )}

      {/* Past goals */}
      {otherGoals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Historial
          </h4>
          {otherGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              showStatusMenu={statusMenuId === goal.id}
              onToggleMenu={() => setStatusMenuId(statusMenuId === goal.id ? null : goal.id)}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {loading && <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>}
      {!loading && goals.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 text-center py-4">Sin objetivos definidos</p>
      )}
    </div>
  );
};

const GoalCard: React.FC<{
  goal: ClientGoal;
  showStatusMenu: boolean;
  onToggleMenu: () => void;
  onChangeStatus: (id: string, status: GoalStatus) => void;
  onDelete: (id: string) => void;
}> = ({ goal, showStatusMenu, onToggleMenu, onChangeStatus, onDelete }) => {
  const typeInfo = GOAL_TYPES.find(t => t.value === goal.goal_type) ?? GOAL_TYPES[7];
  const statusInfo = STATUS_CONFIG[goal.status];
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={`p-3 ${goal.status !== 'active' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{typeInfo.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{typeInfo.label}</p>
          {goal.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{goal.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {goal.target_value && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">
                Meta: {goal.target_value}
              </span>
            )}
            {goal.target_date && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {new Date(goal.target_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={onToggleMenu}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${statusInfo.bg} ${statusInfo.color} transition-colors`}
          >
            <StatusIcon size={10} />
            {statusInfo.label}
            <ChevronDown size={10} />
          </button>

          {showStatusMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 py-1 min-w-[130px]">
              {(Object.entries(STATUS_CONFIG) as [GoalStatus, typeof statusInfo][]).map(([s, cfg]) => (
                <button
                  key={s}
                  onClick={() => onChangeStatus(goal.id, s)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${cfg.color}`}
                >
                  <cfg.icon size={12} />
                  {cfg.label}
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
              <button
                onClick={() => onDelete(goal.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
