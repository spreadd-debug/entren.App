import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Phone, Edit2, MessageSquare, Trash2, Save, X,
  Dumbbell, PlayCircle, Bell, Plus, CheckCircle2, HeartPulse,
  Ruler, Target, FileText, Activity,
} from 'lucide-react';
import { Card, StatusBadge, Button, Input } from '../components/UI';
import { Student, Plan, WorkoutOption, WorkoutUpdateRequest } from '../../shared/types';
import { WorkoutPlanService } from '../services/WorkoutPlanService';
import { WorkoutRequestService } from '../services/WorkoutRequestService';
import { WorkoutSessionService } from '../services/WorkoutSessionService';
import { ExerciseVideoModal } from '../components/ExerciseVideoModal';
import { useToast } from '../context/ToastContext';
import { getWorkoutFreshness } from '../config/workoutConfig';

import { AnthropometryPanel } from '../components/pt/AnthropometryPanel';
import { MeasurementsPanel } from '../components/pt/MeasurementsPanel';
import { GoalsPanel } from '../components/pt/GoalsPanel';
import { SessionNotesPanel } from '../components/pt/SessionNotesPanel';

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type Tab = 'overview' | 'anthropometry' | 'measurements' | 'goals' | 'notes' | 'workouts';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'General', icon: Activity },
  { id: 'anthropometry', label: 'Cuerpo', icon: Ruler },
  { id: 'measurements', label: 'Medidas', icon: Ruler },
  { id: 'goals', label: 'Objetivos', icon: Target },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'workouts', label: 'Rutinas', icon: Dumbbell },
];

