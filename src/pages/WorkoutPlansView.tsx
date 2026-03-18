import { useEffect, useState } from "react";
import {
  Dumbbell,
  Plus,
  ListOrdered,
  PlayCircle,
  Trash2,
  Pencil,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Card, Button, Input } from "../components/UI";
import { WorkoutPlanService, LibraryExercise } from "../services/WorkoutPlanService";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";

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

type Tab = "plans" | "library";

export default function WorkoutPlansView({ gymId }: { gymId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("plans");

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
    if (!window.confirm("¿Querés eliminar esta rutina?")) return;
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
    if (!selectedPlan || !window.confirm("¿Querés eliminar este ejercicio?")) return;
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
    if (!window.confirm("¿Querés eliminar este ejercicio de la biblioteca?")) return;
    await WorkoutPlanService.deleteLibraryExercise(id);
    await loadLibrary();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("plans")}
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
          onClick={() => setActiveTab("library")}
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
      </div>

      {/* ── PLANS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "plans" && (
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
                              isSelected
                                ? "bg-white/10 text-white hover:bg-white/20"
                                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            }`}
                          >
                            <Trash2 size={15} />
                            Eliminar
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

                    {/* Library picker — step 1: muscle group */}
                    {libraryExercises.length > 0 && (
                      <div className="space-y-2">
                        <div className="relative">
                          <ChevronDown
                            size={16}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                          <select
                            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none pr-10 font-medium"
                            value={filterMuscleGroup}
                            onChange={(e) => {
                              setFilterMuscleGroup(e.target.value);
                              setSelectedLibraryId("");
                              setExerciseName("");
                              setVideoUrl("");
                            }}
                          >
                            <option value="">1. Elegir grupo muscular</option>
                            {MUSCLE_GROUPS.filter((g) =>
                              libraryExercises.some((ex) => ex.muscle_group === g)
                            ).map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Step 2: exercise filtered by group */}
                        {filterMuscleGroup && (
                          <div className="relative">
                            <ChevronDown
                              size={16}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <select
                              className="w-full px-4 h-12 rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-white appearance-none pr-10 font-medium"
                              value={selectedLibraryId}
                              onChange={(e) => handleLibrarySelect(e.target.value)}
                            >
                              <option value="">2. Elegir ejercicio</option>
                              {libraryExercises
                                .filter((ex) => ex.muscle_group === filterMuscleGroup)
                                .map((ex) => (
                                  <option key={ex.id} value={ex.id}>
                                    {ex.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </div>
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
                              {/* Edit library picker — step 1: muscle group */}
                              {libraryExercises.length > 0 && (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <ChevronDown
                                      size={16}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <select
                                      className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none pr-10 font-medium"
                                      value={editFilterMuscleGroup}
                                      onChange={(e) => {
                                        setEditFilterMuscleGroup(e.target.value);
                                        setEditLibraryId("");
                                        setEditExerciseName("");
                                        setEditVideoUrl("");
                                      }}
                                    >
                                      <option value="">1. Elegir grupo muscular</option>
                                      {MUSCLE_GROUPS.filter((g) =>
                                        libraryExercises.some((ex) => ex.muscle_group === g)
                                      ).map((g) => (
                                        <option key={g} value={g}>
                                          {g}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {editFilterMuscleGroup && (
                                    <div className="relative">
                                      <ChevronDown
                                        size={16}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                      />
                                      <select
                                        className="w-full px-4 h-12 rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-white appearance-none pr-10 font-medium"
                                        value={editLibraryId}
                                        onChange={(e) => handleEditLibrarySelect(e.target.value)}
                                      >
                                        <option value="">2. Elegir ejercicio</option>
                                        {libraryExercises
                                          .filter((ex) => ex.muscle_group === editFilterMuscleGroup)
                                          .map((ex) => (
                                            <option key={ex.id} value={ex.id}>
                                              {ex.name}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
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
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors text-sm font-bold"
                                >
                                  <Trash2 size={16} />
                                  Eliminar
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
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors text-sm font-bold ml-auto"
                      >
                        <Trash2 size={15} />
                        Eliminar
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
