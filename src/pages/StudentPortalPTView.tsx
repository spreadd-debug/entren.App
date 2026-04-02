import { useState, useEffect } from "react";
import {
  Dumbbell,
  Image,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Circle,
  Trophy,
  History,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Target,
  Ruler,
  Activity,
  MessageSquare,
  Flame,
  Coffee,
  Moon,
  Smile,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { ExerciseVideoModal } from "../components/ExerciseVideoModal";
import {
  WorkoutOption,
  WorkoutSession,
  WorkoutSessionExercise,
  ClientAnthropometry,
  ClientMeasurement,
  ClientGoal,
  SessionNote,
  NoteCategory,
  WellnessCheckIn,
  NutritionItem,
  MealLabel,
} from "../../shared/types";
import { WellnessCheckInService } from "../services/pt/WellnessCheckInService";
import { NutritionPlanService, NutritionPlanWithItems } from "../services/pt/NutritionPlanService";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface AdherenceStats {
  totalSessions: number;
  completedSessions: number;
  adherencePercent: number;
  lastSessionDate: string | null;
}

export interface StudentPortalPTViewProps {
  student: any;
  onLogout: () => void;
  options: WorkoutOption[];
  activeSession: WorkoutSession | null;
  sessionItems: WorkoutSessionExercise[];
  todayExercises: any[];
  recentSessions: Array<{
    id: string;
    session_date: string;
    completed_at: string | null;
    plan_name: string;
    duration_minutes?: number | null;
    total_volume?: number | null;
    pt_notes?: string | null;
  }>;
  anthropometry: ClientAnthropometry[];
  measurements: ClientMeasurement[];
  goals: ClientGoal[];
  sessionNotes: SessionNote[];
  adherenceStats: AdherenceStats | null;
}

// ─── Theme constants ───────────────────────────────────────────────────────────

const card = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm";
const cardBorder = "border-slate-100 dark:border-slate-800";
const cardDivider = "divide-slate-100 dark:divide-slate-800";
const textPrimary = "text-slate-900 dark:text-white";
const textSecondary = "text-slate-400 dark:text-slate-500";
const iconBg = "bg-violet-500/10";
const iconColor = "text-violet-500";
const subtleBg = "bg-slate-50 dark:bg-slate-800";
const chipActive = "bg-violet-500/10 text-violet-600 dark:text-violet-400";

// ─── Note category config ──────────────────────────────────────────────────────

const noteCategoryConfig: Record<NoteCategory, { label: string; color: string }> = {
  progress: { label: "Progreso", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  injury: { label: "Lesión", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  nutrition: { label: "Nutrición", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  motivation: { label: "Motivación", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  other: { label: "Otro", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
};

// ─── Goal config ───────────────────────────────────────────────────────────────

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
  lose_weight: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  gain_muscle: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rehab: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  flexibility: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  endurance: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  strength: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  general_fitness: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  other: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

// ─── Wellness Slider ──────────────────────────────────────────────────────────

function WellnessSlider({ label, emojis, value, onChange }: {
  label: string;
  emojis: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-1">
        {emojis.map((emoji, i) => {
          const v = i + 1;
          const selected = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`flex-1 py-2 rounded-xl text-center text-lg transition-all ${
                selected
                  ? 'bg-violet-500/20 ring-2 ring-violet-500 scale-110'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function StudentPortalPTView({
  student,
  onLogout,
  options,
  activeSession,
  sessionItems,
  todayExercises,
  recentSessions,
  anthropometry,
  measurements,
  goals,
  sessionNotes,
  adherenceStats,
}: StudentPortalPTViewProps) {
  const [showProgress, setShowProgress] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    videoUrl: string;
  }>({ isOpen: false, exerciseName: "", videoUrl: "" });

  // Nutrition state
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithItems | null>(null);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [nutritionLoaded, setNutritionLoaded] = useState(false);

  useEffect(() => {
    if (!student?.id) return;
    NutritionPlanService.getActivePlan(student.id)
      .then(setNutritionPlan)
      .catch(() => {})
      .finally(() => setNutritionLoaded(true));
  }, [student?.id]);

  // Wellness check-in state
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [wellnessToday, setWellnessToday] = useState<WellnessCheckIn | null>(null);
  const [wellnessForm, setWellnessForm] = useState({ energy: 3, sleep_quality: 3, mood: 3, soreness: 1, notes: '' });
  const [wellnessSaving, setWellnessSaving] = useState(false);
  const [wellnessLoaded, setWellnessLoaded] = useState(false);

  useEffect(() => {
    if (!student?.id) return;
    WellnessCheckInService.getToday(student.id)
      .then((ci) => {
        setWellnessToday(ci);
        if (ci) setWellnessForm({ energy: ci.energy, sleep_quality: ci.sleep_quality, mood: ci.mood, soreness: ci.soreness, notes: ci.notes ?? '' });
      })
      .catch(() => {})
      .finally(() => setWellnessLoaded(true));
  }, [student?.id]);

  const handleWellnessSave = async () => {
    if (!student?.id || !student?.gym_id) return;
    setWellnessSaving(true);
    try {
      const saved = await WellnessCheckInService.saveToday({
        gym_id: student.gym_id,
        student_id: student.id,
        ...wellnessForm,
      });
      setWellnessToday(saved);
      setWellnessOpen(false);
    } catch { /* ignore */ }
    setWellnessSaving(false);
  };

  const studentName =
    student?.name ??
    `${student?.nombre ?? ""} ${student?.apellido ?? ""}`.trim();
  const firstName = studentName.split(" ")[0];

  // Today's routine: use session items if session exists, otherwise use plan exercises
  const sessionCompleted = !!activeSession?.completed_at;
  const todayDay = new Date().getDay();
  const todayOption = options.find((o) => o.days_of_week?.includes(todayDay)) ?? options[0] ?? null;

  // Exercises to show: from active session or from plan directly
  const exercisesToShow = activeSession
    ? sessionItems
    : todayExercises.map((e: any) => ({
        id: e.id,
        exercise_name: e.exercise_name ?? e.exerciseName ?? e.name ?? "",
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        notes: e.notes,
        video_url: e.video_url ?? e.videoUrl ?? null,
        exercise_order: e.exercise_order ?? e.exerciseOrder ?? 0,
        completed: false,
      }));

  // ─── Adherence ring ──────────────────────────────────────────────────────────

  const adherencePercent = adherenceStats?.adherencePercent ?? 0;
  const adherenceColor =
    adherencePercent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    adherencePercent >= 50 ? "text-amber-600 dark:text-amber-400" :
    "text-rose-600 dark:text-rose-400";
  const adherenceStroke =
    adherencePercent >= 80 ? "stroke-emerald-500" :
    adherencePercent >= 50 ? "stroke-amber-500" :
    "stroke-rose-500";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30">
            <Dumbbell size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              Hola, {firstName}
            </p>
            <p className="text-[10px] font-medium text-violet-500 dark:text-violet-400/60">
              Tu portal de entrenamiento
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-xl transition-colors text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <LogOut size={17} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* ── Adherencia ───────────────────────────────────────────────── */}
        {adherenceStats && adherenceStats.totalSessions > 0 && (
          <div className={`${card} p-4 flex items-center gap-4`}>
            <div className="shrink-0 relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-slate-700" />
                <circle
                  cx="22" cy="22" r="18" fill="none" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(adherencePercent / 100) * 113.1} 113.1`}
                  className={`${adherenceStroke} transition-all duration-700`}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${adherenceColor}`}>
                {Math.round(adherencePercent)}%
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 dark:text-white">Constancia</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {adherenceStats.completedSessions} de {adherenceStats.totalSessions} sesiones completadas
              </p>
              {adherenceStats.lastSessionDate && (
                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                  Última sesión: {new Date(adherenceStats.lastSessionDate + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
            <Flame size={20} className={`shrink-0 ${adherenceColor}`} />
          </div>
        )}

        {/* ── Tu rutina de hoy (read-only) ─────────────────────────────── */}
        <div className={`${card} overflow-hidden`}>
          <div className={`px-4 pt-4 pb-3 flex items-center gap-3 border-b ${cardBorder}`}>
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
              <Dumbbell size={16} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Tu rutina de hoy</h2>
              {todayOption && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {todayOption.plan_name}
                  {todayOption.days_of_week && todayOption.days_of_week.length > 0 && (
                    <> · {todayOption.days_of_week.map((d) => DAY_NAMES[d]).join(", ")}</>
                  )}
                </p>
              )}
            </div>
            {sessionCompleted && (
              <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Hecho
              </span>
            )}
          </div>

          {/* No routine today */}
          {options.length === 0 ? (
            <div className="px-4 py-10 text-center space-y-2">
              <Dumbbell size={28} className="text-slate-200 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-600">Sin rutina asignada</p>
              <p className="text-xs text-slate-400 dark:text-slate-600">Tu entrenador aún no asignó ninguna rutina.</p>
            </div>
          ) : !todayOption ? (
            <div className="px-4 py-10 text-center space-y-3">
              <Coffee size={28} className="text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Hoy es día de descanso</p>
              <p className="text-xs text-slate-400 dark:text-slate-600">No tenés rutina programada para hoy. ¡Descansá bien!</p>
            </div>
          ) : exercisesToShow.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-600">No hay ejercicios cargados aún.</p>
            </div>
          ) : (
            <div className={`divide-y ${cardDivider}`}>
              {exercisesToShow.map((item: any, idx: number) => (
                <div
                  key={item.id ?? idx}
                  className="px-4 py-3.5 flex items-center gap-3"
                >
                  {/* Order number */}
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <span className="text-xs font-black text-violet-400">{idx + 1}</span>
                  </div>

                  {/* Exercise info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${
                      item.completed
                        ? "text-slate-400 dark:text-slate-600 line-through"
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

                  {/* Video button */}
                  {item.video_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setVideoModal({
                          isOpen: true,
                          exerciseName: item.exercise_name,
                          videoUrl: item.video_url!,
                        })
                      }
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 text-xs font-bold border transition-colors"
                    >
                      <Image size={13} />
                      Ver
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Completed banner */}
          {sessionCompleted && (
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                <Trophy size={15} />
                ¡Entrenamiento de hoy completado!
              </div>
            </div>
          )}
        </div>

        {/* ── Mi Progreso ──────────────────────────────────────────────── */}
        {anthropometry.length > 0 && (() => {
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

          const chartData = anthropometry
            .filter((a) => a.weight_kg !== null)
            .slice(0, 10)
            .reverse();
          const weights = chartData.map((a) => a.weight_kg!);
          const minW = Math.min(...weights) - 1;
          const maxW = Math.max(...weights) + 1;
          const range = maxW - minW || 1;

          return (
            <div className={`${card} overflow-hidden`}>
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
                  className={`text-slate-400 dark:text-slate-600 transition-transform ${showProgress ? "rotate-90" : ""}`}
                />
              </button>

              {showProgress && (
                <div className={`border-t ${cardBorder} px-4 py-4 space-y-4`}>
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`p-3 rounded-xl ${subtleBg} text-center`}>
                      <Scale size={14} className="text-violet-400 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{latest.weight_kg ?? "—"}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">kg</p>
                      {weightDiff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${
                          weightDiff < 0 ? "text-emerald-500" : weightDiff > 0 ? "text-rose-500" : "text-slate-400"
                        }`}>
                          {weightDiff < 0 ? <TrendingDown size={10} /> : weightDiff > 0 ? <TrendingUp size={10} /> : <Minus size={10} />}
                          {weightDiff > 0 ? "+" : ""}{weightDiff} kg
                        </div>
                      )}
                    </div>

                    <div className={`p-3 rounded-xl ${subtleBg} text-center`}>
                      <Target size={14} className="text-amber-500 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{latest.body_fat_pct ?? "—"}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">% grasa</p>
                      {fatDiff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${
                          fatDiff < 0 ? "text-emerald-500" : fatDiff > 0 ? "text-rose-500" : "text-slate-400"
                        }`}>
                          {fatDiff < 0 ? <TrendingDown size={10} /> : fatDiff > 0 ? <TrendingUp size={10} /> : <Minus size={10} />}
                          {fatDiff > 0 ? "+" : ""}{fatDiff}%
                        </div>
                      )}
                    </div>

                    <div className={`p-3 rounded-xl ${subtleBg} text-center`}>
                      <Dumbbell size={14} className="text-violet-500 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{latest.muscle_mass_kg ?? "—"}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">kg músculo</p>
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

                  {/* Weight chart */}
                  {chartData.length >= 2 && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider mb-2">
                        Evolución de peso
                      </p>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <svg viewBox="0 0 300 120" className="w-full h-auto">
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
                          <path
                            d={`M${chartData.map((_, i) => {
                              const x = 30 + (i / (chartData.length - 1)) * 260;
                              const y = 10 + (1 - (weights[i] - minW) / range) * 90;
                              return `${x},${y}`;
                            }).join(" L")} L${30 + 260},100 L30,100 Z`}
                            className="fill-violet-500/10"
                          />
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
                            className="text-violet-400"
                          />
                          {chartData.map((entry, i) => {
                            const x = 30 + (i / (chartData.length - 1)) * 260;
                            const y = 10 + (1 - (weights[i] - minW) / range) * 90;
                            return (
                              <g key={entry.id}>
                                <circle cx={x} cy={y} r="3.5" className="fill-violet-500" />
                                <circle cx={x} cy={y} r="2" className="fill-white dark:fill-slate-800" />
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

                  <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center">
                    Última medición: {new Date(latest.measured_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Medidas corporales ────────────────────────────────────────── */}
        {measurements.length > 0 && (() => {
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
            <div className={`${card} overflow-hidden`}>
              <button
                onClick={() => setShowMeasurements((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
                  <Ruler size={16} className={iconColor} />
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
                  className={`text-slate-400 dark:text-slate-600 transition-transform ${showMeasurements ? "rotate-90" : ""}`}
                />
              </button>

              {showMeasurements && (
                <div className={`border-t ${cardBorder}`}>
                  <div className={`divide-y ${cardDivider}`}>
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

        {/* ── Objetivos ────────────────────────────────────────────────── */}
        {goals.length > 0 && (() => {
          const activeGoals = goals.filter((g) => g.status === "active");
          const achievedGoals = goals.filter((g) => g.status === "achieved");

          return (
            <div className={`${card} p-4 space-y-3`}>
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
                    <div key={goal.id} className={`p-3 rounded-xl ${subtleBg} border border-white/5`}>
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
                          <span className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0 mt-1">
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
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Logrados</p>
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
            </div>
          );
        })()}

        {/* ── Notas del entrenador ──────────────────────────────────────── */}
        <div className={`${card} overflow-hidden`}>
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
              <MessageSquare size={16} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Notas de tu entrenador</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {sessionNotes.length > 0
                  ? `${Math.min(sessionNotes.length, 5)} nota${sessionNotes.length !== 1 ? "s" : ""} reciente${sessionNotes.length !== 1 ? "s" : ""}`
                  : "Sin notas aún"}
              </p>
            </div>
            <ChevronRight
              size={16}
              className={`text-slate-400 dark:text-slate-600 transition-transform ${showNotes ? "rotate-90" : ""}`}
            />
          </button>

          {showNotes && (
            <div className={`border-t ${cardBorder}`}>
              {sessionNotes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <MessageSquare size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-600">Tu entrenador aún no dejó notas.</p>
                </div>
              ) : (
                <div className={`divide-y ${cardDivider}`}>
                  {sessionNotes.slice(0, 5).map((note) => {
                    const catConfig = note.category
                      ? noteCategoryConfig[note.category]
                      : null;
                    const noteDate = new Date(note.note_date + "T12:00:00");
                    return (
                      <div key={note.id} className="px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-600">
                            {noteDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </span>
                          {catConfig && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${catConfig.color}`}>
                              {catConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{note.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Plan Nutricional ──────────────────────────────────────────── */}
        {nutritionLoaded && nutritionPlan && (
          <div className={`${card} overflow-hidden`}>
            <button
              onClick={() => setNutritionOpen((v) => !v)}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
                <Coffee size={16} className="text-violet-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{nutritionPlan.title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {nutritionPlan.calories_target ? `${nutritionPlan.calories_target} kcal` : 'Plan nutricional'}
                  {nutritionPlan.protein_g ? ` · ${nutritionPlan.protein_g}g P` : ''}
                </p>
              </div>
              <ChevronRight
                size={16}
                className={`text-slate-400 dark:text-slate-600 transition-transform ${nutritionOpen ? "rotate-90" : ""}`}
              />
            </button>

            {nutritionOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* Macro targets */}
                {(nutritionPlan.calories_target || nutritionPlan.protein_g || nutritionPlan.carbs_g || nutritionPlan.fat_g) && (
                  <div className="grid grid-cols-4 gap-2">
                    {nutritionPlan.calories_target && (
                      <div className="text-center p-2 rounded-xl bg-orange-500/10">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.calories_target}</p>
                        <p className="text-[10px] text-orange-500">kcal</p>
                      </div>
                    )}
                    {nutritionPlan.protein_g && (
                      <div className="text-center p-2 rounded-xl bg-rose-500/10">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.protein_g}g</p>
                        <p className="text-[10px] text-rose-500">proteína</p>
                      </div>
                    )}
                    {nutritionPlan.carbs_g && (
                      <div className="text-center p-2 rounded-xl bg-amber-500/10">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.carbs_g}g</p>
                        <p className="text-[10px] text-amber-500">carbos</p>
                      </div>
                    )}
                    {nutritionPlan.fat_g && (
                      <div className="text-center p-2 rounded-xl bg-cyan-500/10">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.fat_g}g</p>
                        <p className="text-[10px] text-cyan-500">grasas</p>
                      </div>
                    )}
                  </div>
                )}

                {nutritionPlan.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    {nutritionPlan.description}
                  </p>
                )}

                {/* Meals */}
                {(['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Snack'] as const).map((meal) => {
                  const items = nutritionPlan.items.filter((i) => i.meal_label === meal);
                  if (items.length === 0) return null;
                  const mealEmoji: Record<string, string> = { Desayuno: '🌅', Almuerzo: '🍽️', Merienda: '☕', Cena: '🌙', Snack: '🍎' };
                  return (
                    <div key={meal}>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {mealEmoji[meal]} {meal}
                      </p>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <div key={item.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                            <p className="text-sm text-slate-900 dark:text-white font-medium">{item.food_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.portion && <span className="text-[10px] text-slate-400">{item.portion}</span>}
                              {item.calories && <span className="text-[10px] text-orange-500 font-medium">{item.calories} kcal</span>}
                              {item.protein_g && <span className="text-[10px] text-rose-500 font-medium">{item.protein_g}g P</span>}
                            </div>
                            {item.notes && <p className="text-[10px] text-slate-400 mt-0.5">{item.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Check-in de Bienestar ─────────────────────────────────────── */}
        {wellnessLoaded && (
          <div className={`${card} overflow-hidden`}>
            <button
              onClick={() => setWellnessOpen((v) => !v)}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
                <Heart size={16} className="text-violet-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {wellnessToday ? 'Check-in de hoy' : '¿Cómo te sentís hoy?'}
                </p>
                {wellnessToday && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {['😴','😑','😐','😊','⚡'][wellnessToday.energy - 1]}{' '}
                    {['😫','😕','😐','😌','😴'][wellnessToday.sleep_quality - 1]}{' '}
                    {['😢','😟','😐','🙂','😄'][wellnessToday.mood - 1]}{' '}
                    {['✅','🟡','😐','😣','🔴'][wellnessToday.soreness - 1]}
                    {' · Tocá para editar'}
                  </p>
                )}
              </div>
              <ChevronRight
                size={16}
                className={`text-slate-400 dark:text-slate-600 transition-transform ${wellnessOpen ? "rotate-90" : ""}`}
              />
            </button>

            {wellnessOpen && (
              <div className="px-4 pb-4 space-y-4">
                {/* Energy */}
                <WellnessSlider
                  label="Energía"
                  emojis={['😴','😑','😐','😊','⚡']}
                  value={wellnessForm.energy}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, energy: v }))}
                />
                {/* Sleep */}
                <WellnessSlider
                  label="Sueño"
                  emojis={['😫','😕','😐','😌','😴']}
                  value={wellnessForm.sleep_quality}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, sleep_quality: v }))}
                />
                {/* Mood */}
                <WellnessSlider
                  label="Ánimo"
                  emojis={['😢','😟','😐','🙂','😄']}
                  value={wellnessForm.mood}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, mood: v }))}
                />
                {/* Soreness */}
                <WellnessSlider
                  label="Dolor muscular"
                  emojis={['✅','🟡','😐','😣','🔴']}
                  value={wellnessForm.soreness}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, soreness: v }))}
                />
                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Nota (opcional)</label>
                  <textarea
                    value={wellnessForm.notes}
                    onChange={(e) => setWellnessForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Dormí mal, me duele la rodilla..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                  />
                </div>
                {/* Save button */}
                <button
                  onClick={handleWellnessSave}
                  disabled={wellnessSaving}
                  className="w-full py-3 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {wellnessSaving ? 'Guardando...' : wellnessToday ? 'Actualizar check-in' : 'Guardar check-in'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Historial de sesiones ─────────────────────────────────────── */}
        <div className={`${card} overflow-hidden`}>
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
              className={`text-slate-400 dark:text-slate-600 transition-transform ${showHistory ? "rotate-90" : ""}`}
            />
          </button>

          {showHistory && (
            <div className={`border-t ${cardBorder}`}>
              {recentSessions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarDays size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-600">Aún no hay sesiones registradas.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                    Cuando completes entrenamientos van a aparecer acá.
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${cardDivider}`}>
                  {recentSessions.map((session) => {
                    const date = new Date(session.session_date + "T12:00:00");
                    const isCompleted = !!session.completed_at;
                    const dayName = date.toLocaleDateString("es-AR", { weekday: "short" });
                    const dateStr = date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                    const vol = session.total_volume ? Number(session.total_volume) : 0;
                    const dur = session.duration_minutes ?? 0;
                    return (
                      <div key={session.id} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-center gap-3">
                          <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                            isCompleted ? "bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800"
                          }`}>
                            {isCompleted
                              ? <CheckCircle2 size={15} className="text-emerald-500" />
                              : <Circle size={15} className="text-slate-400 dark:text-slate-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{session.plan_name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{dayName} {dateStr}</p>
                          </div>
                          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                          }`}>
                            {isCompleted ? "Completa" : "Parcial"}
                          </span>
                        </div>
                        {(vol > 0 || dur > 0) && (
                          <div className="ml-11 flex gap-3">
                            {dur > 0 && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {dur} min
                              </span>
                            )}
                            {vol > 0 && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)}kg`} vol.
                              </span>
                            )}
                          </div>
                        )}
                        {session.pt_notes && (
                          <p className="ml-11 text-[11px] text-violet-500 dark:text-violet-400 italic line-clamp-2">
                            "{session.pt_notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