interface ClientDetailViewProps {
  student: Student;
  plans: Plan[];
  gymId: string;
  onBack: () => void;
  onUpdateStudent: (id: string, updates: any) => void;
  onDeleteStudent: (id: string) => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  student,
  plans,
  gymId,
  onBack,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Workout state
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [studentWorkoutExercises, setStudentWorkoutExercises] = useState<any[]>([]);
  const [pendingUpdateRequest, setPendingUpdateRequest] = useState<WorkoutUpdateRequest | null>(null);
  const [selectedWorkoutPlanId, setSelectedWorkoutPlanId] = useState('');
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [adherenceStats, setAdherenceStats] = useState<{
    totalSessions: number; completedSessions: number; adherencePercent: number; lastSessionDate: string | null;
  } | null>(null);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; exerciseName: string; videoUrl: string }>({
    isOpen: false, exerciseName: '', videoUrl: '',
  });

  const normalizedPlans = useMemo(() => {
    return (Array.isArray(plans) ? plans : []).map((p: any) => ({
      ...p,
      name: p.name ?? p.nombre ?? '',
      price: Number(p.price ?? p.precio ?? 0),
      durationDays: Number(p.durationDays ?? p.duracion_dias ?? 30),
      active: p.active ?? p.activo ?? true,
    }));
  }, [plans]);

  const clientName =
    (student as any).name ??
    `${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim();

  // Edit state
  const [editData, setEditData] = useState({
    nombre: (student as any).nombre ?? '',
    apellido: (student as any).apellido ?? '',
    telefono: (student as any).telefono ?? '',
    plan_id: (student as any).plan_id ?? (student as any).planId ?? '',
    status: (student as any).status === 'active' ? 'activo' : (student as any).status === 'inactive' ? 'baja' : (student as any).status ?? 'activo',
    observaciones: (student as any).observaciones ?? (student as any).observations ?? '',
    emergency_contact_name: (student as any).emergency_contact_name ?? '',
    emergency_contact_phone: (student as any).emergency_contact_phone ?? '',
  });

  const loadWorkoutData = async () => {
    try {
      setIsLoadingWorkout(true);
      const [plansData, optionsData, exercisesData, requestData, adherenceData] = await Promise.allSettled([
        WorkoutPlanService.getPlans(gymId),
        WorkoutPlanService.getStudentWorkoutOptions(student.id),
        WorkoutPlanService.getStudentWorkout(student.id),
        WorkoutRequestService.getOpenRequest(student.id),
        WorkoutSessionService.getAdherenceStats(student.id, 30),
      ]);
      setWorkoutPlans(plansData.status === 'fulfilled' && Array.isArray(plansData.value) ? plansData.value : []);
      setWorkoutOptions(optionsData.status === 'fulfilled' && Array.isArray(optionsData.value) ? optionsData.value : []);
      setStudentWorkoutExercises(exercisesData.status === 'fulfilled' && Array.isArray(exercisesData.value) ? exercisesData.value : []);
      setPendingUpdateRequest(requestData.status === 'fulfilled' ? requestData.value : null);
      setAdherenceStats(adherenceData.status === 'fulfilled' ? adherenceData.value : null);
    } catch { /* ignore */ }
    setIsLoadingWorkout(false);
  };

  useEffect(() => { loadWorkoutData(); }, [student.id]);

  const handleAddOption = async () => {
    if (!selectedWorkoutPlanId) return;
    try {
      setIsAddingOption(true);
      await WorkoutPlanService.addWorkoutOption(gymId, student.id, selectedWorkoutPlanId);
      await loadWorkoutData();
      setSelectedWorkoutPlanId('');
      toast.success('Rutina agregada');
    } catch {
      toast.error('No se pudo agregar');
    }
    setIsAddingOption(false);
  };

  const handleRemoveOption = async (assignmentId: string) => {
    try {
      await WorkoutPlanService.removeWorkoutOption(assignmentId);
      await loadWorkoutData();
      toast.success('Opción eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const handleResolveRequest = async () => {
    if (!pendingUpdateRequest) return;
    try {
      await WorkoutRequestService.resolveRequest(pendingUpdateRequest.id);
      setPendingUpdateRequest(null);
      toast.success('Solicitud atendida');
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const handleToggleOptionDay = async (option: WorkoutOption, day: number) => {
    const current = option.days_of_week ?? [];
    const newDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b);
    const updatedDays = newDays.length > 0 ? newDays : null;
    setWorkoutOptions(prev => prev.map(o => o.id === option.id ? { ...o, days_of_week: updatedDays } : o));
    try {
      await WorkoutPlanService.updateWorkoutOptionDays(option.id, updatedDays);
    } catch {
      setWorkoutOptions(prev => prev.map(o => o.id === option.id ? { ...o, days_of_week: option.days_of_week } : o));
      toast.error('No se pudo actualizar');
    }
  };

  const handleSave = () => {
    if (!editData.nombre.trim() || !editData.apellido.trim()) {
      toast.error('Nombre y apellido son obligatorios');
      return;
    }
    onUpdateStudent(student.id, { ...editData, nombre: editData.nombre.trim(), apellido: editData.apellido.trim() });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!pendingDelete) { setPendingDelete(true); setTimeout(() => setPendingDelete(false), 3000); return; }
    onDeleteStudent(student.id);
  };

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}><X size={18} /></Button>
            <Button variant="secondary" size="icon" onClick={handleSave}><Save size={18} /></Button>
          </div>
        </div>
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Editar Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Nombre" value={editData.nombre} onChange={e => setEditData({ ...editData, nombre: e.target.value })} />
            <Input placeholder="Apellido" value={editData.apellido} onChange={e => setEditData({ ...editData, apellido: e.target.value })} />
          </div>
          <Input placeholder="Teléfono" value={editData.telefono} onChange={e => setEditData({ ...editData, telefono: e.target.value })} />
          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
            value={editData.plan_id}
            onChange={e => setEditData({ ...editData, plan_id: e.target.value })}
          >
            {normalizedPlans.map((p: any) => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
          </select>
          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
            value={editData.status}
            onChange={e => setEditData({ ...editData, status: e.target.value })}
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="baja">Baja</option>
          </select>
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            rows={3} placeholder="Observaciones" value={editData.observaciones}
            onChange={e => setEditData({ ...editData, observaciones: e.target.value })}
          />
          <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse size={14} className="text-rose-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contacto de Emergencia</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nombre" value={editData.emergency_contact_name} onChange={e => setEditData({ ...editData, emergency_contact_name: e.target.value })} />
              <Input placeholder="Teléfono" value={editData.emergency_contact_phone} onChange={e => setEditData({ ...editData, emergency_contact_phone: e.target.value })} />
            </div>
          </div>
          <Button variant="secondary" fullWidth onClick={handleSave}>Guardar cambios</Button>
        </Card>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}><Edit2 size={18} /></Button>
          <Button
            variant="outline"
            size={pendingDelete ? 'sm' : 'icon'}
            className={pendingDelete ? 'text-white bg-rose-500 border-rose-500 px-3 text-xs font-black' : 'text-rose-500 border-rose-100 hover:bg-rose-50'}
            onClick={handleDelete}
          >
            {pendingDelete ? '¿Eliminar?' : <Trash2 size={18} />}
          </Button>
        </div>
      </div>

      {/* Avatar + name */}
      <div className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-violet-500 text-white flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-xl shadow-violet-200 dark:shadow-violet-900/40 italic">
          {clientName?.charAt(0) || '?'}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{clientName}</h2>
        <div className="mt-2">
          <StatusBadge status={(student as any).status} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`tel:${(student as any).telefono ?? ''}`}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Phone size={20} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Llamar</span>
        </a>
        <a
          href={`https://wa.me/${((student as any).telefono ?? '').replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <MessageSquare size={20} className="text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">WhatsApp</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Adherence summary */}
          {adherenceStats && adherenceStats.totalSessions > 0 && (
            <Card className="p-4">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Adherencia 30 días</h4>
              <div className="flex items-center gap-4">
                <div className={`text-3xl font-black ${
                  adherenceStats.adherencePercent >= 80 ? 'text-emerald-500' :
                  adherenceStats.adherencePercent >= 50 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {adherenceStats.adherencePercent}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {adherenceStats.completedSessions}/{adherenceStats.totalSessions} sesiones completadas
                </div>
              </div>
            </Card>
          )}

          {/* Emergency contact */}
          {((student as any).emergency_contact_name || (student as any).emergency_contact_phone) && (
            <Card className="p-4 space-y-2">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse size={12} className="text-rose-400" />
                Contacto de Emergencia
              </h4>
              {(student as any).emergency_contact_name && (
                <p className="text-sm text-slate-700 dark:text-slate-300">{(student as any).emergency_contact_name}</p>
              )}
              {(student as any).emergency_contact_phone && (
                <a href={`tel:${(student as any).emergency_contact_phone}`} className="text-sm font-bold text-rose-500 hover:text-rose-600">
                  {(student as any).emergency_contact_phone}
                </a>
              )}
            </Card>
          )}

          {/* Observations */}
          {(student as any).observaciones && (
            <Card className="p-4">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Observaciones</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{(student as any).observaciones}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'anthropometry' && (
        <AnthropometryPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'measurements' && (
        <MeasurementsPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'goals' && (
        <GoalsPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'notes' && (
        <SessionNotesPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'workouts' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Rutinas disponibles</h3>
                {adherenceStats && adherenceStats.totalSessions > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Adherencia 30d:{' '}
                    <span className={`font-bold ${
                      adherenceStats.adherencePercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      adherenceStats.adherencePercent >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>{adherenceStats.adherencePercent}%</span>
                    {' '}({adherenceStats.completedSessions}/{adherenceStats.totalSessions})
                  </p>
                )}
              </div>
              {pendingUpdateRequest && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <Bell size={11} /> Pide nueva rutina
                </span>
              )}
            </div>

            {isLoadingWorkout ? (
              <p className="text-xs text-slate-400 text-center py-2">Cargando...</p>
            ) : workoutOptions.length > 0 ? (
              <div className="space-y-3">
                {workoutOptions.map(option => {
                  const freshness = getWorkoutFreshness(option.updated_at);
                  return (
                    <div key={option.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${freshness.dotClass}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{option.plan_name}</p>
                          <p className={`text-xs ${freshness.colorClass}`}>
                            {freshness.daysOld !== null ? `Actualizada hace ${freshness.daysOld} día${freshness.daysOld === 1 ? '' : 's'}` : 'Sin fecha'}
                          </p>
                        </div>
                        <button onClick={() => handleRemoveOption(option.id)} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0" title="Quitar">
                          <X size={14} />
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Días habilitados</p>
                        <div className="flex gap-1 flex-wrap">
                          {[1, 2, 3, 4, 5, 6, 0].map(day => {
                            const isActive = option.days_of_week?.includes(day) ?? false;
                            return (
                              <button
                                key={day} type="button" onClick={() => handleToggleOptionDay(option, day)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isActive ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                              >
                                {DAY_NAMES_SHORT[day]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-1">Sin rutinas asignadas</p>
            )}

            {pendingUpdateRequest && (
              <button onClick={handleResolveRequest} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/20 transition-colors">
                <CheckCircle2 size={13} /> Marcar solicitud como atendida
              </button>
            )}

            <div className="pt-1 space-y-2 border-t border-slate-100 dark:border-slate-700">
              <select
                className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
                value={selectedWorkoutPlanId} onChange={e => setSelectedWorkoutPlanId(e.target.value)}
              >
                <option value="">Agregar rutina disponible...</option>
                {workoutPlans.filter((p: any) => !workoutOptions.some(o => o.workout_plan_id === p.id)).map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
              <Button variant="secondary" fullWidth onClick={handleAddOption} disabled={!selectedWorkoutPlanId || isAddingOption}>
                <Plus size={15} className="inline mr-1" />
                {isAddingOption ? 'Agregando...' : 'Agregar como opción'}
              </Button>
            </div>

            {studentWorkoutExercises.length > 0 && (
              <div className="space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Ejercicios ({workoutOptions[0]?.plan_name ?? 'Rutina'})
                </p>
                {studentWorkoutExercises.map((ex: any, i: number) => (
                  <div key={ex.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-700 last:border-0 gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{i + 1}. {ex.exercise_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{ex.sets || '-'} series · {ex.reps || '-'} reps · {ex.weight || '-'}</p>
                    </div>
                    {ex.video_url ? (
                      <button
                        type="button"
                        onClick={() => setVideoModal({ isOpen: true, exerciseName: ex.exercise_name, videoUrl: ex.video_url })}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-xs font-bold shrink-0"
                      >
                        <PlayCircle size={15} /> Ver video
                      </button>
                    ) : (
                      <Dumbbell size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, exerciseName: '', videoUrl: '' })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
};
