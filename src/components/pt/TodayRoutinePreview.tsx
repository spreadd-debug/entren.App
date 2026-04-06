import { useState, useEffect } from 'react';
import {
  Dumbbell, Loader2, Plus, Zap, Target, RotateCw, Clock, AlertTriangle, CalendarOff,
} from 'lucide-react';
import { RoutineBuilderService } from '../../services/RoutineBuilderService';
import { WorkoutPlanService } from '../../services/WorkoutPlanService';
import { RoutineAssignmentPicker } from './RoutineAssignmentPicker';
import type {
  RoutineAssignment, RoutineBlock, RoutineExercise, RoutineSet, RoutineDay, BlockType,
} from '../../../shared/types';

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const WEEKDAY_LABELS: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mie', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sab', domingo: 'Dom',
};

const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; color: string; icon: any }> = {
  normal: { label: '', color: '', icon: null },
  superset: { label: 'Superserie', color: 'text-purple-500 bg-purple-500/10', icon: Zap },
  triset: { label: 'Triserie', color: 'text-orange-500 bg-orange-500/10', icon: Target },
  circuit: { label: 'Circuito', color: 'text-emerald-500 bg-emerald-500/10', icon: RotateCw },
};

type FullDay = RoutineDay & {
  blocks: (RoutineBlock & {
    exercises: (RoutineExercise & { sets: RoutineSet[] })[];
  })[];
};

interface TodayRoutinePreviewProps {
  studentId: string;
  gymId: string;
}

