import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dumbbell, Loader2, Zap, Target, RotateCw, Clock,
  ChevronDown, ChevronUp, Save, Coffee,
} from 'lucide-react';
import { RoutineBuilderService } from '../../services/RoutineBuilderService';
import { useToast } from '../../context/ToastContext';
import type {
  RoutineAssignment, RoutineBlock, RoutineExercise, RoutineSet, RoutineDay, BlockType,
} from '../../../shared/types';

// ── Constants ──────────────────────────────────────────────────────────────

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const WEEKDAYS = [
  { key: 'lunes', label: 'Lun', long: 'Lunes' },
  { key: 'martes', label: 'Mar', long: 'Martes' },
  { key: 'miercoles', label: 'Mie', long: 'Miércoles' },
  { key: 'jueves', label: 'Jue', long: 'Jueves' },
  { key: 'viernes', label: 'Vie', long: 'Viernes' },
  { key: 'sabado', label: 'Sab', long: 'Sábado' },
  { key: 'domingo', label: 'Dom', long: 'Domingo' },
];

const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; color: string; icon: any }> = {
  normal: { label: '', color: '', icon: null },
  superset: { label: 'Superserie', color: 'text-purple-500 bg-purple-500/10', icon: Zap },
  triset: { label: 'Triserie', color: 'text-orange-500 bg-orange-500/10', icon: Target },
  circuit: { label: 'Circuito', color: 'text-emerald-500 bg-emerald-500/10', icon: RotateCw },
};

// ── Types ──────────────────────────────────────────────────────────────────

type FullDay = RoutineDay & {
  blocks: (RoutineBlock & {
    exercises: (RoutineExercise & { sets: RoutineSet[] })[];
  })[];
};

type WeekdaySlot = {
  weekday: typeof WEEKDAYS[number];
  routineName: string;
  day: FullDay;
  assignmentId: string;
  routineId: string;
} | null;

type UnmappedDay = {
  routineName: string;
  day: FullDay;
  assignmentId: string;
  routineId: string;
};

// ── Editable set (local state) ─────────────────────────────────────────────

type EditableSet = RoutineSet & { _dirty?: boolean };

// ── Module-level cache (persists across mount/unmount cycles) ──────────────

type CachedData = {
  weekdaySlots: WeekdaySlot[];
  hasAnyMapping: boolean;
  unmappedDays: UnmappedDay[];
  ts: number;
};

const dataCache = new Map<string, CachedData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Component ──────────────────────────────────────────────────────────────

interface TodayRoutinePreviewProps {
  studentId: string;
  gymId: string;
}

