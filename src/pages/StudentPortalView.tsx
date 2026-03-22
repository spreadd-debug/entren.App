import { useEffect, useMemo, useState } from "react";
import { StudentPortalService } from "../services/StudentPortalService";
import { WorkoutPlanService } from "../services/WorkoutPlanService";
import { WorkoutSessionService } from "../services/WorkoutSessionService";
import { WorkoutRequestService } from "../services/WorkoutRequestService";
import { getWorkoutFreshness } from "../config/workoutConfig";
import {
  Dumbbell,
  Image,
  Timer,
  CreditCard,
  LogOut,
  ChevronRight,
  Zap,
  CheckCircle2,
  Circle,
  Bell,
  AlertTriangle,
  Play,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";
import { useToast } from "../context/ToastContext";
import { WorkoutOption, WorkoutSession, WorkoutSessionExercise, WorkoutUpdateRequest } from "../../shared/types";

interface StudentPortalViewProps {
  studentId: string;
  onLogout: () => void;
}

export default function StudentPortalView({
  studentId,
  onLogout,
}: StudentPortalViewProps) {
  const toast = useToast();

  // ─── Estado principal ──────────────────────────────────────────────────────
  const [student, setStudent] = useState<any>(null);
  const [options, setOptions] = useState<WorkoutOption[]>([]);
  const [pendingRequest, setPendingRequest] = useState<WorkoutUpdateRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Sesión del día ────────────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionItems, setSessionItems] = useState<WorkoutSessionExercise[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);

  // ─── Solicitud de rutina ───────────────────────────────────────────────────
  const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);

  // ─── Timer de descanso ─────────────────────────────────────────────────────
  const [timer, setTimer] = useState<number | null>(null);

  // ─── Modal de video ────────────────────────────────────────────────────────
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    videoUrl: string;
  }>({ isOpen: false, exerciseName: "", videoUrl: "" });

  // ─── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await StudentPortalService.getFullPortalData(studentId);
        setStudent(data.student);
        setOptions(data.options);
        setPendingRequest(data.pendingRequest);
        if (data.todaySession) {
          setActiveSession(data.todaySession.session);
          setSessionItems(data.todaySession.items);
        }
        // Pre-seleccionar la primera opción disponible
        if (data.options.length > 0) {
          setSelectedOptionId(data.options[0].id);
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar el portal del alumno");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [studentId]);

  // ─── Timer tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // ─── Derivados ────────────────────────────────────────────────────────────

  const studentName =
    student?.name ??
    `${student?.nombre ?? ""} ${student?.apellido ?? ""}`.trim();
  const firstName = studentName.split(" ")[0];

  const quotaStatus = useMemo(() => {
    if (!student) return null;
    const nextDueDate = student.next_due_date;
    if (!nextDueDate)
      return { label: "Sin vencimiento", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" };
    const diffDays = Math.ceil(
      (new Date(nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0)
      return { label: "Cuota vencida", bg: "bg-rose-500/10", text: "text-rose-500", dot: "bg-rose-500" };
    if (diffDays <= 3)
      return { label: "Vence pronto", bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500" };
    return { label: "Al día", bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" };
  }, [student]);

  /** La opción actualmente seleccionada (para iniciar sesión) */
  const selectedOption = options.find((o) => o.id === selectedOptionId) ?? options[0] ?? null;

  /** Antigüedad de la rutina más reciente del alumno */
  const routineFreshness = useMemo(() => {
    if (options.length === 0) return null;
    const mostRecent = options[0]; // ya vienen ordenadas desc por updated_at
    return getWorkoutFreshness(mostRecent.updated_at);
  }, [options]);

  const completedCount = sessionItems.filter((i) => i.completed).length;
  const totalCount = sessionItems.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const sessionAlreadyCompleted = !!activeSession?.completed_at;

  const timerDisplay =
    timer === null
      ? "00:00"
      : `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`;
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

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStartSession = async () => {
    if (!selectedOption) return;
    try {
      setIsStartingSession(true);
      const exercises = await WorkoutPlanService.getExercises(selectedOption.workout_plan_id);
      const result = await WorkoutSessionService.startSession(
        student.gym_id,
        studentId,
        selectedOption.workout_plan_id,
        exercises,
      );
      setActiveSession(result.session);
      setSessionItems(result.items);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo iniciar el entrenamiento");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleToggleExercise = async (item: WorkoutSessionExercise) => {
    if (sessionAlreadyCompleted) return;
    const newCompleted = !item.completed;
    // Optimistic update
    setSessionItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completed: newCompleted } : i))
    );
    try {
      await WorkoutSessionService.toggleExercise(item.id, newCompleted);
    } catch (error) {
      // Revert
      setSessionItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completed: !newCompleted } : i))
      );
      toast.error("No se pudo actualizar el ejercicio");
    }
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    try {
      setIsCompletingSession(true);
      await WorkoutSessionService.completeSession(activeSession.id);
      setActiveSession((prev) => prev ? { ...prev, completed_at: new Date().toISOString() } : prev);
      toast.success("¡Entrenamiento completado! Excelente trabajo 💪");
    } catch (error) {
      toast.error("No se pudo registrar la sesión");
    } finally {
      setIsCompletingSession(false);
    }
  };

  const handleRequestUpdate = async () => {
    if (!student) return;
    try {
      setIsRequestingUpdate(true);
      await WorkoutRequestService.createRequest(student.gym_id, studentId);
      // Refresh pending request
      const req = await WorkoutRequestService.getOpenRequest(studentId);
      setPendingRequest(req);
      toast.success("Solicitud enviada al profesor");
    } catch (error) {
      toast.error("No se pudo enviar la solicitud");
    } finally {
      setIsRequestingUpdate(false);
    }
  };

  // ─── Loading / error ──────────────────────────────────────────────────────

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

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">No se encontró el alumno.</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Header ───────────────────────────────────────────────────────── */}
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

        {/* ── Estado de cuota ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <CreditCard size={16} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Estado de cuota</p>
              <p className="text-sm text-slate-900 dark:text-white font-bold">
                {student.next_due_date ? formatDate(student.next_due_date) : "Sin fecha"}
              </p>
            </div>
          </div>
          {quotaStatus && (
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${quotaStatus.bg} ${quotaStatus.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${quotaStatus.dot}`} />
              {quotaStatus.label}
            </span>
          )}
        </div>

        {/* ── Banner de rutina desactualizada ──────────────────────────── */}
        {routineFreshness && (routineFreshness.level === 'stale' || routineFreshness.level === 'outdated') && (
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${routineFreshness.bgClass} ${routineFreshness.borderClass}`}>
            <AlertTriangle size={16} className={`${routineFreshness.colorClass} shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${routineFreshness.colorClass}`}>
                {routineFreshness.level === 'outdated'
                  ? 'Tu rutina necesita actualización'
                  : 'Tu rutina empieza a quedar vieja'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fue asignada hace {routineFreshness.daysOld} días. Podés pedir una nueva al profesor.
              </p>
            </div>
          </div>
        )}

        {/* ── Entrenamiento del día ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Cabecera */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Dumbbell size={16} className="text-cyan-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Entrenamiento de hoy
              </h2>
              {activeSession && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {sessionAlreadyCompleted
                    ? "Sesión completada ✓"
                    : `${completedCount} de ${totalCount} ejercicios`}
                </p>
              )}
            </div>
            {activeSession && totalCount > 0 && (
              <div className="shrink-0">
                <div className="relative w-9 h-9">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-800" />
                    <circle
                      cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${(completedCount / totalCount) * 94.2} 94.2`}
                      className="text-cyan-500 transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Contenido: sin opciones */}
          {options.length === 0 && (
            <div className="px-4 py-10 text-center space-y-2">
              <Dumbbell size={28} className="text-slate-200 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Sin rutina asignada</p>
              <p className="text-xs text-slate-400 dark:text-slate-600">Tu profesor aún no asignó ninguna rutina.</p>
            </div>
          )}

          {/* Contenido: sesión NO iniciada → selector de rutina */}
          {options.length > 0 && !activeSession && (
            <div className="px-4 py-4 space-y-3">
              {/* Opciones disponibles */}
              {options.length === 1 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Rutina disponible</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{options[0].plan_name}</p>
                  {options[0].plan_description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{options[0].plan_description}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Elegí tu rutina de hoy
                  </p>
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        selectedOptionId === option.id
                          ? "bg-cyan-500/10 border-cyan-500/40 dark:border-cyan-500/40"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedOptionId === option.id
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-slate-300 dark:border-slate-600"
                        }`}>
                          {selectedOptionId === option.id && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{option.plan_name}</p>
                          {option.plan_description && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{option.plan_description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleStartSession}
                disabled={isStartingSession || !selectedOption}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm shadow-sm shadow-cyan-500/30 hover:bg-cyan-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={15} strokeWidth={3} />
                {isStartingSession ? "Iniciando..." : "Empezar entrenamiento"}
              </button>
            </div>
          )}

          {/* Contenido: sesión activa → checklist */}
          {activeSession && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessionItems.length > 0 ? (
                sessionItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleExercise(item)}
                    disabled={sessionAlreadyCompleted}
                    className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                      sessionAlreadyCompleted
                        ? "cursor-default"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800"
                    }`}
                  >
                    {/* Checkbox circular */}
                    <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {item.completed && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                    </div>

                    {/* Info del ejercicio */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate transition-colors ${
                        item.completed
                          ? "text-slate-400 dark:text-slate-500 line-through"
                          : "text-slate-900 dark:text-white"
                      }`}>
                        {item.exercise_name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {[
                          item.sets && `${item.sets} series`,
                          item.reps && `${item.reps} reps`,
                          item.weight,
                        ].filter(Boolean).join(" · ") || "Sin datos"}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-600 italic mt-0.5">{item.notes}</p>
                      )}
                    </div>

                    {/* Botón de video */}
                    {item.video_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoModal({ isOpen: true, exerciseName: item.exercise_name, videoUrl: item.video_url! });
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                      >
                        <Image size={13} />
                        Ejemplo
                      </button>
                    )}
                    {!item.video_url && (
                      <ChevronRight size={16} className="text-slate-200 dark:text-slate-700 shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-600">
                  No hay ejercicios cargados.
                </p>
              )}
            </div>
          )}

          {/* Botón finalizar sesión */}
          {activeSession && !sessionAlreadyCompleted && totalCount > 0 && (
            <div className="px-4 pb-4 pt-2">
              <button
                onClick={handleCompleteSession}
                disabled={isCompletingSession || !allCompleted}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] ${
                  allCompleted
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                }`}
              >
                <Trophy size={15} strokeWidth={2.5} />
                {isCompletingSession
                  ? "Guardando..."
                  : allCompleted
                  ? "Finalizar entrenamiento"
                  : `Completá los ${totalCount - completedCount} ejercicios restantes`}
              </button>
            </div>
          )}

          {/* Sesión ya completada */}
          {sessionAlreadyCompleted && (
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                <Trophy size={15} />
                ¡Entrenamiento de hoy completado!
              </div>
            </div>
          )}
        </div>

        {/* ── Solicitar nueva rutina ────────────────────────────────────── */}
        {options.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            {pendingRequest ? (
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
                  <Bell size={16} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Solicitud enviada</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Le avisaste al profesor que querés una nueva rutina.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Pendiente
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                  <RefreshCw size={16} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">¿Querés rutina nueva?</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Avisale al profesor para que te actualice la rutina.</p>
                </div>
                <button
                  onClick={handleRequestUpdate}
                  disabled={isRequestingUpdate}
                  className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {isRequestingUpdate ? "..." : "Pedir"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Timer de descanso ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Timer size={16} className="text-cyan-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Descanso</h2>
          </div>

          <div className="text-center py-2">
            <p className={`text-6xl font-black tabular-nums tracking-tight ${timerColor} ${timerGlow} transition-all`}>
              {timerDisplay}
            </p>
          </div>

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
        onClose={() => setVideoModal({ isOpen: false, exerciseName: "", videoUrl: "" })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
}
