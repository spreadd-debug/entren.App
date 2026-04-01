import { useEffect, useMemo, useState } from "react";
import { StudentPortalService } from "../services/StudentPortalService";
import { WorkoutPlanService } from "../services/WorkoutPlanService";
import { WorkoutSessionService } from "../services/WorkoutSessionService";
import { WorkoutRequestService } from "../services/WorkoutRequestService";
import { NotificationService } from "../services/NotificationService";
import { AnthropometryService } from "../services/pt/AnthropometryService";
import { MeasurementsService } from "../services/pt/MeasurementsService";
import { GoalsService } from "../services/pt/GoalsService";
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
  History,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Target,
  Ruler,
  Activity,
} from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";
import { useToast } from "../context/ToastContext";
import { WorkoutOption, WorkoutSession, WorkoutSessionExercise, WorkoutUpdateRequest, ClientAnthropometry, ClientMeasurement, ClientGoal } from "../../shared/types";

// Nombres de días en español (0=Dom, 1=Lun, ..., 6=Sáb)
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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

  // ─── Historial ────────────────────────────────────────────────────────────
  const [recentSessions, setRecentSessions] = useState<Array<{
    id: string;
    session_date: string;
    completed_at: string | null;
    plan_name: string;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ─── Progreso PT ───────────────────────────────────────────────────────────
  const [anthropometry, setAnthropometry] = useState<ClientAnthropometry[]>([]);
  const [measurements, setMeasurements] = useState<ClientMeasurement[]>([]);
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [showProgress, setShowProgress] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(false);

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
        const [data, history] = await Promise.all([
          StudentPortalService.getFullPortalData(studentId),
          WorkoutSessionService.getRecentSessionsWithDetails(studentId, 7),
        ]);

        setStudent(data.student);
        setOptions(data.options);
        setPendingRequest(data.pendingRequest);
        setRecentSessions(history);

        if (data.todaySession) {
          setActiveSession(data.todaySession.session);
          setSessionItems(data.todaySession.items);
        }

        // Cargar datos de progreso para PT
        if (data.student?.gym_type === 'personal_trainer') {
          const [anthroData, measData, goalsData] = await Promise.all([
            AnthropometryService.getByStudent(studentId),
            MeasurementsService.getByStudent(studentId),
            GoalsService.getByStudent(studentId),
          ]);
          setAnthropometry(anthroData);
          setMeasurements(measData);
          setGoals(goalsData);
        }

        // Auto-seleccionar según el día de la semana actual
        const todayDay = new Date().getDay(); // 0=Dom, 1=Lun...
        const todayOption = data.options.find(
          (o) => o.days_of_week && o.days_of_week.includes(todayDay)
        );
        if (todayOption) {
          setSelectedOptionId(todayOption.id);
        } else if (data.options.length > 0) {
          setSelectedOptionId(data.options[0].id);
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar el portal del alumno");
        // Student likely deleted — force back to login
        onLogout();
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

  const isPT = student?.gym_type === 'personal_trainer';

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
      // Actualizar historial
      const history = await WorkoutSessionService.getRecentSessionsWithDetails(studentId, 7);
      setRecentSessions(history);
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
      toast.success(isPT ? "Solicitud enviada a tu entrenador" : "Solicitud enviada al profesor");
      // Notificación WhatsApp al profe (best-effort)
      NotificationService.notifyWorkoutRequest(student.gym_id, studentName);
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

        {/* ── Estado de cuota (solo gym, no PT) ────────────────────────── */}
        {!isPT && (
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
        )}

        {/* ── Mi Progreso (solo PT) ─────────────────────────────────── */}
        {isPT && anthropometry.length > 0 && (() => {
          const latest = anthropometry[0];
          const previous = anthropometry.length > 1 ? anthropometry[1] : null;
          const weightDiff = previous?.weight_kg && latest.weight_kg
            ? Math.round((latest.weight_kg - previous.weight_kg) * 10) / 10
            : null;
          const fatDiff = previous?.body_fat_pct && latest.body_fat_pct
            ? Math.round((latest.body_fat_pct - previous.body_fat_pct) * 10) / 10
            : null;
          const muscleDiff = previous?.muscle_mass_kg && latest.muscle_mass_kg
            ? Math.round((latest.muscle_mass_kg - previous.muscle_mass_kg) * 10) / 10
            : null;

          // Datos para el gráfico de peso (últimos 10, orden cronológico)
          const chartData = anthropometry
            .filter((a) => a.weight_kg !== null)
            .slice(0, 10)
            .reverse();
          const weights = chartData.map((a) => a.weight_kg!);
          const minW = Math.min(...weights) - 1;
          const maxW = Math.max(...weights) + 1;
          const range = maxW - minW || 1;

          return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowProgress((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                  <Activity size={16} className="text-emerald-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-slate-900 dark:text-white">Mi Progreso</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {anthropometry.length} medición{anthropometry.length !== 1 ? "es" : ""} registrada{anthropometry.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-slate-300 dark:text-slate-600 transition-transform ${showProgress ? "rotate-90" : ""}`}
                />
              </button>

              {showProgress && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-4">

                  {/* Tarjetas resumen */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Peso */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                      <Scale size={14} className="text-cyan-500 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {latest.weight_kg ?? "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">kg</p>
                      {weightDiff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${
                          weightDiff < 0 ? "text-emerald-500" : weightDiff > 0 ? "text-rose-500" : "text-slate-400"
                        }`}>
                          {weightDiff < 0 ? <TrendingDown size={10} /> : weightDiff > 0 ? <TrendingUp size={10} /> : <Minus size={10} />}
                          {weightDiff > 0 ? "+" : ""}{weightDiff} kg
                        </div>
                      )}
                    </div>

                    {/* Grasa corporal */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                      <Target size={14} className="text-amber-500 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {latest.body_fat_pct ?? "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">% grasa</p>
                      {fatDiff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${
                          fatDiff < 0 ? "text-emerald-500" : fatDiff > 0 ? "text-rose-500" : "text-slate-400"
                        }`}>
                          {fatDiff < 0 ? <TrendingDown size={10} /> : fatDiff > 0 ? <TrendingUp size={10} /> : <Minus size={10} />}
                          {fatDiff > 0 ? "+" : ""}{fatDiff}%
                        </div>
                      )}
                    </div>

                    {/* Masa muscular */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                      <Dumbbell size={14} className="text-violet-500 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {latest.muscle_mass_kg ?? "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">kg músculo</p>
                      {muscleDiff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${
                          muscleDiff > 0 ? "text-emerald-500" : muscleDiff < 0 ? "text-rose-500" : "text-slate-400"
                        }`}>
                          {muscleDiff > 0 ? <TrendingUp size={10} /> : muscleDiff < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                          {muscleDiff > 0 ? "+" : ""}{muscleDiff} kg
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BMI badge */}
                  {latest.bmi && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500">IMC:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        latest.bmi < 18.5 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        latest.bmi < 25 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        latest.bmi < 30 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}>
                        {latest.bmi}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">
                        {latest.bmi < 18.5 ? "Bajo peso" : latest.bmi < 25 ? "Normal" : latest.bmi < 30 ? "Sobrepeso" : "Obesidad"}
                      </span>
                    </div>
                  )}

                  {/* Gráfico de peso */}
                  {chartData.length >= 2 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Evolución de peso
                      </p>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <svg viewBox="0 0 300 120" className="w-full h-auto">
                          {/* Líneas de referencia */}
                          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                            <line
                              key={pct}
                              x1="30" y1={10 + (1 - pct) * 90}
                              x2="290" y2={10 + (1 - pct) * 90}
                              stroke="currentColor"
                              strokeWidth="0.5"
                              className="text-slate-200 dark:text-slate-700"
                            />
                          ))}
                          {/* Labels Y */}
                          {[0, 0.5, 1].map((pct) => (
                            <text
                              key={pct}
                              x="27" y={10 + (1 - pct) * 90 + 3}
                              textAnchor="end"
                              className="fill-slate-400 dark:fill-slate-500"
                              fontSize="8"
                            >
                              {Math.round(minW + pct * range)}
                            </text>
                          ))}
                          {/* Área */}
                          <path
                            d={`M${chartData.map((_, i) => {
                              const x = 30 + (i / (chartData.length - 1)) * 260;
                              const y = 10 + (1 - (weights[i] - minW) / range) * 90;
                              return `${x},${y}`;
                            }).join(" L")} L${30 + 260},100 L30,100 Z`}
                            className="fill-cyan-500/10"
                          />
                          {/* Línea */}
                          <polyline
                            points={chartData.map((_, i) => {
                              const x = 30 + (i / (chartData.length - 1)) * 260;
                              const y = 10 + (1 - (weights[i] - minW) / range) * 90;
                              return `${x},${y}`;
                            }).join(" ")}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-cyan-500"
                          />
                          {/* Puntos */}
                          {chartData.map((entry, i) => {
                            const x = 30 + (i / (chartData.length - 1)) * 260;
                            const y = 10 + (1 - (weights[i] - minW) / range) * 90;
                            return (
                              <g key={entry.id}>
                                <circle cx={x} cy={y} r="3.5" className="fill-cyan-500" />
                                <circle cx={x} cy={y} r="2" className="fill-white dark:fill-slate-800" />
                                {/* Label en el último y primero */}
                                {(i === 0 || i === chartData.length - 1) && (
                                  <text
                                    x={x} y={y - 8}
                                    textAnchor="middle"
                                    className="fill-slate-600 dark:fill-slate-300"
                                    fontSize="8"
                                    fontWeight="bold"
                                  >
                                    {weights[i]}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                          {/* Labels X (fecha) */}
                          {chartData.map((entry, i) => {
                            if (chartData.length > 5 && i % 2 !== 0 && i !== chartData.length - 1) return null;
                            const x = 30 + (i / (chartData.length - 1)) * 260;
                            const d = new Date(entry.measured_at + "T12:00:00");
                            return (
                              <text
                                key={entry.id + "_label"}
                                x={x} y={112}
                                textAnchor="middle"
                                className="fill-slate-400 dark:fill-slate-500"
                                fontSize="7"
                              >
                                {d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                              </text>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Última medición */}
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center">
                    Última medición: {new Date(latest.measured_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Medidas corporales (solo PT) ────────────────────────────── */}
        {isPT && measurements.length > 0 && (() => {
          const latest = measurements[0];
          const previous = measurements.length > 1 ? measurements[1] : null;

          const measureFields: { key: keyof ClientMeasurement; label: string }[] = [
            { key: "chest_cm", label: "Pecho" },
            { key: "shoulders_cm", label: "Hombros" },
            { key: "waist_cm", label: "Cintura" },
            { key: "hips_cm", label: "Cadera" },
            { key: "bicep_l_cm", label: "Bícep izq" },
            { key: "bicep_r_cm", label: "Bícep der" },
            { key: "thigh_l_cm", label: "Muslo izq" },
            { key: "thigh_r_cm", label: "Muslo der" },
            { key: "calf_l_cm", label: "Pantorrilla izq" },
            { key: "calf_r_cm", label: "Pantorrilla der" },
            { key: "neck_cm", label: "Cuello" },
          ];

          const filledFields = measureFields.filter((f) => latest[f.key] !== null);
          if (filledFields.length === 0) return null;

          return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowMeasurements((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-cyan-500/10 shrink-0">
                  <Ruler size={16} className="text-cyan-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Medidas corporales</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(latest.measured_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    {previous ? ` vs ${new Date(previous.measured_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}` : ""}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-slate-300 dark:text-slate-600 transition-transform ${showMeasurements ? "rotate-90" : ""}`}
                />
              </button>

              {showMeasurements && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filledFields.map((f) => {
                      const val = latest[f.key] as number;
                      const prevVal = previous ? (previous[f.key] as number | null) : null;
                      const diff = prevVal ? Math.round((val - prevVal) * 10) / 10 : null;
                      return (
                        <div key={f.key} className="px-4 py-2.5 flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{f.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{val} cm</span>
                            {diff !== null && diff !== 0 && (
                              <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
                                diff < 0 ? "text-emerald-500" : "text-rose-500"
                              }`}>
                                {diff < 0 ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
                                {diff > 0 ? "+" : ""}{diff}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Objetivos (solo PT) ─────────────────────────────────────── */}
        {isPT && goals.length > 0 && (() => {
          const activeGoals = goals.filter((g) => g.status === "active");
          const achievedGoals = goals.filter((g) => g.status === "achieved");

          const goalLabels: Record<string, string> = {
            lose_weight: "Bajar de peso",
            gain_muscle: "Ganar músculo",
            rehab: "Rehabilitación",
            flexibility: "Flexibilidad",
            endurance: "Resistencia",
            strength: "Fuerza",
            general_fitness: "Fitness general",
            other: "Otro",
          };

          const goalColors: Record<string, string> = {
            lose_weight: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
            gain_muscle: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
            rehab: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            flexibility: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            endurance: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            strength: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
            general_fitness: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            other: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
          };

          return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
                  <Target size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Mis objetivos</p>
                  {achievedGoals.length > 0 && (
                    <p className="text-xs text-emerald-500 font-medium">{achievedGoals.length} logrado{achievedGoals.length !== 1 ? "s" : ""} ✓</p>
                  )}
                </div>
              </div>

              {activeGoals.length > 0 && (
                <div className="space-y-2">
                  {activeGoals.map((goal) => (
                    <div key={goal.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${goalColors[goal.goal_type] ?? goalColors.other}`}>
                            {goalLabels[goal.goal_type] ?? "Otro"}
                          </span>
                          {goal.description && (
                            <p className="text-sm text-slate-700 dark:text-slate-300">{goal.description}</p>
                          )}
                          {goal.target_value && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Meta: {goal.target_value}</p>
                          )}
                        </div>
                        {goal.target_date && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 mt-1">
                            {new Date(goal.target_date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {achievedGoals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Logrados</p>
                  {achievedGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <Trophy size={12} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {goalLabels[goal.goal_type] ?? "Otro"}
                        {goal.description ? ` — ${goal.description}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeGoals.length === 0 && achievedGoals.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                  Tu entrenador aún no definió objetivos.
                </p>
              )}
            </div>
          );
        })()}

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
                Fue asignada hace {routineFreshness.daysOld} días. Podés pedir una nueva {isPT ? 'a tu entrenador' : 'al profesor'}.
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
              <p className="text-xs text-slate-400 dark:text-slate-600">{isPT ? 'Tu entrenador' : 'Tu profesor'} aún no asignó ninguna rutina.</p>
            </div>
          )}

          {/* Contenido: sesión NO iniciada → selector de rutina */}
          {options.length > 0 && !activeSession && (
            <div className="px-4 py-4 space-y-3">
              {/* Opciones disponibles */}
              {options.length === 1 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Rutina disponible</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{options[0].plan_name}</p>
                      {options[0].plan_description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{options[0].plan_description}</p>
                      )}
                    </div>
                    {options[0].days_of_week && options[0].days_of_week.length > 0 && (
                      <div className="flex gap-0.5 shrink-0 flex-wrap justify-end">
                        {options[0].days_of_week.map((d) => (
                          <span key={d} className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold">
                            {DAY_NAMES[d]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Elegí tu rutina de hoy
                  </p>
                  {options.map((option) => {
                    const todayDay = new Date().getDay();
                    const isTodayPlan = option.days_of_week?.includes(todayDay);
                    return (
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{option.plan_name}</p>
                              {isTodayPlan && (
                                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-black">
                                  Hoy
                                </span>
                              )}
                            </div>
                            {option.plan_description && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{option.plan_description}</p>
                            )}
                            {option.days_of_week && option.days_of_week.length > 0 && (
                              <div className="flex gap-0.5 mt-1 flex-wrap">
                                {option.days_of_week.map((d) => (
                                  <span key={d} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                    d === new Date().getDay()
                                      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                  }`}>
                                    {DAY_NAMES[d]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
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
                    Le avisaste {isPT ? 'a tu entrenador' : 'al profesor'} que querés una nueva rutina.
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
                  <p className="text-xs text-slate-400 dark:text-slate-500">Avisale {isPT ? 'a tu entrenador' : 'al profesor'} para que te actualice la rutina.</p>
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

        {/* ── Historial de sesiones ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
              <History size={16} className="text-violet-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Historial</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {recentSessions.length > 0
                  ? `Últimas ${recentSessions.length} sesiones`
                  : "Sin sesiones registradas"}
              </p>
            </div>
            <ChevronRight
              size={16}
              className={`text-slate-300 dark:text-slate-600 transition-transform ${showHistory ? "rotate-90" : ""}`}
            />
          </button>

          {showHistory && (
            <div className="border-t border-slate-100 dark:border-slate-800">
              {recentSessions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarDays size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">Aún no hay sesiones registradas.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                    Completá tu primer entrenamiento para verlo acá.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentSessions.map((session) => {
                    const date = new Date(session.session_date + "T12:00:00");
                    const isCompleted = !!session.completed_at;
                    const dayName = date.toLocaleDateString("es-AR", { weekday: "short" });
                    const dateStr = date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                    return (
                      <div
                        key={session.id}
                        className="px-4 py-3 flex items-center gap-3"
                      >
                        {/* Estado */}
                        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                          isCompleted
                            ? "bg-emerald-500/10"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}>
                          {isCompleted
                            ? <CheckCircle2 size={15} className="text-emerald-500" />
                            : <Circle size={15} className="text-slate-300 dark:text-slate-600" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {session.plan_name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                            {dayName} {dateStr}
                          </p>
                        </div>

                        {/* Badge */}
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                        }`}>
                          {isCompleted ? "Completa" : "Parcial"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

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
