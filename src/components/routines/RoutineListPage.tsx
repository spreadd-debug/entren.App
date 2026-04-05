import { useState, useEffect } from "react";
import {
  Plus,
  Dumbbell,
  Pencil,
  Trash2,
  Copy,
  Users,
  Clock,
  BookTemplate,
  Loader2,
  Star,
  ChevronRight,
} from "lucide-react";
import { Card, Button, Input } from "../UI";
import { RoutineBuilderService } from "../../services/RoutineBuilderService";
import { useToast } from "../../context/ToastContext";
import type { RoutineV2 } from "../../../shared/types";

interface RoutineListPageProps {
  gymId: string;
  onEditRoutine: (routineId: string) => void;
}

export default function RoutineListPage({ gymId, onEditRoutine }: RoutineListPageProps) {
  const toast = useToast();
  const [routines, setRoutines] = useState<RoutineV2[]>([]);
  const [templates, setTemplates] = useState<RoutineV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({});
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [gymId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([
        RoutineBuilderService.getRoutines(gymId),
        RoutineBuilderService.getTemplates(gymId),
      ]);
      setRoutines(r);
      setTemplates(t);

      // Load counts in parallel
      const allRoutines = [...r, ...t];
      const [exCounts, asCounts] = await Promise.all([
        Promise.all(allRoutines.map(async (rt) => ({
          id: rt.id,
          count: await RoutineBuilderService.getRoutineExerciseCount(rt.id),
        }))),
        Promise.all(allRoutines.map(async (rt) => ({
          id: rt.id,
          count: await RoutineBuilderService.getRoutineAssignmentCount(rt.id),
        }))),
      ]);

      const exMap: Record<string, number> = {};
      const asMap: Record<string, number> = {};
      for (const e of exCounts) exMap[e.id] = e.count;
      for (const a of asCounts) asMap[a.id] = a.count;
      setExerciseCounts(exMap);
      setAssignmentCounts(asMap);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar rutinas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (fromTemplateId?: string) => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      let routineId: string;
      if (fromTemplateId) {
        routineId = await RoutineBuilderService.cloneRoutine(fromTemplateId, newName.trim(), gymId);
      } else {
        const routine = await RoutineBuilderService.createRoutine(gymId, newName.trim(), newDesc.trim() || undefined);
        routineId = routine.id;
      }
      setNewName("");
      setNewDesc("");
      setShowCreateForm(false);
      onEditRoutine(routineId);
    } catch (err) {
      console.error(err);
      toast.error("Error al crear rutina");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      setTimeout(() => setPendingDeleteId(null), 3000);
      return;
    }
    try {
      await RoutineBuilderService.deleteRoutine(id);
      setRoutines(routines.filter((r) => r.id !== id));
      setTemplates(templates.filter((r) => r.id !== id));
      toast.success("Rutina eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
    }
    setPendingDeleteId(null);
  };

  const handleClone = async (routine: RoutineV2) => {
    try {
      await RoutineBuilderService.cloneRoutine(routine.id, `${routine.name} (copia)`, gymId);
      toast.success("Rutina duplicada");
      loadData();
    } catch (err) {
      toast.error("Error al duplicar");
    }
  };

  const handleToggleTemplate = async (routine: RoutineV2) => {
    try {
      await RoutineBuilderService.updateRoutine(routine.id, { is_template: !routine.is_template });
      toast.success(routine.is_template ? "Ya no es plantilla" : "Marcada como plantilla");
      loadData();
    } catch (err) {
      toast.error("Error");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  };

  const renderRoutineCard = (routine: RoutineV2) => {
    const exCount = exerciseCounts[routine.id] || 0;
    const asCount = assignmentCounts[routine.id] || 0;

    return (
      <Card
        key={routine.id}
        className="group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        onClick={() => onEditRoutine(routine.id)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {routine.name}
              </h3>
              {routine.description && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{routine.description}</p>
              )}
            </div>
            {routine.is_template && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                Plantilla
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Dumbbell size={12} />
              {exCount} ejercicios
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {asCount} alumnos
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(routine.updated_at)}
            </span>
          </div>

          {/* Actions (stop propagation) */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditRoutine(routine.id); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <Pencil size={12} /> Editar
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClone(routine); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Copy size={12} /> Duplicar
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleTemplate(routine); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                routine.is_template
                  ? "text-amber-500 hover:bg-amber-500/10"
                  : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Star size={12} /> {routine.is_template ? "Quitar plantilla" : "Plantilla"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(routine.id); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ml-auto ${
                pendingDeleteId === routine.id
                  ? "text-white bg-rose-500"
                  : "text-slate-300 dark:text-slate-700 hover:text-rose-500"
              }`}
            >
              <Trash2 size={12} /> {pendingDeleteId === routine.id ? "Confirmar" : ""}
            </button>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={24} className="animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rutinas</h2>
          <p className="text-xs text-slate-400 mt-0.5">{routines.length} rutinas, {templates.length} plantillas</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} /> Crear rutina
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card className="p-5 space-y-3 border-cyan-500/30 shadow-md shadow-cyan-500/5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nueva rutina</h3>
          <Input
            placeholder="Nombre de la rutina"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Input
            placeholder="Descripción (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />

          {templates.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                <BookTemplate size={12} />
                {showTemplates ? "Ocultar plantillas" : "Usar una plantilla como base"}
                <ChevronRight size={12} className={`transition-transform ${showTemplates ? "rotate-90" : ""}`} />
              </button>
              {showTemplates && (
                <div className="mt-2 space-y-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleCreate(t.id)}
                      disabled={creating || !newName.trim()}
                    >
                      <Star size={14} className="text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{t.name}</span>
                      <span className="text-xs text-slate-400 ml-auto shrink-0">{exerciseCounts[t.id] || 0} ej.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => handleCreate()} disabled={creating || !newName.trim()} fullWidth>
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Empezar de cero
            </Button>
            <Button variant="ghost" onClick={() => { setShowCreateForm(false); setNewName(""); setNewDesc(""); }}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Routines grid */}
      {routines.length === 0 && templates.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell size={40} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
          <p className="text-sm text-slate-400">No hay rutinas creadas</p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Creá tu primera rutina para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {routines.map(renderRoutineCard)}
        </div>
      )}

      {/* Templates section */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
            <Star size={14} />
            Plantillas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map(renderRoutineCard)}
          </div>
        </div>
      )}
    </div>
  );
}
