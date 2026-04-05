import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
  GripVertical,
  Link,
  Zap,
  Target,
  RotateCw,
  CalendarPlus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Button } from "../UI";
import { RoutineBuilderService } from "../../services/RoutineBuilderService";
import { useToast } from "../../context/ToastContext";
import type {
  RoutineV2,
  RoutineDayDraft,
  RoutineBlockDraft,
  RoutineExerciseDraft,
  RoutineSetDraft,
  BlockType,
  SetType,
  WeightType,
} from "../../../shared/types";
import { AlertTriangle } from "lucide-react";
import BlockCard from "./BlockCard";
import ExercisePickerModal from "./ExercisePickerModal";

function createDefaultSets(count: number = 3): RoutineSetDraft[] {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    set_number: i + 1,
    set_type: "normal" as SetType,
    reps: null,
    reps_max: null,
    time_sec: null,
    weight_kg: null,
    weight_type: "absolute" as WeightType,
    rpe_target: null,
    rir_target: null,
    notes: null,
  }));
}

function createExercise(name: string, libraryId: string | null): RoutineExerciseDraft {
  return {
    id: crypto.randomUUID(),
    exercise_library_id: libraryId,
    exercise_name: name,
    order: 0,
    notes: null,
    rest_between_sets_sec: null,
    tempo: null,
    sets: createDefaultSets(3),
  };
}

interface RoutineEditorProps {
  routineId: string;
  gymId: string;
  onBack: () => void;
  /** Parent calls this to attempt navigation away; editor will confirm if dirty */
  onDirtyChange?: (dirty: boolean) => void;
}

