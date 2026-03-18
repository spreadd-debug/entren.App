import { useEffect, useMemo, useState } from "react";
import { StudentPortalService } from "../services/StudentPortalService";
import {
  Dumbbell,
  Image,
  Timer,
  CreditCard,
  LogOut,
  ChevronRight,
  Zap,
} from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";
import { useToast } from "../context/ToastContext";

interface StudentPortalViewProps {
  studentId: string;
  onLogout: () => void;
}

export default function StudentPortalView({
  studentId,
  onLogout,
}: StudentPortalViewProps) {
  const toast = useToast();
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
        toast.error("No se pudo cargar el portal del alumno");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [studentId]);

  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const quotaStatus = useMemo(() => {
    if (!data?.student) return null;
    const nextDueDate = data.student.next_due_date;
    if (!nextDueDate)
      return {
        label: "Sin vencimiento",
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-300",
        dot: "bg-slate-400",
      };
    const diffDays = Math.ceil(
      (new Date(nextDueDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0)
      return {
        label: "Cuota vencida",
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        dot: "bg-rose-500",
      };
    if (diffDays <= 3)
      return {
        label: "Vence pronto",
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        dot: "bg-amber-500",
      };
    return {
      label: "Al día",
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      dot: "bg-emerald-500",
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center animate-pulse">
            <Zap size={16} className="text-slate-950" />
          </div>
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">No se encontró el alumno.</p>
      </div>
    );
  }

  const studentName =
    data.student.name ??
    `${data.student.nombre ?? ""} ${data.student.apellido ?? ""}`.trim();

  const firstName = studentName.split(" ")[0];

  const timerDisplay =
    timer === null
      ? "00:00"
      : `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(
          timer % 60
        ).padStart(2, "0")}`;

  const isTimerActive = timer !== null && timer > 0;
  const isTimerWarning = timer !== null && timer <= 5 && timer > 0;
  const timerColor = isTimerWarning
    ? "text-rose-400"
    : isTimerActive
    ? "text-cyan-400"
    : "text-slate-600 dark:text-slate-600";

  const timerGlow = isTimerActive
    ? isTimerWarning
      ? "drop-shadow-[0_0_16px_rgba(251,113,133,0.5)]"
      : "drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
    : "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center shadow-sm shadow-cyan-500/30">
            <Zap size={13} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight tracking-tight">
              Hola, {firstName}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
              Tu portal de entrenamiento
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-xl text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <LogOut size={17} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* ── Quota status ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <CreditCard size={16} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Estado de cuota
              </p>
              <p className="text-sm text-slate-900 dark:text-white font-bold">
                {data.student.next_due_date
                  ? formatDate(data.student.next_due_date)
                  : "Sin fecha"}
              </p>
            </div>
          </div>
          {quotaStatus && (
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${quotaStatus.bg} ${quotaStatus.text}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${quotaStatus.dot}`}
              />
              {quotaStatus.label}
            </span>
          )}
        </div>

        {/* ── Workout plan ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Dumbbell size={16} className="text-cyan-500" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {data.workoutPlan?.name || "Sin rutina asignada"}
              </h2>
              {data.workoutPlan?.description && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {data.workoutPlan.description}
                </p>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.exercises.length > 0 ? (
              data.exercises.map((exercise: any, index: number) => (
                <div
                  key={exercise.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-black text-slate-300 dark:text-slate-700 w-5 shrink-0 text-center">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {exercise.exercise_name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {[
                          exercise.sets && `${exercise.sets} series`,
                          exercise.reps && `${exercise.reps} reps`,
                          exercise.weight,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin datos"}
                      </p>
                    </div>
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
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                      {...(index === 0 ? { 'data-tour': 'exercise-photo-btn' } : {})}
                    >
                      <Image size={13} />
                      Ejemplo
                    </button>
                  ) : (
                    <ChevronRight
                      size={16}
                      className="text-slate-200 dark:text-slate-700 shrink-0"
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-600">
                No hay ejercicios cargados.
              </p>
            )}
          </div>
        </div>

        {/* ── Rest Timer ───────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Timer size={16} className="text-cyan-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Descanso
            </h2>
          </div>

          {/* Timer display */}
          <div className="text-center py-2">
            <p
              className={`text-6xl font-black tabular-nums tracking-tight ${timerColor} ${timerGlow} transition-all`}
            >
              {timerDisplay}
            </p>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 90, 120].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setTimer(seconds)}
                className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  timer === seconds && isTimerActive
                    ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={() => setTimer(null)}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
          >
            Resetear
          </button>
        </div>

        <div className="h-4" />
      </div>

      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() =>
          setVideoModal({ isOpen: false, exerciseName: "", videoUrl: "" })
        }
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
}
