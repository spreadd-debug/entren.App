import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Play, CheckCircle2, Dumbbell, Plus, Minus,
  Clock, Trophy, ChevronDown, ChevronUp, MessageSquare,
  Loader2, Save, X, Weight, BarChart3,
} from 'lucide-react';
import { Student, WorkoutOption, SessionSet } from '../../shared/types';
import { PTSessionService, PTSessionFull, PTSessionExercise } from '../services/pt/PTSessionService';
import { WorkoutPlanService } from '../services/WorkoutPlanService';
import { useToast } from '../context/ToastContext';

interface PTLiveSessionViewProps {
  student: Student;
  gymId: string;
  onBack: () => void;
  onComplete: () => void;
}

// ─── Quick-increment buttons ──────────────────────────────────────────────────

const WEIGHT_INCREMENTS = [1.25, 2.5, 5, 10];
const REP_INCREMENTS = [1, 2, 5];

// ─── Timer display ────────────────────────────────────────────────────────────

function useElapsed(startedAt: string | null) {
  const [elapsed, setElapsed] = useState('00:00');
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const PTLiveSessionView: React.FC<PTLiveSessionViewProps> = ({
  student,
  gymId,
  onBack,
  onComplete,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PTSessionFull | null>(null);
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [ptNotes, setPtNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastPerformance, setLastPerformance] = useState<Map<string, SessionSet[]>>(new Map());
  const [savingSet, setSavingSet] = useState<string | null>(null);

  const studentName = ((student as any).nombre ?? student.name ?? '') + ' ' +
    ((student as any).apellido ?? student.lastName ?? '');

  const elapsed = useElapsed(session?.session.started_at ?? null);

  // ─── Load workout options ───────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const options = await WorkoutPlanService.getStudentWorkoutOptions(student.id);
        setWorkoutOptions(options as WorkoutOption[]);

        // Auto-select if only one plan, or find today's plan
        const todayDow = new Date().getDay();
        const todayPlan = options.find((o: any) =>
          o.days_of_week?.includes(todayDow),
        );

        if (options.length === 1) {
          setSelectedPlanId(options[0].workout_plan_id);
        } else if (todayPlan) {
          setSelectedPlanId((todayPlan as any).workout_plan_id);
        }
      } catch (err) {
        console.error('Error loading workout options:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [student.id]);

  // ─── Start session ──────────────────────────────────────────────────────

  const handleStartSession = useCallback(async () => {
    if (!selectedPlanId) return;
    setLoading(true);
    try {
      const exercises = await WorkoutPlanService.getExercises(selectedPlanId);
      const result = await PTSessionService.startSession(
        gymId,
        student.id,
        selectedPlanId,
        exercises,
      );
      setSession(result);

      // Load last performance for pre-filling
      const weIds = result.exercises.map((e) => e.workout_exercise_id);
      const perf = await PTSessionService.getLastPerformance(student.id, weIds);
      setLastPerformance(perf);

      // Auto-expand first exercise
      if (result.exercises.length > 0) {
        setExpandedExercise(result.exercises[0].id);
      }
    } catch (err: any) {
      toast.error('Error al iniciar sesión: ' + (err?.message ?? ''));
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId, gymId, student.id, toast]);

  // ─── Save set ───────────────────────────────────────────────────────────

  const handleSaveSet = useCallback(async (
    exerciseId: string,
    setNumber: number,
    data: { weight_kg?: number | null; reps_done?: number | null; rpe?: number | null; rir?: number | null; notes?: string | null },
  ) => {
    const key = `${exerciseId}-${setNumber}`;
    setSavingSet(key);
    try {
      const saved = await PTSessionService.saveSet(exerciseId, setNumber, data);
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const newSets = [...ex.sets_data];
            const idx = newSets.findIndex((s) => s.set_number === setNumber);
            if (idx >= 0) {
              newSets[idx] = saved;
            } else {
              newSets.push(saved);
              newSets.sort((a, b) => a.set_number - b.set_number);
            }
            return { ...ex, sets_data: newSets };
          }),
        };
      });
    } catch (err: any) {
      toast.error('Error al guardar serie');
    } finally {
      setSavingSet(null);
    }
  }, [toast]);

  // ─── Complete session ───────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!session) return;
    setCompleting(true);
    try {
      await PTSessionService.completeSession(session.session.id, ptNotes || undefined);
      toast.success('Sesión completada');
      onComplete();
    } catch (err: any) {
      toast.error('Error al completar: ' + (err?.message ?? ''));
    } finally {
      setCompleting(false);
    }
  }, [session, ptNotes, toast, onComplete]);

  // ─── Compute stats ─────────────────────────────────────────────────────

  const totalVolume = session?.exercises.reduce((sum, ex) => {
    return sum + ex.sets_data.reduce((s, set) => {
      return s + (Number(set.weight_kg) || 0) * (Number(set.reps_done) || 0);
    }, 0);
  }, 0) ?? 0;

  const totalSets = session?.exercises.reduce(
    (sum, ex) => sum + ex.sets_data.length, 0,
  ) ?? 0;

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="text-violet-500 animate-spin" />
      </div>
    );
  }

  // ─── Plan selection (before session starts) ─────────────────────────────

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 dark:text-white truncate">
                Nueva Sesión
              </h1>
              <p className="text-sm text-slate-500 truncate">{studentName.trim()}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={28} className="text-violet-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Elegí la rutina
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Seleccioná qué va a entrenar hoy
            </p>
          </div>

          {workoutOptions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
              <p className="text-slate-500 text-sm">
                Este cliente no tiene rutinas asignadas.
              </p>
              <button
                onClick={onBack}
                className="mt-3 text-violet-500 text-sm font-bold hover:text-violet-600"
              >
                Volver y asignar rutina
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {workoutOptions.map((opt) => {
                const isSelected = selectedPlanId === opt.workout_plan_id;
                const daysLabel = opt.days_of_week?.length
                  ? opt.days_of_week.map((d) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')
                  : 'Cualquier día';

                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPlanId(opt.workout_plan_id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/5 dark:bg-violet-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <Dumbbell size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${
                          isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {opt.plan_name}
                        </p>
                        <p className="text-xs text-slate-500">{daysLabel}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={20} className="text-violet-500 ml-auto shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedPlanId && (
            <button
              onClick={handleStartSession}
              className="w-full py-4 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white rounded-2xl font-black text-base transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Active session ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      {/* Sticky header with timer + stats */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {studentName.trim()}
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {workoutOptions.find((o) => o.workout_plan_id === session.session.workout_plan_id)?.plan_name ?? 'Sesión'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-violet-500/10 px-3 py-1.5 rounded-xl">
              <Clock size={14} className="text-violet-500" />
              <span className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">{elapsed}</span>
            </div>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="px-4 pb-3 flex gap-3">
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-slate-500">Series</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{totalSets}</p>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-slate-500">Volumen</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg`}
            </p>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-slate-500">Ejercicios</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
              {session.exercises.filter((e) => e.sets_data.length > 0).length}/{session.exercises.length}
            </p>
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="p-4 space-y-3">
        {session.exercises.map((exercise, idx) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={idx}
            isExpanded={expandedExercise === exercise.id}
            onToggle={() => setExpandedExercise(
              expandedExercise === exercise.id ? null : exercise.id,
            )}
            onSaveSet={handleSaveSet}
            savingSet={savingSet}
            lastPerformance={lastPerformance.get(exercise.workout_exercise_id)}
          />
        ))}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 space-y-2 z-20">
        <div className="flex gap-2">
          <button
            onClick={() => setShowNotesModal(true)}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            Notas
          </button>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {completing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Trophy size={18} />
                Completar Sesión
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notes modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Notas de la sesión</h3>
              <button onClick={() => setShowNotesModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={ptNotes}
                onChange={(e) => setPtNotes(e.target.value)}
                placeholder="Observaciones sobre la sesión, cómo se sintió el alumno, ajustes para la próxima..."
                rows={4}
                autoFocus
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
              />
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowNotesModal(false)}
                className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold text-sm transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Exercise Card ──────────────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: PTSessionExercise;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSaveSet: (exerciseId: string, setNumber: number, data: any) => Promise<void>;
  savingSet: string | null;
  lastPerformance?: SessionSet[];
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  index,
  isExpanded,
  onToggle,
  onSaveSet,
  savingSet,
  lastPerformance,
}) => {
  const hasSets = exercise.sets_data.length > 0;
  const plannedSets = exercise.sets ?? 3;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
      hasSets
        ? 'border-emerald-200 dark:border-emerald-800/50'
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      {/* Exercise header — tappable */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${
          hasSets
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
        }`}>
          {hasSets ? <CheckCircle2 size={18} /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
            {exercise.exercise_name}
          </p>
          <p className="text-xs text-slate-500">
            {exercise.sets ?? '–'}×{exercise.reps ?? '–'}
            {exercise.weight ? ` · ${exercise.weight}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasSets && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {exercise.sets_data.length}/{plannedSets}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={18} className="text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded: set-by-set registration */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* Last performance hint */}
          {lastPerformance && lastPerformance.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 mb-2">
              <p className="text-xs text-slate-500 font-medium mb-1">Última vez:</p>
              <div className="flex flex-wrap gap-1.5">
                {lastPerformance.map((s) => (
                  <span key={s.set_number} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-400">
                    {s.weight_kg ?? 0}kg × {s.reps_done ?? 0}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Existing sets */}
          {exercise.sets_data.map((set) => (
            <SetRow
              key={set.set_number}
              exerciseId={exercise.id}
              set={set}
              onSave={onSaveSet}
              isSaving={savingSet === `${exercise.id}-${set.set_number}`}
            />
          ))}

          {/* Add new set button */}
          <AddSetRow
            exerciseId={exercise.id}
            nextSetNumber={exercise.sets_data.length + 1}
            onSave={onSaveSet}
            isSaving={savingSet === `${exercise.id}-${exercise.sets_data.length + 1}`}
            lastSet={exercise.sets_data[exercise.sets_data.length - 1]}
            lastPerformanceSet={
              lastPerformance?.[exercise.sets_data.length] ?? lastPerformance?.[0]
            }
          />
        </div>
      )}
    </div>
  );
};

// ─── Set Row (existing set — editable) ──────────────────────────────────────

interface SetRowProps {
  exerciseId: string;
  set: SessionSet;
  onSave: (exerciseId: string, setNumber: number, data: any) => Promise<void>;
  isSaving: boolean;
}

const SetRow: React.FC<SetRowProps> = ({ exerciseId, set, onSave, isSaving }) => {
  const [weight, setWeight] = useState(String(set.weight_kg ?? ''));
  const [reps, setReps] = useState(String(set.reps_done ?? ''));
  const [dirty, setDirty] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback((w: string, r: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave(exerciseId, set.set_number, {
        weight_kg: w ? Number(w) : null,
        reps_done: r ? Number(r) : null,
      });
      setDirty(false);
    }, 800);
  }, [exerciseId, set.set_number, onSave]);

  const handleWeightChange = (val: string) => {
    setWeight(val);
    setDirty(true);
    triggerSave(val, reps);
  };

  const handleRepsChange = (val: string) => {
    setReps(val);
    setDirty(true);
    triggerSave(weight, val);
  };

  return (
    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl px-3 py-2">
      <span className="text-xs font-bold text-slate-400 w-6 text-center">{set.set_number}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => handleWeightChange(e.target.value)}
            className="w-16 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <span className="text-xs text-slate-400">kg</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">×</span>
        <div className="flex items-center gap-1 flex-1">
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => handleRepsChange(e.target.value)}
            className="w-14 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <span className="text-xs text-slate-400">reps</span>
        </div>
      </div>
      {isSaving ? (
        <Loader2 size={14} className="text-violet-500 animate-spin shrink-0" />
      ) : dirty ? (
        <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0" />
      ) : (
        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
      )}
    </div>
  );
};

// ─── Add Set Row (new set input) ────────────────────────────────────────────

interface AddSetRowProps {
  exerciseId: string;
  nextSetNumber: number;
  onSave: (exerciseId: string, setNumber: number, data: any) => Promise<void>;
  isSaving: boolean;
  lastSet?: SessionSet;
  lastPerformanceSet?: SessionSet;
}

const AddSetRow: React.FC<AddSetRowProps> = ({
  exerciseId,
  nextSetNumber,
  onSave,
  isSaving,
  lastSet,
  lastPerformanceSet,
}) => {
  // Pre-fill from last set of this session, or last performance
  const defaultWeight = lastSet?.weight_kg ?? lastPerformanceSet?.weight_kg ?? null;
  const defaultReps = lastSet?.reps_done ?? lastPerformanceSet?.reps_done ?? null;

  const [weight, setWeight] = useState(defaultWeight !== null ? String(defaultWeight) : '');
  const [reps, setReps] = useState(defaultReps !== null ? String(defaultReps) : '');

  // Update defaults when lastSet changes (after saving previous set)
  useEffect(() => {
    const w = lastSet?.weight_kg ?? lastPerformanceSet?.weight_kg ?? null;
    const r = lastSet?.reps_done ?? lastPerformanceSet?.reps_done ?? null;
    setWeight(w !== null ? String(w) : '');
    setReps(r !== null ? String(r) : '');
  }, [lastSet?.weight_kg, lastSet?.reps_done, lastPerformanceSet?.weight_kg, lastPerformanceSet?.reps_done]);

  const handleAdd = async () => {
    await onSave(exerciseId, nextSetNumber, {
      weight_kg: weight ? Number(weight) : null,
      reps_done: reps ? Number(reps) : null,
    });
    // Reset for next set with same values
    // (values will be updated via useEffect when lastSet changes)
  };

  const adjustWeight = (delta: number) => {
    const current = Number(weight) || 0;
    const next = Math.max(0, current + delta);
    setWeight(String(next));
  };

  const adjustReps = (delta: number) => {
    const current = Number(reps) || 0;
    const next = Math.max(0, current + delta);
    setReps(String(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/10 border-2 border-dashed border-violet-200 dark:border-violet-800/50 rounded-xl px-3 py-2">
        <span className="text-xs font-bold text-violet-400 w-6 text-center">{nextSetNumber}</span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="w-16 text-center bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800/50 rounded-lg px-1 py-1.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <span className="text-xs text-slate-400">kg</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">×</span>
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="0"
              className="w-14 text-center bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800/50 rounded-lg px-1 py-1.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <span className="text-xs text-slate-400">reps</span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={isSaving}
          className="p-2 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition-all active:scale-95"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
        </button>
      </div>

      {/* Quick increment buttons */}
      <div className="flex gap-1.5 justify-between">
        <div className="flex gap-1">
          {WEIGHT_INCREMENTS.map((inc) => (
            <button
              key={inc}
              onClick={() => adjustWeight(inc)}
              className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors"
            >
              +{inc}kg
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {REP_INCREMENTS.map((inc) => (
            <button
              key={inc}
              onClick={() => adjustReps(inc)}
              className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors"
            >
              +{inc}rep
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PTLiveSessionView;
