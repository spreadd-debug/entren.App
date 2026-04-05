import { useState } from "react";
import {
  GripVertical,
  Trash2,
  Plus,
  Unlink,
  Link,
  Pencil,
  Copy,
  Clock,
  Zap,
  RotateCw,
  Target,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RoutineBlockDraft, RoutineExerciseDraft, BlockType, SetType, WeightType } from "../../../shared/types";
import ExerciseInBlock from "./ExerciseInBlock";

const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; color: string; icon: any }> = {
  normal: { label: "", color: "", icon: null },
  superset: { label: "SUPERSERIE", color: "text-purple-500 bg-purple-500/10 border-purple-500/20", icon: Zap },
  triset: { label: "TRISERIE", color: "text-orange-500 bg-orange-500/10 border-orange-500/20", icon: Target },
  circuit: { label: "CIRCUITO", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: RotateCw },
};

function createEmptySet(setNumber: number) {
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

interface BlockCardProps {
  block: RoutineBlockDraft;
  blockIndex: number;
  onChange: (updated: RoutineBlockDraft) => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export default function BlockCard({
  block,
  blockIndex,
  onChange,
  onDelete,
  onAddExercise,
  onUngroup,
  onDuplicate,
  isSelected,
  onToggleSelect,
}: BlockCardProps) {
  const isGrouped = block.block_type !== "normal";
  const typeInfo = BLOCK_TYPE_LABELS[block.block_type];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleExerciseChange = (exIndex: number, updated: RoutineExerciseDraft) => {
    const newExercises = [...block.exercises];
    newExercises[exIndex] = updated;
    onChange({ ...block, exercises: newExercises });
  };

  const handleExerciseDelete = (exIndex: number) => {
    const newExercises = block.exercises.filter((_, i) => i !== exIndex);
    // If grouped block drops to 1 exercise, convert to normal
    if (newExercises.length <= 1 && isGrouped) {
      onChange({ ...block, block_type: "normal", exercises: newExercises });
    } else {
      onChange({ ...block, exercises: newExercises });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-900 rounded-2xl border ${
        isSelected
          ? "border-cyan-500 shadow-md shadow-cyan-500/10"
          : "border-slate-200 dark:border-slate-800"
      } shadow-sm dark:shadow-none overflow-hidden transition-all`}
    >
      {/* Block header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-500 transition-colors shrink-0"
        >
          <GripVertical size={16} />
        </button>

        {/* Block number */}
        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
          {blockIndex + 1}
        </span>

        {/* Block type badge */}
        {isGrouped && typeInfo.icon && (
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeInfo.color}`}>
            <typeInfo.icon size={10} />
            {typeInfo.label}
          </span>
        )}

        {/* Exercise name (for normal blocks) */}
        {!isGrouped && block.exercises.length === 1 && (
          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
            {block.exercises[0].exercise_name}
          </span>
        )}

        {/* Rest after block (for grouped) */}
        {isGrouped && (
          <div className="flex items-center gap-1 ml-auto mr-2">
            <Clock size={12} className="text-slate-400" />
            <input
              type="number"
              className="w-14 px-1 py-0.5 rounded text-xs text-center border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400"
              placeholder="90"
              value={block.rest_after_block_sec ?? ""}
              onChange={(e) =>
                onChange({
                  ...block,
                  rest_after_block_sec: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <span className="text-[10px] text-slate-400">seg</span>
          </div>
        )}

        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          {/* Select for grouping */}
          <button
            type="button"
            onClick={onToggleSelect}
            className={`p-1.5 rounded-lg transition-colors ${
              isSelected
                ? "bg-cyan-500/10 text-cyan-500"
                : "text-slate-300 dark:text-slate-700 hover:text-slate-500"
            }`}
            title="Seleccionar para agrupar"
          >
            <Link size={14} />
          </button>

          {/* Ungroup */}
          {isGrouped && (
            <button
              type="button"
              onClick={onUngroup}
              className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 hover:text-amber-500 transition-colors"
              title="Desagrupar"
            >
              <Unlink size={14} />
            </button>
          )}

          {/* Duplicate */}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 hover:text-slate-500 transition-colors"
            title="Duplicar"
          >
            <Copy size={14} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 hover:text-rose-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Exercises */}
      <div className="px-4 py-2">
        {block.exercises.map((ex, i) => (
          <ExerciseInBlock
            key={ex.id}
            exercise={ex}
            letterLabel={isGrouped ? String.fromCharCode(65 + i) : undefined}
            onChange={(updated) => handleExerciseChange(i, updated)}
            onDelete={() => handleExerciseDelete(i)}
            isInSuperset={isGrouped}
          />
        ))}

        {/* Add exercise to group */}
        {isGrouped && (
          <button
            type="button"
            onClick={onAddExercise}
            className="flex items-center gap-1.5 px-3 py-2 mt-1 rounded-xl text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors w-full"
          >
            <Plus size={14} />
            Agregar ejercicio al grupo
          </button>
        )}
      </div>
    </div>
  );
}
