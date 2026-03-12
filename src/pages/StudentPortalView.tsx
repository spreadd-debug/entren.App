import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "../components/UI";
import { StudentPortalService } from "../services/StudentPortalService";
import { Dumbbell, PlayCircle, Clock3, CreditCard, LogOut } from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";

interface StudentPortalViewProps {
  studentId: string;
  onLogout: () => void;
}

export default function StudentPortalView({
  studentId,
  onLogout,
}: StudentPortalViewProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState<number | null>(null);
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    videoUrl: string;
  }>({ isOpen: false, exerciseName: "", videoUrl: "" });

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const portalData = await StudentPortalService.getPortalData(studentId);
        setData(portalData);
      } catch (error) {
        console.error(error);
        alert("No se pudo cargar el portal del alumno");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [studentId]);

  useEffect(() => {
    if (timer === null) return;
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const quotaStatus = useMemo(() => {
    if (!data?.student) return null;

    const nextDueDate = data.student.next_due_date;
    if (!nextDueDate) return { label: "Sin vencimiento", color: "bg-slate-100 text-slate-600" };

    const today = new Date();
    const due = new Date(nextDueDate);

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Cuota vencida", color: "bg-rose-100 text-rose-700" };
    }

    if (diffDays <= 3) {
      return { label: "Vence pronto", color: "bg-amber-100 text-amber-700" };
    }

    return { label: "Al día", color: "bg-emerald-100 text-emerald-700" };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">No se encontró el alumno.</p>
      </div>
    );
  }

  const studentName =
    data.student.name ??
    `${data.student.nombre ?? ""} ${data.student.apellido ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hola, {studentName}</h1>
            <p className="text-slate-500">Acá tenés tu rutina y el estado de tu cuenta.</p>
          </div>

          <Button variant="outline" onClick={onLogout}>
            <LogOut size={16} />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <CreditCard size={18} />
              </div>
              <h3 className="font-bold text-slate-900">Estado de cuota</h3>
            </div>

            <div className={`inline-flex px-3 py-1.5 rounded-xl text-sm font-bold ${quotaStatus?.color}`}>
              {quotaStatus?.label}
            </div>

            <p className="text-sm text-slate-500">
              Próximo vencimiento:{" "}
              <span className="font-bold text-slate-900">
                {data.student.next_due_date
                  ? formatDate(data.student.next_due_date)
                  : "-"}
              </span>
            </p>
          </Card>

          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Dumbbell size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  {data.workoutPlan?.name || "Sin rutina asignada"}
                </h3>
                <p className="text-sm text-slate-500">
                  {data.workoutPlan?.description || "Todavía no tenés una rutina cargada."}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {data.exercises.length > 0 ? (
                data.exercises.map((exercise: any, index: number) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 bg-white"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {index + 1}. {exercise.exercise_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {exercise.sets || "-"} series · {exercise.reps || "-"} reps · {exercise.weight || "-"}
                      </p>
                    </div>

                    {exercise.video_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVideoModal({
                            isOpen: true,
                            exerciseName: exercise.exercise_name,
                            videoUrl: exercise.video_url,
                          })
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-bold"
                      >
                        <PlayCircle size={16} />
                        Ver video
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm">No hay ejercicios cargados.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Clock3 size={18} />
            </div>
            <h3 className="font-bold text-slate-900">Cronómetro de descanso</h3>
          </div>

          <div className="text-4xl font-black text-slate-900">
            {timer === null ? "00:00" : `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`}
          </div>

          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 120].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setTimer(seconds)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm"
              >
                {seconds}s
              </button>
            ))}

            <button
              onClick={() => setTimer(null)}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-sm"
            >
              Reset
            </button>
          </div>
        </Card>
      </div>

      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, exerciseName: "", videoUrl: "" })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
}