export function TodayRoutinePreview({ studentId, gymId }: TodayRoutinePreviewProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  // Weekday slots: for each weekday, which routine day is assigned
  const [weekdaySlots, setWeekdaySlots] = useState<WeekdaySlot[]>([]);
  const [selectedWeekday, setSelectedWeekday] = useState('');
  const [hasAnyMapping, setHasAnyMapping] = useState(false);

  // Expanded exercises (by exercise ID)
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  // Editable sets (keyed by set ID)
  const [editedSets, setEditedSets] = useState<Map<string, EditableSet>>(new Map());
  const [saving, setSaving] = useState(false);

  // Unmapped days (routine days not in any day_mapping)
  const [unmappedDays, setUnmappedDays] = useState<UnmappedDay[]>([]);
  const [selectedUnmappedDay, setSelectedUnmappedDay] = useState<UnmappedDay | null>(null);

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  const buildSlotsFromAssignments = useCallback(async (v2Assignments: (RoutineAssignment & { routine_name: string })[]) => {
    const loaded = await Promise.all(
      v2Assignments.map(async (a) => {
        const full = await RoutineBuilderService.loadFullRoutine(a.routine_id);
        return { ...a, days: full.days as FullDay[] };
      }),
    );

    const slots: WeekdaySlot[] = WEEKDAYS.map((wd) => {
      for (const assignment of loaded) {
        const mapping = assignment.day_mapping || {};
        const entry = Object.entries(mapping).find(([_, weekday]) => weekday === wd.key);
        if (entry) {
          const day = assignment.days.find((d) => d.id === entry[0]);
          if (day) return { weekday: wd, routineName: assignment.routine_name, day, assignmentId: assignment.id, routineId: assignment.routine_id };
        }
      }
      return null;
    });

    const mappedDayIds = new Set<string>();
    for (const assignment of loaded) {
      for (const dayId of Object.keys(assignment.day_mapping || {})) mappedDayIds.add(dayId);
    }
    const unmapped: UnmappedDay[] = [];
    for (const assignment of loaded) {
      for (const day of assignment.days) {
        if (!mappedDayIds.has(day.id)) unmapped.push({ routineName: assignment.routine_name, day, assignmentId: assignment.id, routineId: assignment.routine_id });
      }
    }

    return { weekdaySlots: slots, hasAnyMapping: slots.some((s) => s !== null), unmappedDays: unmapped };
  }, []);

  const applyData = useCallback((data: CachedData) => {
    if (!isMounted.current) return;
    setWeekdaySlots(data.weekdaySlots);
    setHasAnyMapping(data.hasAnyMapping);
    setUnmappedDays(data.unmappedDays);
    setSelectedUnmappedDay(null);
    setSelectedWeekday((prev) => prev || WEEKDAYS_ES[new Date().getDay()]);
    setLoading(false);
  }, []);

  const loadData = useCallback(async (background = false) => {
    // Show cached data instantly if available
    const cached = dataCache.get(studentId);
    if (cached && !background) {
      applyData(cached);
      // If cache is fresh, just revalidate in background
      if (Date.now() - cached.ts < CACHE_TTL) {
        loadData(true);
        return;
      }
    }

    if (!background) setLoading(true);

    try {
      const v2Assignments = await RoutineBuilderService.getAssignmentsForStudent(studentId);

      if (v2Assignments.length > 0) {
        const result = await buildSlotsFromAssignments(v2Assignments);
        const cacheEntry: CachedData = { ...result, ts: Date.now() };
        dataCache.set(studentId, cacheEntry);
        applyData(cacheEntry);
        return;
      }

      // No assignments
      if (!isMounted.current) return;
      setWeekdaySlots([]);
      setHasAnyMapping(false);
      setUnmappedDays([]);
      dataCache.delete(studentId);
    } catch (err) {
      if (!background) console.error('[TodayRoutinePreview]', err);
    } finally {
      if (isMounted.current && !background) setLoading(false);
    }
  }, [studentId, applyData, buildSlotsFromAssignments]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Set editing helpers ──────────────────────────────────────────────────

  const getEditableSet = (original: RoutineSet): EditableSet => {
    return editedSets.get(original.id) ?? original;
  };

  const updateSetLocal = (setId: string, original: RoutineSet, field: string, value: number | null) => {
    setEditedSets((prev) => {
      const next = new Map<string, EditableSet>(prev);
      const current: EditableSet = next.get(setId) ?? { ...original };
      next.set(setId, { ...current, [field]: value, _dirty: true });
      return next;
    });
  };

  const hasDirtyEdits = Array.from(editedSets.values()).some((s: EditableSet) => s._dirty);

  const handleSaveEdits = async () => {
    const dirty = Array.from(editedSets.entries()).filter(([_, s]) => s._dirty);
    if (dirty.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        dirty.map(([id, s]) =>
          RoutineBuilderService.updateSet(id, {
            reps: s.reps,
            weight_kg: s.weight_kg,
            rpe_target: s.rpe_target,
            rir_target: s.rir_target,
            notes: s.notes,
          }),
        ),
      );
      // Clear dirty flags
      setEditedSets((prev) => {
        const next = new Map<string, EditableSet>(prev);
        for (const [id, s] of next.entries()) {
          next.set(id, { ...s, _dirty: false });
        }
        return next;
      });
      dataCache.delete(studentId); // invalidate cache after edits
      toast.success('Cambios guardados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleExercise = (exId: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  // ── State A: v2 routine(s) with weekday view ─────────────────────────────

  if (hasAnyMapping) {
    const todayKey = WEEKDAYS_ES[new Date().getDay()];
    const slotIdx = WEEKDAYS.findIndex((w) => w.key === selectedWeekday);
    const activeSlot = weekdaySlots[slotIdx];

    return (
      <div className="space-y-3">
        {/* Weekday tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {WEEKDAYS.map((wd, i) => {
            const slot = weekdaySlots[i];
            const isToday = wd.key === todayKey;
            const isSelected = wd.key === selectedWeekday;
            const hasRoutine = slot !== null;

            return (
              <button
                key={wd.key}
                onClick={() => setSelectedWeekday(wd.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors relative ${
                  isSelected
                    ? hasRoutine
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-600 text-white'
                    : hasRoutine
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {wd.label}
                {isToday && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-emerald-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Active weekday content */}
        {activeSlot ? (
          <div className="space-y-2">
            {/* Routine + day label */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeSlot.day.label}
                </p>
                <p className="text-[11px] text-slate-400">{activeSlot.routineName}</p>
              </div>
              {hasDirtyEdits && (
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar
                </button>
              )}
            </div>

            {/* Blocks & exercises */}
            {activeSlot.day.blocks.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Este dia no tiene ejercicios</p>
            ) : (
              <div className="space-y-1.5">
                {activeSlot.day.blocks.map((block, bi) => (
                  <BlockPreviewEditable
                    key={block.id}
                    block={block}
                    index={bi}
                    expandedExercises={expandedExercises}
                    onToggleExercise={toggleExercise}
                    getEditableSet={getEditableSet}
                    onUpdateSet={updateSetLocal}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 py-6 justify-center">
              <Coffee size={20} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                Dia de descanso
              </p>
            </div>

            {unmappedDays.length > 0 && (
              <UnmappedDaysSection
                unmappedDays={unmappedDays}
                selectedDay={selectedUnmappedDay}
                onSelectDay={setSelectedUnmappedDay}
                expandedExercises={expandedExercises}
                onToggleExercise={toggleExercise}
                getEditableSet={getEditableSet}
                onUpdateSet={updateSetLocal}
                hasDirtyEdits={hasDirtyEdits}
                saving={saving}
                onSave={handleSaveEdits}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // ── State A2: v2 assignments but no day mapping ──────────────────────────

  if (!hasAnyMapping && unmappedDays.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-400 font-medium">
          Rutinas asignadas (sin días configurados)
        </p>
        <UnmappedDaysSection
          unmappedDays={unmappedDays}
          selectedDay={selectedUnmappedDay}
          onSelectDay={setSelectedUnmappedDay}
          expandedExercises={expandedExercises}
          onToggleExercise={toggleExercise}
          getEditableSet={getEditableSet}
          onUpdateSet={updateSetLocal}
          hasDirtyEdits={hasDirtyEdits}
          saving={saving}
          onSave={handleSaveEdits}
        />
      </div>
    );
  }

  // ── No routine assigned ──────────────────────────────────────────────────

  return (
    <div className="text-center py-6">
      <Dumbbell size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        No tiene rutina asignada
      </p>
      <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
        Asigna una desde la seccion de Rutinas
      </p>
    </div>
  );
}

// ── Unmapped Days Section ──────────────────────────────────────────────────

function UnmappedDaysSection({
  unmappedDays,
  selectedDay,
  onSelectDay,
  expandedExercises,
  onToggleExercise,
  getEditableSet,
  onUpdateSet,
  hasDirtyEdits,
  saving,
  onSave,
}: {
  unmappedDays: UnmappedDay[];
  selectedDay: UnmappedDay | null;
  onSelectDay: (day: UnmappedDay | null) => void;
  expandedExercises: Set<string>;
  onToggleExercise: (id: string) => void;
  getEditableSet: (s: RoutineSet) => RoutineSet & { _dirty?: boolean };
  onUpdateSet: (setId: string, original: RoutineSet, field: string, value: number | null) => void;
  hasDirtyEdits: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Dumbbell size={12} />
        Otras rutinas disponibles
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {unmappedDays.map((ud) => {
          const isSelected = selectedDay?.day.id === ud.day.id && selectedDay?.assignmentId === ud.assignmentId;
          return (
            <button
              key={`${ud.assignmentId}-${ud.day.id}`}
              onClick={() => onSelectDay(isSelected ? null : ud)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border shrink-0 ${
                isSelected
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/15'
              }`}
            >
              {ud.day.label}
              <span className="text-[10px] opacity-70 ml-1">({ud.routineName})</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="space-y-2">
          {hasDirtyEdits && (
            <div className="flex justify-end">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          )}
          {selectedDay.day.blocks.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Este día no tiene ejercicios</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDay.day.blocks.map((block, bi) => (
                <BlockPreviewEditable
                  key={block.id}
                  block={block}
                  index={bi}
                  expandedExercises={expandedExercises}
                  onToggleExercise={onToggleExercise}
                  getEditableSet={getEditableSet}
                  onUpdateSet={onUpdateSet}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Block Preview with expandable exercises ─────────────────────────────────

function BlockPreviewEditable({
  block,
  index,
  expandedExercises,
  onToggleExercise,
  getEditableSet,
  onUpdateSet,
}: {
  key?: string | number;
  block: RoutineBlock & { exercises: (RoutineExercise & { sets: RoutineSet[] })[] };
  index: number;
  expandedExercises: Set<string>;
  onToggleExercise: (id: string) => void;
  getEditableSet: (s: RoutineSet) => RoutineSet & { _dirty?: boolean };
  onUpdateSet: (setId: string, original: RoutineSet, field: string, value: number | null) => void;
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
        {block.exercises.map((ex, i) => {
          const isExpanded = expandedExercises.has(ex.id);
          return (
            <div key={ex.id} className="rounded-xl">
              {/* Exercise row (clickable) */}
              <button
                onClick={() => onToggleExercise(ex.id)}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {isGrouped ? String.fromCharCode(65 + i) : index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {ex.exercise_name}
                  </p>
                  {ex.notes && (
                    <p className="text-[11px] text-slate-400 truncate">{ex.notes}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 shrink-0 mr-1">
                  {formatV2SetsSummary(ex.sets)}
                </span>
                {isExpanded
                  ? <ChevronUp size={14} className="text-slate-300 shrink-0" />
                  : <ChevronDown size={14} className="text-slate-300 shrink-0" />
                }
              </button>

              {/* Expanded set details */}
              {isExpanded && ex.sets.length > 0 && (
                <div className="mx-3 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>#</span>
                    <span>Reps</span>
                    <span>Peso (kg)</span>
                    <span>RPE</span>
                  </div>
                  {/* Rows */}
                  {ex.sets.map((set) => {
                    const editable = getEditableSet(set);
                    const isDirty = (editable as any)._dirty;
                    return (
                      <div
                        key={set.id}
                        className={`grid grid-cols-[2rem_1fr_1fr_1fr] gap-1 px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 items-center ${
                          isDirty ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''
                        }`}
                      >
                        <span className="text-xs text-slate-400 font-semibold">{set.set_number}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={editable.reps ?? ''}
                          onChange={(e) => onUpdateSet(set.id, set, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={editable.weight_kg ?? ''}
                          onChange={(e) => onUpdateSet(set.id, set, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="10"
                          className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={editable.rpe_target ?? ''}
                          onChange={(e) => onUpdateSet(set.id, set, 'rpe_target', e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </div>
                    );
                  })}
                  {/* Rest between sets */}
                  {ex.rest_between_sets_sec && (
                    <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> Descanso entre series: {ex.rest_between_sets_sec}s
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatV2SetsSummary(sets: RoutineSet[]): string {
  if (sets.length === 0) return '—';

  const allSame = sets.every(
    (s) => s.reps === sets[0].reps && s.weight_kg === sets[0].weight_kg,
  );

  if (allSame) {
    const reps = sets[0].reps ?? (sets[0].time_sec ? `${sets[0].time_sec}s` : '?');
    const weight = sets[0].weight_kg ? `${sets[0].weight_kg}kg` : '';
    return `${sets.length} × ${reps}${weight ? ` × ${weight}` : ''}`;
  }

  return `${sets.length} series`;
}

