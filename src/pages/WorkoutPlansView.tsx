import { useEffect, useRef, useState, useMemo } from "react";
import {
  Dumbbell,
  Plus,
  ListOrdered,
  PlayCircle,
  Trash2,
  Pencil,
  BookOpen,
  ChevronDown,
  Users,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Card, Button, Input } from "../components/UI";
import { WorkoutPlanService, LibraryExercise } from "../services/WorkoutPlanService";
import RoutineListPage from "../components/routines/RoutineListPage";
import RoutineEditor from "../components/routines/RoutineEditor";
import { WorkoutRequestService } from "../services/WorkoutRequestService";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";
import { useToast } from "../context/ToastContext";
import { getWorkoutFreshness } from "../config/workoutConfig";
import { supabase } from "../db/supabase";

// Ordered top-to-bottom following body anatomy
const MUSCLE_GROUPS = [
  "Cuello",
  "Trapecios",
  "Hombros",
  "Pecho",
  "Espalda",
  "Espalda Media",
  "Espalda Baja",
  "Bíceps",
  "Tríceps",
  "Antebrazos",
  "Abdomen",
  "Glúteos",
  "Cuádriceps",
  "Isquiotibiales",
  "Aductores",
  "Abductores",
  "Pantorrillas",
];

type Tab = "plans" | "library" | "students";

// ─── Reusable Exercise Picker (group dropdown + search) ─────────────────────