export function TodayRoutinePreview({ studentId, gymId }: TodayRoutinePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // v2 state
  const [v2Assignment, setV2Assignment] = useState<(RoutineAssignment & { routine_name: string }) | null>(null);
  const [v2Days, setV2Days] = useState<FullDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // legacy state
  const [legacyPlan, setLegacyPlan] = useState<{ id: string; plan_name: string; workout_plan_id: string } | null>(null);
  const [legacyExercises, setLegacyExercises] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setShowPicker(false);
    try {
      // Check v2 first
      const v2Assignments = await RoutineBuilderService.getAssignmentsForStudent(studentId);
      if (v2Assignments.length > 0) {
        const assignment = v2Assignments[0];
        setV2Assignment(assignment);

        const full = await RoutineBuilderService.loadFullRoutine(assignment.routine_id);
        setV2Days(full.days as FullDay[]);

        // Resolve today's day via day_mapping
        const todayName = WEEKDAYS_ES[new Date().getDay()];
        const mappedDayId = Object.entries(assignment.day_mapping || {})
          .find(([_, weekday]) => weekday === todayName)?.[0] ?? null;
        setSelectedDayId(mappedDayId ?? full.days[0]?.id ?? null);

        setLegacyPlan(null);
        setLegacyExercises([]);
        setLoading(false);
        return;
      }

      // Fallback to legacy
      const options = await WorkoutPlanService.getStudentWorkoutOptions(studentId);
      if (options.length > 0) {
        const option = options[0];
        setLegacyPlan(option);
        const exercises = await WorkoutPlanService.getExercises(option.workout_plan_id);
        setLegacyExercises(exercises);
      }

      setV2Assignment(null);
      setV2Days([]);
    } catch (err) {
      console.error('[TodayRoutinePreview]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  // ── State A: v2 routine assigned ─────────────────────────────────────────
  if (v2Assignment && v2Days.length > 0) {
    const activeDay = v2Days.find((d) => d.id === selectedDayId) ?? v2Days[0];
    const hasMapping = Object.keys(v2Assignment.day_mapping || {}).length > 0;
    const todayName = WEEKDAYS_ES[new Date().getDay()];
    const todayMappedDayId = Object.entries(v2Assignment.day_mapping || {})
      .find(([_, weekday]) => weekday === todayName)?.[0] ?? null;
    const isRestDay = hasMapping && !todayMappedDayId;

    // Build weekday label for each day
    const dayWeekdayMap: Record<string, string> = {};
    for (const [dayId, weekday] of Object.entries(v2Assignment.day_mapping || {})) {
      const label = WEEKDAY_LABELS[weekday];
      if (label) dayWeekdayMap[dayId] = label;
    }

    return (
      <div className="space-y-3">
        {/* Routine name */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {v2Assignment.routine_name}
          </p>
        </div>

        {/* Rest day warning */}
        {isRestDay && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <CalendarOff size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Hoy no tiene rutina asignada — dia de descanso
            </p>
          </div>
        )}

        {/* Day tabs */}
        {v2Days.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {v2Days.map((day) => {
              const weekdayLabel = dayWeekdayMap[day.id];
              const isMappedToday = day.id === todayMappedDayId;
              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayId(day.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    day.id === activeDay.id
                      ? isMappedToday
                        ? 'bg-emerald-500 text-white'
                        : 'bg-indigo-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {day.label}
                  {weekdayLabel && (
                    <span className="ml-1 opacity-70">({weekdayLabel})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* No mapping warning */}
        {!hasMapping && v2Days.length > 1 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <AlertTriangle size={14} className="text-slate-400 shrink-0" />
            <p className="text-xs text-slate-400">
              No se asignaron dias de la semana — selecciona un dia manualmente
            </p>
          </div>
        )}

        {/* Blocks & exercises */}
        {activeDay.blocks.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Este dia no tiene ejercicios</p>
        ) : (
          <div className="space-y-2">
            {activeDay.blocks.map((block, bi) => (
              <BlockPreview key={block.id} block={block} index={bi} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── State B: legacy plan assigned ────────────────────────────────────────
  if (legacyPlan && legacyExercises.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {legacyPlan.plan_name}
        </p>
        <div className="space-y-1.5">
          {legacyExercises.map((ex: any, i: number) => (
            <div
              key={ex.id}
              className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {ex.exercise_name}
                </p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {formatLegacySets(ex)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── State C: no routine assigned ─────────────────────────────────────────
  if (showPicker) {
    return (
      <RoutineAssignmentPicker
        gymId={gymId}
        studentId={studentId}
        onAssigned={loadData}
        onCancel={() => setShowPicker(false)}
      />
    );
  }

  return (
    <div className="text-center py-6">
      <Dumbbell size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        No tiene rutina asignada
      </p>
      <p className="text-xs text-slate-300 dark:text-slate-600 mt-1 mb-4">
        Asigna una rutina para planificar la sesion
      </p>
      <button
        onClick={() => setShowPicker(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold transition-colors"
      >
        <Plus size={16} />
        Asignar rutina
      </button>
    </div>
  );
}

// ── Helper: block preview ──────────────────────────────────────────────────

function BlockPreview({
  block,
  index,
}: {
  block: RoutineBlock & { exercises: (RoutineExercise & { sets: RoutineSet[] })[] };
  index: number;
}) {
  const isGrouped = block.block_type !== 'normal';
  const typeInfo = BLOCK_TYPE_LABELS[block.block_type];

  return (
    <div
      className={`rounded-xl border ${
        isGrouped
          ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
          : 'border-transparent'
      }`}
    >
      {/* Group header */}
      {isGrouped && typeInfo.icon && (
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${typeInfo.color}`}>
            <typeInfo.icon size={10} />
            {typeInfo.label}
          </span>
          {block.rest_after_block_sec && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Clock size={10} /> {block.rest_after_block_sec}s descanso
            </span>
          )}
        </div>
      )}

      {/* Exercises */}
      <div className={isGrouped ? 'px-2 pb-2' : ''}>
        {block.exercises.map((ex, i) => (
          <div
            key={ex.id}
            className="flex items-center gap-3 py-2 px-3 rounded-xl"
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
              {isGrouped ? String.fromCharCode(65 + i) : index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {ex.exercise_name}
              </p>
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              {formatV2Sets(ex.sets)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helper: format sets summary ────────────────────────────────────────────

function formatV2Sets(sets: RoutineSet[]): string {
  if (sets.length === 0) return '—';

  // Check if all sets are identical
  const allSame = sets.every(
    (s) => s.reps === sets[0].reps && s.weight_kg === sets[0].weight_kg,
  );

  if (allSame) {
    const reps = sets[0].reps ?? sets[0].time_sec ? `${sets[0].time_sec}s` : '?';
    const weight = sets[0].weight_kg ? `${sets[0].weight_kg}kg` : '';
    const repsStr = sets[0].reps ?? reps;
    return `${sets.length} × ${repsStr}${weight ? ` × ${weight}` : ''}`;
  }

  return `${sets.length} series (variadas)`;
}

function formatLegacySets(ex: any): string {
  const parts: string[] = [];
  if (ex.sets) parts.push(`${ex.sets}×`);
  if (ex.reps) parts.push(ex.reps);
  if (ex.weight) parts.push(`${ex.weight}`);
  return parts.join(' ') || '—';
}