export default function RoutineEditor({ routineId, gymId, onBack, onDirtyChange }: RoutineEditorProps) {
  const toast = useToast();
  const [routine, setRoutine] = useState<RoutineV2 | null>(null);
  const [days, setDays] = useState<RoutineDayDraft[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addToBlockId, setAddToBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

  // ─── Unsaved changes tracking ────────────────────────────────────────────
  const [dirty, setDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pendingExitAction = useRef<(() => void) | null>(null);
  const loadedSnapshot = useRef<string>("");

  const markDirty = () => {
    if (!dirty) {
      setDirty(true);
      onDirtyChange?.(true);
    }
  };

  const markClean = () => {
    setDirty(false);
    onDirtyChange?.(false);
    // Update snapshot to current state
    loadedSnapshot.current = JSON.stringify({ routine, days });
  };

  // Guard: browser tab close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /** Try to exit — if dirty, show confirmation. Otherwise execute immediately. */
  const guardedExit = useCallback((action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
    pendingExitAction.current = action;
    setShowExitConfirm(true);
  }, [dirty]);

  const confirmExit = () => {
    setShowExitConfirm(false);
    setDirty(false);
    onDirtyChange?.(false);
    pendingExitAction.current?.();
    pendingExitAction.current = null;
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
    pendingExitAction.current = null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDay = days[activeDayIndex] || null;

  // ─── Load routine ────────────────────────────────────────────────────────

  useEffect(() => {
    loadRoutine();
  }, [routineId]);

  const loadRoutine = async () => {
    setLoading(true);
    try {
      const full = await RoutineBuilderService.loadFullRoutine(routineId);
      setRoutine(full.routine);

      const draftDays: RoutineDayDraft[] = full.days.map((d) => ({
        id: d.id,
        label: d.label,
        order: d.order,
        blocks: d.blocks.map((b) => ({
          id: b.id,
          block_type: b.block_type,
          order: b.order,
          rest_after_block_sec: b.rest_after_block_sec,
          exercises: b.exercises.map((e) => ({
            id: e.id,
            exercise_library_id: e.exercise_library_id,
            exercise_name: e.exercise_name,
            order: e.order,
            notes: e.notes,
            rest_between_sets_sec: e.rest_between_sets_sec,
            tempo: e.tempo,
            sets: e.sets.map((s) => ({
              id: s.id,
              set_number: s.set_number,
              set_type: s.set_type,
              reps: s.reps,
              reps_max: s.reps_max,
              time_sec: s.time_sec,
              weight_kg: s.weight_kg,
              weight_type: s.weight_type,
              rpe_target: s.rpe_target,
              rir_target: s.rir_target,
              notes: s.notes,
            })),
          })),
        })),
      }));

      const finalDays = draftDays.length > 0 ? draftDays : [{
        id: crypto.randomUUID(),
        label: "Día 1",
        order: 0,
        blocks: [],
      }];
      setDays(finalDays);
      // Snapshot for dirty detection
      loadedSnapshot.current = JSON.stringify({ routine: full.routine, days: finalDays });
      setDirty(false);
      onDirtyChange?.(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la rutina");
    } finally {
      setLoading(false);
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!routine) return;
    setSaving(true);
    try {
      // Update routine name/desc
      await RoutineBuilderService.updateRoutine(routine.id, {
        name: routine.name,
        description: routine.description,
      });

      // Save each day
      for (const day of days) {
        // Ensure block/exercise orders are correct
        const orderedDay = {
          ...day,
          blocks: day.blocks.map((b, bi) => ({
            ...b,
            order: bi,
            exercises: b.exercises.map((e, ei) => ({
              ...e,
              order: ei,
              sets: e.sets.map((s, si) => ({ ...s, set_number: si + 1 })),
            })),
          })),
        };
        await RoutineBuilderService.saveDay(routine.id, orderedDay);
      }

      markClean();
      toast.success("Rutina guardada");
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ─── Dirty-aware state setters ─────────────────────────────────────────

  const setDaysDirty = (newDays: RoutineDayDraft[] | ((prev: RoutineDayDraft[]) => RoutineDayDraft[])) => {
    setDays(newDays);
    markDirty();
  };

  const setRoutineDirty = (newRoutine: RoutineV2) => {
    setRoutine(newRoutine);
    markDirty();
  };

  // ─── Day management ──────────────────────────────────────────────────────

  const handleAddDay = () => {
    const newDay: RoutineDayDraft = {
      id: crypto.randomUUID(),
      label: `Día ${days.length + 1}`,
      order: days.length,
      blocks: [],
    };
    setDaysDirty([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  const handleDeleteDay = (index: number) => {
    if (days.length <= 1) return;
    const newDays = days.filter((_, i) => i !== index);
    setDaysDirty(newDays);
    if (activeDayIndex >= newDays.length) {
      setActiveDayIndex(newDays.length - 1);
    }
  };

  const updateDayLabel = (index: number, label: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], label };
    setDaysDirty(newDays);
  };

  // ─── Block management ────────────────────────────────────────────────────

  const updateBlocks = (newBlocks: RoutineBlockDraft[]) => {
    if (!activeDay) return;
    const newDays = [...days];
    newDays[activeDayIndex] = { ...activeDay, blocks: newBlocks };
    setDaysDirty(newDays);
  };

  const handleAddExerciseToDay = () => {
    setAddToBlockId(null);
    setPickerOpen(true);
  };

  const handleAddExerciseToBlock = (blockId: string) => {
    setAddToBlockId(blockId);
    setPickerOpen(true);
  };

  const handleExercisePicked = (ex: { id: string; name: string; muscle_group: string | null }) => {
    if (!activeDay) return;

    const newExercise = createExercise(ex.name, ex.id);

    if (addToBlockId) {
      // Add to existing block (superset)
      const newBlocks = activeDay.blocks.map((b) => {
        if (b.id === addToBlockId) {
          return { ...b, exercises: [...b.exercises, { ...newExercise, order: b.exercises.length }] };
        }
        return b;
      });
      updateBlocks(newBlocks);
    } else {
      // Create new normal block
      const newBlock: RoutineBlockDraft = {
        id: crypto.randomUUID(),
        block_type: "normal",
        order: activeDay.blocks.length,
        rest_after_block_sec: null,
        exercises: [newExercise],
      };
      updateBlocks([...activeDay.blocks, newBlock]);
    }
  };

  const handleBlockChange = (blockIndex: number, updated: RoutineBlockDraft) => {
    if (!activeDay) return;
    const newBlocks = [...activeDay.blocks];
    newBlocks[blockIndex] = updated;
    updateBlocks(newBlocks);
  };

  const handleBlockDelete = (blockIndex: number) => {
    if (!activeDay) return;
    updateBlocks(activeDay.blocks.filter((_, i) => i !== blockIndex));
  };

  const handleBlockDuplicate = (blockIndex: number) => {
    if (!activeDay) return;
    const original = activeDay.blocks[blockIndex];
    const cloned: RoutineBlockDraft = {
      ...original,
      id: crypto.randomUUID(),
      order: activeDay.blocks.length,
      exercises: original.exercises.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        sets: e.sets.map((s) => ({ ...s, id: crypto.randomUUID() })),
      })),
    };
    updateBlocks([...activeDay.blocks, cloned]);
  };

  const handleUngroup = (blockIndex: number) => {
    if (!activeDay) return;
    const block = activeDay.blocks[blockIndex];
    if (block.exercises.length <= 1) return;

    const newBlocks = [...activeDay.blocks];
    newBlocks.splice(blockIndex, 1);

    const individualBlocks: RoutineBlockDraft[] = block.exercises.map((ex, i) => ({
      id: crypto.randomUUID(),
      block_type: "normal" as BlockType,
      order: blockIndex + i,
      rest_after_block_sec: null,
      exercises: [ex],
    }));

    newBlocks.splice(blockIndex, 0, ...individualBlocks);
    updateBlocks(newBlocks);
    setSelectedBlockIds(new Set());
  };

  // ─── Grouping ────────────────────────────────────────────────────────────

  const handleToggleSelect = (blockId: string) => {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const handleGroup = (type: BlockType) => {
    if (!activeDay || selectedBlockIds.size < 2) return;

    const selectedIndices = activeDay.blocks
      .map((b, i) => (selectedBlockIds.has(b.id) ? i : -1))
      .filter((i) => i !== -1)
      .sort((a, b) => a - b);

    const allExercises: RoutineExerciseDraft[] = [];
    for (const idx of selectedIndices) {
      allExercises.push(...activeDay.blocks[idx].exercises);
    }

    const grouped: RoutineBlockDraft = {
      id: crypto.randomUUID(),
      block_type: type,
      order: selectedIndices[0],
      rest_after_block_sec: 90,
      exercises: allExercises.map((e, i) => ({ ...e, order: i })),
    };

    const newBlocks = activeDay.blocks.filter((_, i) => !selectedIndices.includes(i));
    newBlocks.splice(selectedIndices[0], 0, grouped);
    updateBlocks(newBlocks);
    setSelectedBlockIds(new Set());
  };

  // ─── Drag & drop ─────────────────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    if (!activeDay) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeDay.blocks.findIndex((b) => b.id === active.id);
    const newIndex = activeDay.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    updateBlocks(arrayMove(activeDay.blocks, oldIndex, newIndex));
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="text-center py-12 text-slate-400">
        Rutina no encontrada
        <button onClick={onBack} className="block mx-auto mt-4 text-cyan-500 text-sm">Volver</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => guardedExit(onBack)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                className="text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-cyan-500 outline-none w-full"
                value={routine.name}
                onChange={(e) => setRoutineDirty({ ...routine, name: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              />
            ) : (
              <button type="button" onClick={() => setEditingName(true)} className="text-lg font-bold text-slate-900 dark:text-white hover:text-cyan-600 transition-colors truncate block w-full text-left">
                {routine.name || "Sin nombre"}
              </button>
            )}

            {editingDesc ? (
              <input
                autoFocus
                className="text-xs text-slate-500 bg-transparent border-b border-cyan-500/50 outline-none w-full mt-0.5"
                value={routine.description ?? ""}
                placeholder="Descripción (opcional)"
                onChange={(e) => setRoutineDirty({ ...routine, description: e.target.value || null })}
                onBlur={() => setEditingDesc(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingDesc(false)}
              />
            ) : (
              <button type="button" onClick={() => setEditingDesc(true)} className="text-xs text-slate-400 hover:text-slate-500 transition-colors block truncate w-full text-left mt-0.5">
                {routine.description || "Agregar descripción..."}
              </button>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {days.map((day, i) => (
          <div key={day.id} className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                i === activeDayIndex
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              onClick={() => setActiveDayIndex(i)}
              onDoubleClick={() => {
                const newLabel = prompt("Nombre del día:", day.label);
                if (newLabel) updateDayLabel(i, newLabel);
              }}
            >
              {day.label}
            </button>
            {days.length > 1 && i === activeDayIndex && (
              <button
                type="button"
                onClick={() => handleDeleteDay(i)}
                className="p-1 rounded text-slate-300 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddDay}
          className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors shrink-0"
          title="Agregar día"
        >
          <CalendarPlus size={16} />
        </button>
      </div>

      {/* Grouping toolbar */}
      {selectedBlockIds.size >= 2 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            {selectedBlockIds.size} seleccionados
          </span>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={() => handleGroup("superset")}>
              <Zap size={12} /> Superserie
            </Button>
            {selectedBlockIds.size >= 3 && (
              <Button size="sm" variant="outline" onClick={() => handleGroup("triset")}>
                <Target size={12} /> Triserie
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => handleGroup("circuit")}>
              <RotateCw size={12} /> Circuito
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedBlockIds(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Blocks */}
      {activeDay && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeDay.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {activeDay.blocks.map((block, i) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  blockIndex={i}
                  onChange={(updated) => handleBlockChange(i, updated)}
                  onDelete={() => handleBlockDelete(i)}
                  onAddExercise={() => handleAddExerciseToBlock(block.id)}
                  onUngroup={() => handleUngroup(i)}
                  onDuplicate={() => handleBlockDuplicate(i)}
                  isSelected={selectedBlockIds.has(block.id)}
                  onToggleSelect={() => handleToggleSelect(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add exercise button */}
      <button
        type="button"
        onClick={handleAddExerciseToDay}
        className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-cyan-500/40 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
      >
        <Plus size={18} />
        Agregar ejercicio
      </button>

      {/* Exercise picker modal */}
      <ExercisePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleExercisePicked}
      />

      {/* Unsaved changes confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelExit} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-sm mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Cambios sin guardar</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tenés cambios sin guardar en esta rutina. Si salís ahora, se van a perder.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="danger" onClick={confirmExit} fullWidth>
                Salir sin guardar
              </Button>
              <Button variant="outline" onClick={cancelExit} fullWidth>
                Seguir editando
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
