import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Plus,
  Clock,
  Timer,
  GripVertical,
  StickyNote,
} from "lucide-react";
import type { RoutineExerciseDraft, RoutineSetDraft, SetType, WeightType } from "../../../shared/types";
import SetRow from "./SetRow";

interface ExerciseInBlockProps {
  key?: string | number;
  exercise: RoutineExerciseDraft;
  letterLabel?: string; // "A", "B", "C" for supersets
  onChange: (updated: RoutineExerciseDraft) => void;
  onDelete: () => void;
  dragHandleProps?: any;
  isInSuperset: boolean;
}

function createEmptySet(setNumber: number): RoutineSetDraft {
  return {
    id: crypto.randomUUID(),
    set_number: setNumber,
    set_type: "normal" as SetType,
    reps: null,
    reps_max: null,
    time_sec: null,
    weight_kg: null,
    weight_type: "absolute" as WeightType,
    rpe_target: null,
    rir_target: null,
    notes: null,
  };
}

export default function ExerciseInBlock({
  exercise,
  letterLabel,
  onChange,
  onDelete,
  dragHandleProps,
  isInSuperset,
}: ExerciseInBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [useTime, setUseTime] = useState(
    exercise.sets.some((s) => s.time_sec !== null && s.time_sec > 0)
  );

  const setsCount = exercise.sets.length;
  const hasVariedSets = exercise.sets.length > 1 && new Set(exercise.sets.map((s) => `${s.reps}-${s.weight_kg}`)).size > 1;

  // Summary line for collapsed view
  const summaryText = (() => {
    if (setsCount === 0) return "Sin series";
    if (!hasVariedSets) {
      const s = exercise.sets[0];
      const repsStr = s.time_sec ? `${s.time_sec}seg` : s.reps_max ? `${s.reps}-${s.reps_max}` : `${s.reps ?? "?"}`;
      const weightStr = s.weight_type === "bodyweight" ? "corporal" : s.weight_type === "not_specified" ? "" : s.weight_kg ? `${s.weight_kg}kg` : "";
      return `${setsCount} × ${repsStr}${weightStr ? ` × ${weightStr}` : ""}`;
    }
    return exercise.sets.map((s) => {
      const r = s.time_sec ? `${s.time_sec}s` : `${s.reps ?? "?"}`;
      const w = s.weight_kg ? `${s.weight_kg}kg` : "";
      return `${r}${w ? `×${w}` : ""}`;
    }).join(" / ");
  })();

  const handleSetChange = (index: number, updated: RoutineSetDraft) => {
    const newSets = [...exercise.sets];
    newSets[index] = updated;
    onChange({ ...exercise, sets: newSets });
  };

  const handleAddSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: RoutineSetDraft = lastSet
      ? { ...lastSet, id: crypto.randomUUID(), set_number: setsCount + 1 }
      : createEmptySet(setsCount + 1);
    onChange({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const handleDeleteSet = (index: number) => {
    const newSets = exercise.sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, set_number: i + 1 }));
    onChange({ ...exercise, sets: newSets });
  };

  const handleCopyToAll = () => {
    if (exercise.sets.length < 2) return;
    const first = exercise.sets[0];
    const newSets = exercise.sets.map((s, i) => ({
      ...first,
      id: s.id,
      set_number: i + 1,
    }));
    onChange({ ...exercise, sets: newSets });
  };

  return (
    <div className={`${isInSuperset ? "border-l-2 border-cyan-500/30 pl-3" : ""}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 py-2">
        {isInSuperset && dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700 hover:text-slate-500">
            <GripVertical size={14} />
          </div>
        )}

        {letterLabel && (
          <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
            {letterLabel}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <button
            type="button"
            className="w-full text-left flex items-center gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {exercise.exercise_name}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
              {summaryText}
            </span>
            {expanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
          </button>
        </div>

        <button type="button" onClick={onDelete} className="p-1 rounded-lg text-slate-300 dark:text-slate-700 hover:text-rose-500 transition-colors shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Notes preview (collapsed) */}
      {!expanded && exercise.notes && (
        <div className="flex items-start gap-1 pb-2 pl-8">
          <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" />
          <span className="text-xs text-slate-500 dark:text-slate-400 italic truncate">{exercise.notes}</span>
        </div>
      )}

      {/* Expanded edit view */}
      {expanded && (
        <div className="pb-3 space-y-3">
          {/* Sets header */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Series</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button
              type="button"
              onClick={() => setUseTime(!useTime)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                useTime ? "bg-purple-500/10 text-purple-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <Timer size={10} />
              {useTime ? "Tiempo" : "Reps"}
            </button>
            {exercise.sets.length >= 2 && (
              <button
                type="button"
                onClick={handleCopyToAll}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
              >
                <Copy size={10} />
                Copiar serie 1 a todas
              </button>
            )}
          </div>

          {/* Set rows */}
          <div className="space-y-0.5">
            {exercise.sets.map((set, i) => (
              <SetRow
                key={set.id}
                set={set}
                index={i}
                useTime={useTime}
                onChange={(updated) => handleSetChange(i, updated)}
                onDelete={() => handleDeleteSet(i)}
                canDelete={exercise.sets.length > 1}
              />
            ))}
          </div>

          {/* Add set */}
          <button
            type="button"
            onClick={handleAddSet}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Plus size={12} />
            Agregar serie
          </button>

          {/* Exercise-level fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Descanso</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  className="w-full px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="90"
                  value={exercise.rest_between_sets_sec ?? ""}
                  onChange={(e) => onChange({ ...exercise, rest_between_sets_sec: e.target.value ? Number(e.target.value) : null })}
                />
                <Clock size={12} className="text-slate-400 shrink-0" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Tempo</label>
              <input
                type="text"
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="3-1-2-0"
                value={exercise.tempo ?? ""}
                onChange={(e) => onChange({ ...exercise, tempo: e.target.value || null })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Notas</label>
              <input
                type="text"
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Controlá la bajada, apretá arriba..."
                value={exercise.notes ?? ""}
                onChange={(e) => onChange({ ...exercise, notes: e.target.value || null })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