function ExercisePicker({
  libraryExercises,
  muscleGroup,
  onMuscleGroupChange,
  selectedId,
  onSelect,
}: {
  libraryExercises: LibraryExercise[];
  muscleGroup: string;
  onMuscleGroupChange: (g: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    let results = libraryExercises;
    if (muscleGroup) {
      results = results.filter((ex) => ex.muscle_group === muscleGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter((ex) =>
        ex.name.toLowerCase().includes(q) ||
        (ex.muscle_group ?? "").toLowerCase().includes(q)
      );
    }
    return results;
  }, [libraryExercises, muscleGroup, search]);

  const selectedExercise = libraryExercises.find((ex) => ex.id === selectedId);

  const handleSelect = (id: string) => {
    onSelect(id);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Step 1: muscle group dropdown */}
      <div className="relative">
        <ChevronDown
          size={16}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <select
          className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none pr-10 font-medium"
          value={muscleGroup}
          onChange={(e) => {
            onMuscleGroupChange(e.target.value);
            onSelect("");
            setSearch("");
          }}
        >
          <option value="">Todos los grupos musculares</option>
          {MUSCLE_GROUPS.filter((g) =>
            libraryExercises.some((ex) => ex.muscle_group === g)
          ).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: search + results */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder={selectedExercise ? selectedExercise.name : "Buscar ejercicio por nombre..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full pl-11 pr-4 h-12 rounded-2xl border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
            selectedExercise
              ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-white placeholder:text-indigo-500 dark:placeholder:text-indigo-400"
              : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
          }`}
        />
        {selectedExercise && !search && (
          <button
            type="button"
            onClick={() => { onSelect(""); setSearch(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <span className="text-xs font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && search.trim() === "" && !selectedExercise && filtered.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleSelect(ex.id)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{ex.name}</span>
              {!muscleGroup && ex.muscle_group && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0 ml-2">
                  {ex.muscle_group}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && search.trim() !== "" && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sin resultados para "{search}"</p>
          ) : (
            filtered.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelect(ex.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{ex.name}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0 ml-2">
                  {ex.muscle_group ?? ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkoutPlansView({ gymId }: { gymId: string }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);

  const handleTabSwitch = (tab: Tab) => {
    if (editingRoutineId && editorDirty && tab !== "plans") {
      setPendingTab(tab);
      return;
    }
    setActiveTab(tab);
    if (tab !== "plans") setEditingRoutineId(null);
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setEditorDirty(false);
      setEditingRoutineId(null);
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  // ─── Students tab state ───────────────────────────────────────────────────
  const [studentsWorkoutData, setStudentsWorkoutData] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [pendingDeletePlanId, setPendingDeletePlanId] = useState<string | null>(null);
  const [pendingDeleteExerciseId, setPendingDeleteExerciseId] = useState<string | null>(null);
  const [pendingDeleteLibId, setPendingDeleteLibId] = useState<string | null>(null);
  const pendingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Plans ────────────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanDescription, setEditPlanDescription] = useState("");

  // Add exercise form
  const [filterMuscleGroup, setFilterMuscleGroup] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Edit exercise inline
  const [editFilterMuscleGroup, setEditFilterMuscleGroup] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editLibraryId, setEditLibraryId] = useState("");

  // ─── Library ──────────────────────────────────────────────────────────────
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [libName, setLibName] = useState("");
  const [libDescription, setLibDescription] = useState("");
  const [libMuscleGroup, setLibMuscleGroup] = useState("");
  const [libVideoUrl, setLibVideoUrl] = useState("");
  const [isSavingLib, setIsSavingLib] = useState(false);

  // ─── Video Modal ──────────────────────────────────────────────────────────
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    videoUrl: string;
  }>({ isOpen: false, exerciseName: "", videoUrl: "" });

  // ─── Loaders ──────────────────────────────────────────────────────────────
  const loadPlans = async () => {
    const data = await WorkoutPlanService.getPlans(gymId);
    const safeData = Array.isArray(data) ? data : [];
    setPlans(safeData);
    if (selectedPlan) {
      setSelectedPlan(safeData.find((p) => p.id === selectedPlan.id) || null);
    }
  };

  const loadExercises = async (planId: string) => {
    const data = await WorkoutPlanService.getExercises(planId);
    setExercises(Array.isArray(data) ? data : []);
  };

  const loadLibrary = async () => {
    const data = await WorkoutPlanService.getLibraryExercises();
    setLibraryExercises(data);
  };

  useEffect(() => {
    loadPlans();
    loadLibrary();
  }, []);

  // ─── Plans CRUD ───────────────────────────────────────────────────────────
  const createPlan = async () => {
    if (!planName.trim()) return;
    const plan = await WorkoutPlanService.createPlan(gymId, planName.trim(), planDescription.trim());
    setPlanName("");
    setPlanDescription("");
    await loadPlans();
    setSelectedPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanDescription(plan.description || "");
    await loadExercises(plan.id);
  };

  const deletePlan = async (planId: string) => {
    if (pendingDeletePlanId !== planId) {
      setPendingDeletePlanId(planId);
      clearTimeout(pendingTimers.current['plan']);
      pendingTimers.current['plan'] = setTimeout(() => setPendingDeletePlanId(null), 3000);
      return;
    }
    setPendingDeletePlanId(null);
    await WorkoutPlanService.deletePlan(planId);
    if (selectedPlan?.id === planId) {
      setSelectedPlan(null);
      setExercises([]);
      setIsEditingPlan(false);
    }
    await loadPlans();
  };

  const savePlan = async () => {
    if (!selectedPlan || !editPlanName.trim()) return;
    const updated = await WorkoutPlanService.updatePlan(selectedPlan.id, {
      name: editPlanName.trim(),
      description: editPlanDescription.trim() || null,
    });
    setSelectedPlan(updated);
    setIsEditingPlan(false);
    await loadPlans();
  };

  // ─── Exercises CRUD ───────────────────────────────────────────────────────
  const handleLibrarySelect = (libraryId: string) => {
    setSelectedLibraryId(libraryId);
    if (!libraryId) return;
    const found = libraryExercises.find((e) => e.id === libraryId);
    if (found) {
      setExerciseName(found.name);
      setVideoUrl(found.video_url || "");
    }
  };

  const addExercise = async () => {
    if (!selectedPlan || !exerciseName.trim()) return;
    await WorkoutPlanService.addExercise(selectedPlan.id, {
      exerciseName: exerciseName.trim(),
      exerciseOrder: exercises.length + 1,
      sets: sets ? Number(sets) : null,
      reps: reps || null,
      weight: weight || null,
      restSeconds: null,
      notes: null,
      videoUrl: videoUrl.trim() || null,
      exerciseLibraryId: selectedLibraryId || null,
    });
    setFilterMuscleGroup("");
    setSelectedLibraryId("");
    setExerciseName("");
    setSets("");
    setReps("");
    setWeight("");
    setVideoUrl("");
    await loadExercises(selectedPlan.id);
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!selectedPlan) return;
    if (pendingDeleteExerciseId !== exerciseId) {
      setPendingDeleteExerciseId(exerciseId);
      clearTimeout(pendingTimers.current['exercise']);
      pendingTimers.current['exercise'] = setTimeout(() => setPendingDeleteExerciseId(null), 3000);
      return;
    }
    setPendingDeleteExerciseId(null);
    await WorkoutPlanService.deleteExercise(exerciseId);
    await loadExercises(selectedPlan.id);
  };

  const startEditExercise = (exercise: any) => {
    setEditFilterMuscleGroup("");
    setEditingExerciseId(exercise.id);
    setEditExerciseName(exercise.exercise_name || "");
    setEditSets(exercise.sets != null ? String(exercise.sets) : "");
    setEditReps(exercise.reps || "");
    setEditWeight(exercise.weight || "");
    setEditVideoUrl(exercise.video_url || "");
    setEditLibraryId(exercise.exercise_library_id || "");
  };

  const cancelEditExercise = () => {
    setEditFilterMuscleGroup("");
    setEditingExerciseId(null);
    setEditExerciseName("");
    setEditSets("");
    setEditReps("");
    setEditWeight("");
    setEditVideoUrl("");
    setEditLibraryId("");
  };

  const handleEditLibrarySelect = (libraryId: string) => {
    setEditLibraryId(libraryId);
    if (!libraryId) return;
    const found = libraryExercises.find((e) => e.id === libraryId);
    if (found) {
      setEditExerciseName(found.name);
      setEditVideoUrl(found.video_url || "");
    }
  };

  const saveExercise = async () => {
    if (!editingExerciseId || !editExerciseName.trim() || !selectedPlan) return;
    await WorkoutPlanService.updateExercise(editingExerciseId, {
      exerciseName: editExerciseName.trim(),
      sets: editSets ? Number(editSets) : null,
      reps: editReps.trim() || null,
      weight: editWeight.trim() || null,
      videoUrl: editVideoUrl.trim() || null,
      exerciseLibraryId: editLibraryId || null,
    });
    cancelEditExercise();
    await loadExercises(selectedPlan.id);
  };

  // ─── Library CRUD ─────────────────────────────────────────────────────────
  const createLibraryExercise = async () => {
    if (!libName.trim()) return;
    setIsSavingLib(true);
    try {
      await WorkoutPlanService.createLibraryExercise({
        name: libName.trim(),
        description: libDescription.trim() || null,
        muscleGroup: libMuscleGroup || null,
        videoUrl: libVideoUrl.trim() || null,
      });
      setLibName("");
      setLibDescription("");
      setLibMuscleGroup("");
      setLibVideoUrl("");
      await loadLibrary();
    } finally {
      setIsSavingLib(false);
    }
  };

  const deleteLibraryExercise = async (id: string) => {
    if (pendingDeleteLibId !== id) {
      setPendingDeleteLibId(id);
      clearTimeout(pendingTimers.current['lib']);
      pendingTimers.current['lib'] = setTimeout(() => setPendingDeleteLibId(null), 3000);
      return;
    }
    setPendingDeleteLibId(null);
    await WorkoutPlanService.deleteLibraryExercise(id);
    await loadLibrary();
  };

  // ─── Students tab: carga lazy cuando se abre por primera vez ────────────────

  const loadStudentsWorkoutData = async () => {
    try {
      setIsLoadingStudents(true);

      // 1. Alumnos activos del gym
      const { data: students } = await supabase
        .from("students")
        .select("id, nombre, apellido")
        .eq("gym_id", gymId)
        .eq("status", "activo");

      const studentIds = (students ?? []).map((s: any) => s.id);

      // 2a. V2 routine assignments (preferred)
      const { data: v2Assignments } = await supabase
        .from("routine_assignments")
        .select("student_id, routine_id, assigned_at, routines(name)")
        .eq("active", true);

      // 2b. Legacy assignments (fallback)
      const { data: legacyAssignments } = await supabase
        .from("student_workout_assignments")
        .select("student_id, workout_plan_id, assigned_at, workout_plans(name)")
        .eq("gym_id", gymId)
        .eq("active", true);

      // 3. Solicitudes pendientes
      const pendingRequests = await WorkoutRequestService.getPendingRequests(gymId);
      const requestsByStudent = new Map(
        pendingRequests.map((r: any) => [r.student_id, r]),
      );

      // 4. Adherencia últimos 30 días (una query para todos los alumnos)
      const adherenceMap = new Map<string, { total: number; completed: number }>();
      if (studentIds.length > 0) {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const sinceStr = since.toLocaleDateString("sv-SE");
        const { data: sessions } = await supabase
          .from("workout_sessions")
          .select("student_id, completed_at")
          .in("student_id", studentIds)
          .gte("session_date", sinceStr);
        (sessions ?? []).forEach((s: any) => {
          const curr = adherenceMap.get(s.student_id) ?? { total: 0, completed: 0 };
          curr.total++;
          if (s.completed_at) curr.completed++;
          adherenceMap.set(s.student_id, curr);
        });
      }

      // 5. Merge: prefer v2 assignments, fallback to legacy
      const v2ByStudent = new Map<string, any>();
      (v2Assignments ?? []).forEach((a: any) => {
        const existing = v2ByStudent.get(a.student_id);
        if (!existing || (a.assigned_at ?? "") > (existing.assigned_at ?? "")) {
          v2ByStudent.set(a.student_id, a);
        }
      });

      const legacyByStudent = new Map<string, any>();
      (legacyAssignments ?? []).forEach((a: any) => {
        const existing = legacyByStudent.get(a.student_id);
        if (!existing || (a.assigned_at ?? "") > (existing.assigned_at ?? "")) {
          legacyByStudent.set(a.student_id, a);
        }
      });

      const rows = (students ?? []).map((s: any) => {
        const v2 = v2ByStudent.get(s.id);
        const legacy = legacyByStudent.get(s.id);
        const request = requestsByStudent.get(s.id) ?? null;
        const adh = adherenceMap.get(s.id);

        // Prefer v2 routine name over legacy
        const plan_name = v2
          ? (v2.routines?.name ?? null)
          : (legacy?.workout_plans?.name ?? null);
        const updated_at = v2
          ? (v2.assigned_at ?? null)
          : (legacy?.assigned_at ?? null);

        return {
          id: s.id,
          name: `${s.nombre ?? ""} ${s.apellido ?? ""}`.trim(),
          plan_name,
          updated_at,
          hasPendingRequest: !!request,
          request,
          adherence: adh
            ? { total: adh.total, completed: adh.completed, percent: Math.round((adh.completed / adh.total) * 100) }
            : null,
        };
      });

      // Ordenar: pendientes primero, luego por antigüedad desc (más viejos primero)
      rows.sort((a, b) => {
        if (a.hasPendingRequest !== b.hasPendingRequest) return a.hasPendingRequest ? -1 : 1;
        if (!a.updated_at && !b.updated_at) return 0;
        if (!a.updated_at) return -1;
        if (!b.updated_at) return 1;
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      });

      setStudentsWorkoutData(rows);
      setStudentsLoaded(true);
    } catch (error) {
      console.error("Error loading students workout data:", error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeTab === "students" && !studentsLoaded) {
      loadStudentsWorkoutData();
    }
  }, [activeTab]);

  const handleResolveRequest = async (requestId: string, studentId: string) => {
    try {
      await WorkoutRequestService.resolveRequest(requestId);
      setStudentsWorkoutData((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, hasPendingRequest: false, request: null } : s,
        ),
      );
      toast.success("Solicitud marcada como atendida");
    } catch (error) {
      toast.error("No se pudo actualizar la solicitud");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTabSwitch("plans")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === "plans"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <Dumbbell size={16} />
          Rutinas
        </button>
        <button
          onClick={() => handleTabSwitch("library")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === "library"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <BookOpen size={16} />
          Biblioteca
          {libraryExercises.length > 0 && (
            <span
              className={`text-xs font-black px-1.5 py-0.5 rounded-lg ${
                activeTab === "library"
                  ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {libraryExercises.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabSwitch("students")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === "students"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <Users size={16} />
          Alumnos
        </button>
      </div>

      {/* ── Unsaved changes modal (tab switch while editing) ──────────────── */}
      {pendingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPendingTab(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-sm mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Cambios sin guardar</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tenés cambios sin guardar en la rutina. Si cambiás de sección, se van a perder.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="danger" onClick={confirmTabSwitch} className="flex-1">
                Salir sin guardar
              </Button>
              <Button variant="outline" onClick={() => setPendingTab(null)} className="flex-1">
                Seguir editando
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANS TAB (v2 builder) ────────────────────────────────────────── */}
      {activeTab === "plans" && (
        editingRoutineId ? (
          <RoutineEditor
            routineId={editingRoutineId}
            gymId={gymId}
            onBack={() => setEditingRoutineId(null)}
            onDirtyChange={setEditorDirty}
          />
        ) : (
          <RoutineListPage
            gymId={gymId}
            onEditRoutine={(id) => setEditingRoutineId(id)}
          />
        )
      )}

      {/* ── PLANS TAB (legacy, hidden) ───────────────────────────────────── */}
      {false && activeTab === "plans" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: create + list */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Nueva rutina</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Creá una rutina base para tus alumnos.
                  </p>
                </div>
              </div>

              <Input
                placeholder="Nombre de la rutina"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
              <textarea
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                rows={3}
                placeholder="Descripción"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
              />
              <Button variant="secondary" fullWidth onClick={createPlan}>
                Crear rutina
              </Button>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  <ListOrdered size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Rutinas creadas</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {plans.length} cargadas
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {plans.length > 0 ? (
                  plans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`w-full p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200 dark:shadow-slate-900"
                            : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600"
                        }`}
                      >
                        <button
                          onClick={async () => {
                            setSelectedPlan(plan);
                            setEditPlanName(plan.name || "");
                            setEditPlanDescription(plan.description || "");
                            setIsEditingPlan(false);
                            await loadExercises(plan.id);
                          }}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold">{plan.name}</p>
                              <p
                                className={`text-sm ${
                                  isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {plan.description || "Sin descripción"}
                              </p>
                            </div>
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                isSelected
                                  ? "bg-white/10 text-white"
                                  : "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200"
                              }`}
                            >
                              <Dumbbell size={18} />
                            </div>
                          </div>
                        </button>

                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => deletePlan(plan.id)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                              pendingDeletePlanId === plan.id
                                ? "bg-rose-500 text-white"
                                : isSelected
                                ? "bg-white/10 text-white hover:bg-white/20"
                                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            }`}
                          >
                            <Trash2 size={15} />
                            {pendingDeletePlanId === plan.id ? "¿Confirmar?" : "Eliminar"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                    Todavía no hay rutinas creadas.
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Right: plan detail + exercises */}
          <div className="xl:col-span-2">
            <Card className="p-5 space-y-5 min-h-[500px]">
              {selectedPlan ? (
                <>
                  {/* Plan header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {isEditingPlan ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Nombre de la rutina"
                            value={editPlanName}
                            onChange={(e) => setEditPlanName(e.target.value)}
                          />
                          <textarea
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                            rows={3}
                            placeholder="Descripción"
                            value={editPlanDescription}
                            onChange={(e) => setEditPlanDescription(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button variant="secondary" onClick={savePlan}>
                              Guardar rutina
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditingPlan(false)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {selectedPlan.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {selectedPlan.description || "Sin descripción"}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold">
                        {exercises.length} ejercicios
                      </div>
                      {!isEditingPlan && (
                        <button
                          onClick={() => {
                            setEditPlanName(selectedPlan.name || "");
                            setEditPlanDescription(selectedPlan.description || "");
                            setIsEditingPlan(true);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-bold"
                        >
                          <Pencil size={15} />
                          Editar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add exercise form */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Agregar ejercicio
                    </p>

                    {/* Library picker — muscle group filter + search */}
                    {libraryExercises.length > 0 && (
                      <ExercisePicker
                        libraryExercises={libraryExercises}
                        muscleGroup={filterMuscleGroup}
                        onMuscleGroupChange={(g) => {
                          setFilterMuscleGroup(g);
                          setSelectedLibraryId("");
                          setExerciseName("");
                          setVideoUrl("");
                        }}
                        selectedId={selectedLibraryId}
                        onSelect={(id) => handleLibrarySelect(id)}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Nombre del ejercicio"
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                      />
                      <Input
                        placeholder="Link de video (YouTube)"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                      <Input
                        placeholder="Series"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                      />
                      <Input
                        placeholder="Reps"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                      />
                      <Input
                        placeholder="Peso"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={addExercise}>
                        Agregar ejercicio
                      </Button>
                    </div>
                  </div>

                  {/* Exercise list */}
                  <div className="space-y-3">
                    {exercises.length > 0 ? (
                      exercises.map((exercise, index) => (
                        <div
                          key={exercise.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50"
                        >
                          {editingExerciseId === exercise.id ? (
                            <div className="space-y-3">
                              {/* Edit library picker — muscle group filter + search */}
                              {libraryExercises.length > 0 && (
                                <ExercisePicker
                                  libraryExercises={libraryExercises}
                                  muscleGroup={editFilterMuscleGroup}
                                  onMuscleGroupChange={(g) => {
                                    setEditFilterMuscleGroup(g);
                                    setEditLibraryId("");
                                    setEditExerciseName("");
                                    setEditVideoUrl("");
                                  }}
                                  selectedId={editLibraryId}
                                  onSelect={(id) => handleEditLibrarySelect(id)}
                                />
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                  placeholder="Ejercicio"
                                  value={editExerciseName}
                                  onChange={(e) => setEditExerciseName(e.target.value)}
                                />
                                <Input
                                  placeholder="Link de video (YouTube)"
                                  value={editVideoUrl}
                                  onChange={(e) => setEditVideoUrl(e.target.value)}
                                />
                                <Input
                                  placeholder="Series"
                                  value={editSets}
                                  onChange={(e) => setEditSets(e.target.value)}
                                />
                                <Input
                                  placeholder="Reps"
                                  value={editReps}
                                  onChange={(e) => setEditReps(e.target.value)}
                                />
                                <Input
                                  placeholder="Peso"
                                  value={editWeight}
                                  onChange={(e) => setEditWeight(e.target.value)}
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={saveExercise}>
                                  Guardar
                                </Button>
                                <Button variant="outline" onClick={cancelEditExercise}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold shrink-0">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {exercise.exercise_name}
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {exercise.sets || "-"} series · {exercise.reps || "-"} reps ·{" "}
                                    {exercise.weight || "-"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                {exercise.video_url && (
                                  <button
                                    onClick={() =>
                                      setVideoModal({
                                        isOpen: true,
                                        exerciseName: exercise.exercise_name,
                                        videoUrl: exercise.video_url,
                                      })
                                    }
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors text-sm font-bold"
                                  >
                                    <PlayCircle size={16} />
                                    {/\.(jpe?g|png|gif|webp)/i.test(exercise.video_url) ? "Ver imagen" : "Ver video"}
                                  </button>
                                )}

                                <button
                                  onClick={() => startEditExercise(exercise)}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-bold"
                                >
                                  <Pencil size={16} />
                                  Editar
                                </button>

                                <button
                                  onClick={() => deleteExercise(exercise.id)}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-bold ${
                                    pendingDeleteExerciseId === exercise.id
                                      ? "bg-rose-500 text-white"
                                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                  }`}
                                >
                                  <Trash2 size={16} />
                                  {pendingDeleteExerciseId === exercise.id ? "¿Confirmar?" : "Eliminar"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-slate-400 dark:text-slate-500">
                          Esta rutina todavía no tiene ejercicios.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4">
                    <Dumbbell size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Seleccioná una rutina
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Elegí una rutina de la lista o creá una nueva para empezar a cargar ejercicios.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── LIBRARY TAB ───────────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: create form */}
          <div className="xl:col-span-1">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Nuevo ejercicio</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Agregá ejercicios a la biblioteca reutilizable.
                  </p>
                </div>
              </div>

              <Input
                placeholder="Nombre del ejercicio *"
                value={libName}
                onChange={(e) => setLibName(e.target.value)}
              />

              <textarea
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                rows={2}
                placeholder="Descripción (opcional)"
                value={libDescription}
                onChange={(e) => setLibDescription(e.target.value)}
              />

              <div className="relative">
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none pr-10 font-medium"
                  value={libMuscleGroup}
                  onChange={(e) => setLibMuscleGroup(e.target.value)}
                >
                  <option value="">Grupo muscular (opcional)</option>
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                placeholder="Link de video (YouTube, opcional)"
                value={libVideoUrl}
                onChange={(e) => setLibVideoUrl(e.target.value)}
              />

              <Button
                variant="secondary"
                fullWidth
                onClick={createLibraryExercise}
                disabled={isSavingLib || !libName.trim()}
              >
                {isSavingLib ? "Guardando..." : "Guardar en biblioteca"}
              </Button>
            </Card>
          </div>

          {/* Right: library list */}
          <div className="xl:col-span-2">
            {libraryExercises.length === 0 ? (
              <Card className="p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mb-4">
                  <BookOpen size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  La biblioteca está vacía
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Creá ejercicios para reutilizarlos en cualquier rutina.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {libraryExercises.map((ex) => (
                  <Card key={ex.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {ex.video_url && /\.(jpe?g|png|gif|webp)/i.test(ex.video_url) && (
                        <button
                          onClick={() =>
                            setVideoModal({ isOpen: true, exerciseName: ex.name, videoUrl: ex.video_url! })
                          }
                          className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={ex.video_url}
                            alt={ex.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {ex.name}
                        </p>
                        {ex.muscle_group && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                            {ex.muscle_group}
                          </span>
                        )}
                        {ex.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {ex.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {ex.video_url && (
                        <button
                          onClick={() =>
                            setVideoModal({
                              isOpen: true,
                              exerciseName: ex.name,
                              videoUrl: ex.video_url!,
                            })
                          }
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors text-sm font-bold"
                        >
                          <PlayCircle size={15} />
                          Ver imagen
                        </button>
                      )}
                      <button
                        onClick={() => deleteLibraryExercise(ex.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-bold ml-auto ${
                          pendingDeleteLibId === ex.id
                            ? "bg-rose-500 text-white"
                            : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                        }`}
                      >
                        <Trash2 size={15} />
                        {pendingDeleteLibId === ex.id ? "¿Confirmar?" : "Eliminar"}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENTS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Estado de rutinas</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Alumnos ordenados por antigüedad de rutina · 🟢 &lt;14d · 🟡 14–30d · 🔴 &gt;30d
              </p>
            </div>
            <button
              onClick={() => { setStudentsLoaded(false); loadStudentsWorkoutData(); }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Actualizar"
            >
              <CheckCircle2 size={16} />
            </button>
          </div>

          {isLoadingStudents ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
            </Card>
          ) : studentsWorkoutData.length === 0 ? (
            <Card className="p-8 text-center">
              <Users size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No hay alumnos activos.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {studentsWorkoutData.map((row) => {
                const freshness = getWorkoutFreshness(row.updated_at);
                return (
                  <Card key={row.id} className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Dot de antigüedad */}
                      <span className={`w-3 h-3 rounded-full shrink-0 ${freshness.dotClass}`} />

                      {/* Nombre + plan */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{row.name}</p>
                          {row.hasPendingRequest && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Bell size={9} />
                              Pide nueva rutina
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {row.plan_name ?? "Sin rutina asignada"}
                        </p>
                      </div>

                      {/* Badge de antigüedad + adherencia */}
                      <div className="shrink-0 text-right space-y-1">
                        {row.updated_at ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${freshness.bgClass} ${freshness.colorClass} ${freshness.borderClass}`}>
                            {freshness.level === 'outdated' && <AlertTriangle size={10} />}
                            {freshness.label}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                            Sin asignar
                          </span>
                        )}
                        {row.adherence && row.adherence.total > 0 && (
                          <div className="flex justify-end">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              row.adherence.percent >= 80
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : row.adherence.percent >= 50
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {row.adherence.percent}% adh.
                            </span>
                          </div>
                        )}
                        {row.hasPendingRequest && row.request && (
                          <button
                            onClick={() => handleResolveRequest(row.request.id, row.id)}
                            className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                          >
                            <CheckCircle2 size={10} />
                            Marcar atendida
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Video modal */}
      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, exerciseName: "", videoUrl: "" })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
}
