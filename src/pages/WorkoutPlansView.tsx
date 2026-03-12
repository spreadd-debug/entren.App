import { useEffect, useState } from "react";
import { Dumbbell, Plus, ListOrdered, PlayCircle, Trash2, Pencil } from "lucide-react";
import { Card, Button, Input } from "../components/UI";
import { WorkoutPlanService } from "../services/WorkoutPlanService";

const gymId = "11111111-1111-1111-1111-111111111111";

export default function WorkoutPlansView() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanDescription, setEditPlanDescription] = useState("");

  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  const loadPlans = async () => {
    const data = await WorkoutPlanService.getPlans(gymId);
    const safeData = Array.isArray(data) ? data : [];
    setPlans(safeData);

    if (selectedPlan) {
      const updatedSelected = safeData.find((p) => p.id === selectedPlan.id) || null;
      setSelectedPlan(updatedSelected);
    }
  };

  const loadExercises = async (planId: string) => {
    const data = await WorkoutPlanService.getExercises(planId);
    setExercises(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const createPlan = async () => {
    if (!planName.trim()) return;

    const plan = await WorkoutPlanService.createPlan(
      gymId,
      planName.trim(),
      planDescription.trim()
    );

    setPlanName("");
    setPlanDescription("");

    await loadPlans();
    setSelectedPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanDescription(plan.description || "");
    await loadExercises(plan.id);
  };

  const deletePlan = async (planId: string) => {
    const confirmed = window.confirm("¿Querés eliminar esta rutina?");
    if (!confirmed) return;

    await WorkoutPlanService.deletePlan(planId);

    if (selectedPlan?.id === planId) {
      setSelectedPlan(null);
      setExercises([]);
      setIsEditingPlan(false);
    }

    await loadPlans();
  };

  const startEditPlan = () => {
    if (!selectedPlan) return;
    setEditPlanName(selectedPlan.name || "");
    setEditPlanDescription(selectedPlan.description || "");
    setIsEditingPlan(true);
  };

  const savePlan = async () => {
    if (!selectedPlan) return;
    if (!editPlanName.trim()) return;

    const updated = await WorkoutPlanService.updatePlan(selectedPlan.id, {
      name: editPlanName.trim(),
      description: editPlanDescription.trim() || null,
    });

    setSelectedPlan(updated);
    setIsEditingPlan(false);
    await loadPlans();
  };

  const addExercise = async () => {
    if (!selectedPlan) return;
    if (!exerciseName.trim()) return;

    await WorkoutPlanService.addExercise(selectedPlan.id, {
      exerciseName: exerciseName.trim(),
      exerciseOrder: exercises.length + 1,
      sets: sets ? Number(sets) : null,
      reps: reps || null,
      weight: weight || null,
      restSeconds: null,
      notes: null,
      videoUrl: videoUrl.trim() || null,
    });

    setExerciseName("");
    setSets("");
    setReps("");
    setWeight("");
    setVideoUrl("");

    await loadExercises(selectedPlan.id);
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!selectedPlan) return;

    const confirmed = window.confirm("¿Querés eliminar este ejercicio?");
    if (!confirmed) return;

    await WorkoutPlanService.deleteExercise(exerciseId);
    await loadExercises(selectedPlan.id);
  };

  const startEditExercise = (exercise: any) => {
    setEditingExerciseId(exercise.id);
    setEditExerciseName(exercise.exercise_name || "");
    setEditSets(exercise.sets != null ? String(exercise.sets) : "");
    setEditReps(exercise.reps || "");
    setEditWeight(exercise.weight || "");
    setEditVideoUrl(exercise.video_url || "");
  };

  const cancelEditExercise = () => {
    setEditingExerciseId(null);
    setEditExerciseName("");
    setEditSets("");
    setEditReps("");
    setEditWeight("");
    setEditVideoUrl("");
  };

  const saveExercise = async () => {
    if (!editingExerciseId) return;
    if (!editExerciseName.trim()) return;
    if (!selectedPlan) return;

    await WorkoutPlanService.updateExercise(editingExerciseId, {
      exerciseName: editExerciseName.trim(),
      sets: editSets ? Number(editSets) : null,
      reps: editReps.trim() || null,
      weight: editWeight.trim() || null,
      videoUrl: editVideoUrl.trim() || null,
    });

    cancelEditExercise();
    await loadExercises(selectedPlan.id);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Nueva rutina</h3>
                <p className="text-sm text-slate-500">Creá una rutina base para tus alumnos.</p>
              </div>
            </div>

            <Input
              placeholder="Nombre de la rutina"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />

            <textarea
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none"
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
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <ListOrdered size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Rutinas creadas</h3>
                <p className="text-sm text-slate-500">{plans.length} cargadas</p>
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
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
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
                            <p className={`text-sm ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                              {plan.description || "Sin descripción"}
                            </p>
                          </div>

                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
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
                <p className="text-sm text-slate-400 text-center py-6">
                  Todavía no hay rutinas creadas.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="p-5 space-y-5 min-h-[500px]">
            {selectedPlan ? (
              <>
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
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none"
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
                        <h3 className="text-xl font-bold text-slate-900">{selectedPlan.name}</h3>
                        <p className="text-sm text-slate-500">
                          {selectedPlan.description || "Sin descripción"}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">
                      {exercises.length} ejercicios
                    </div>

                    {!isEditingPlan && (
                      <button
                        onClick={startEditPlan}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-bold"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Ejercicio"
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

                <div className="space-y-3">
                  {exercises.length > 0 ? (
                    exercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white"
                      >
                        {editingExerciseId === exercise.id ? (
                          <div className="space-y-3">
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
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                {index + 1}
                              </div>

                              <div>
                                <p className="font-bold text-slate-900">{exercise.exercise_name}</p>
                                <p className="text-sm text-slate-500">
                                  {exercise.sets || "-"} series · {exercise.reps || "-"} reps · {exercise.weight || "-"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {exercise.video_url && (
                                <a
                                  href={exercise.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-bold"
                                >
                                  <PlayCircle size={16} />
                                  Ver video
                                </a>
                              )}

                              <button
                                onClick={() => startEditExercise(exercise)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-bold"
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
                      <p className="text-slate-400">Esta rutina todavía no tiene ejercicios.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                  <Dumbbell size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Seleccioná una rutina</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Elegí una rutina de la lista o creá una nueva para empezar a cargar ejercicios.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}