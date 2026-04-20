import { useState, useEffect, useMemo } from "react";
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
  Scale,
  Target,
  Ruler,
  MessageSquare,
  Flame,
  Coffee,
  Moon,
  Smile,
  AlertTriangle,
  Heart,
  Camera,
  X,
} from "lucide-react";
import { WorkoutPlanService } from "../services/WorkoutPlanService";
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
  MealType,
} from "../../shared/types";
import { WellnessCheckInService } from "../services/pt/WellnessCheckInService";
import { NutritionPlanService, NutritionPlanFull } from "../services/pt/NutritionPlanService";
import { ProgressPhotosService } from "../services/pt/ProgressPhotosService";
import { AnthropometryService } from "../services/pt/AnthropometryService";
import EvolutionSection from "../components/pt/EvolutionSection";
import { ProgressPhoto, PhotoAngle } from "../../shared/types";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
  onAnthropometryUpdate?: (data: ClientAnthropometry[]) => void;
  lastPerfMap?: Record<string, { weight: number; reps: number; date: string }>;
}

// ─── Theme constants ───────────────────────────────────────────────────────────

const card = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm";
const cardSecondary = "bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80";
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

// ─── Mini Sparkline SVG ────────────────────────────────────────────────────────

function MiniSparkline({ values, color = "text-violet-400", width = 80, height = 32 }: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className={`${color} shrink-0`} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  onAnthropometryUpdate,
  lastPerfMap = {},
}: StudentPortalPTViewProps) {
  // Weekly view state
  const [viewingDay, setViewingDay] = useState<number>(new Date().getDay());
  const [previewExercises, setPreviewExercises] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Secondary cards state — all collapsed by default
  const [showRoutine, setShowRoutine] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    videoUrl: string;
  }>({ isOpen: false, exerciseName: "", videoUrl: "" });

  // Nutrition state
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanFull | null>(null);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [nutritionLoaded, setNutritionLoaded] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoAngle, setPhotoAngle] = useState<PhotoAngle>("front");
  const [fullscreenPhoto, setFullscreenPhoto] = useState<ProgressPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<ProgressPhoto | null>(null);
  const [compareB, setCompareB] = useState<ProgressPhoto | null>(null);


  const handleCompareSelect = (photo: ProgressPhoto) => {
    if (!compareA) {
      setCompareA(photo);
    } else if (compareA.id === photo.id) {
      setCompareA(null);
    } else if (!compareB) {
      setCompareB(photo);
    } else if (compareB.id === photo.id) {
      setCompareB(null);
    } else {
      setCompareB(photo);
    }
  };

  useEffect(() => {
    if (!student?.id) return;
    NutritionPlanService.getActivePlan(student.id)
      .then(setNutritionPlan)
      .catch(() => {})
      .finally(() => setNutritionLoaded(true));
    ProgressPhotosService.getByStudent(student.id)
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setPhotosLoaded(true));
  }, [student?.id]);

  const ANGLE_LABELS: Record<PhotoAngle, string> = {
    front: "Frente", side_left: "Lateral izq.", side_right: "Lateral der.", back: "Espalda",
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !student?.gym_id) return;
    setPhotoUploading(true);
    try {
      await ProgressPhotosService.upload({
        gymId: student.gym_id,
        studentId: student.id,
        file: photoFile,
        angle: photoAngle,
        photoDate: new Date().toISOString().split("T")[0],
      });
      const updated = await ProgressPhotosService.getByStudent(student.id);
      setPhotos(updated);
      setShowPhotoUpload(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoAngle("front");
    } catch { /* ignore */ }
    setPhotoUploading(false);
  };

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

  // ─── Weight registration ──────────────────────────────────────────────────────
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);

  const handleWeightSave = async () => {
    const val = parseFloat(weightInput.replace(',', '.'));
    if (!student?.id || !student?.gym_id || isNaN(val) || val < 20 || val > 350) return;
    setWeightSaving(true);
    try {
      // Use last known height for BMI auto-calc
      const lastHeight = anthropometry.find(a => a.height_cm)?.height_cm ?? null;
      await AnthropometryService.create({
        gym_id: student.gym_id,
        student_id: student.id,
        measured_at: new Date().toISOString().split('T')[0],
        weight_kg: val,
        height_cm: lastHeight,
        notes: 'Registrado por el alumno',
      });
      // Refresh parent data
      const updated = await AnthropometryService.getByStudent(student.id);
      onAnthropometryUpdate?.(updated);
      setWeightOpen(false);
      setWeightInput('');
    } catch { /* ignore */ }
    setWeightSaving(false);
  };

  const studentName =
    student?.name ??
    `${student?.nombre ?? ""} ${student?.apellido ?? ""}`.trim();
  const firstName = studentName.split(" ")[0];

  // Today's routine
  const sessionCompleted = !!activeSession?.completed_at;
  const todayDay = new Date().getDay();
  const isViewingToday = viewingDay === todayDay;
  const todayOption = options.find((o) => o.days_of_week?.includes(todayDay)) ?? options[0] ?? null;
  const viewingOption = options.find(o => o.days_of_week?.includes(viewingDay)) ?? null;
  const daysWithRoutine = useMemo(() => {
    const s = new Set<number>();
    for (const opt of options) {
      if (opt.days_of_week) opt.days_of_week.forEach(d => s.add(d));
    }
    return s;
  }, [options]);

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

  /** Helper: "última vez" para un ejercicio */
  const getLastPerf = (exerciseName: string) => lastPerfMap[exerciseName.toLowerCase()] ?? null;

  /** Formato relativo de fecha */
  const formatRelative = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'hoy';
    if (diff === 1) return 'ayer';
    return `hace ${diff} días`;
  };

  // Load exercises when switching days
  useEffect(() => {
    if (isViewingToday) {
      setPreviewExercises([]);
      return;
    }
    const dayOpt = options.find(o => o.days_of_week?.includes(viewingDay));
    if (!dayOpt) {
      setPreviewExercises([]);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    WorkoutPlanService.getExercises(dayOpt.workout_plan_id)
      .then(exercises => { if (!cancelled) setPreviewExercises(exercises); })
      .catch(() => { if (!cancelled) setPreviewExercises([]); })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [viewingDay, options, isViewingToday]);

  // ─── Hero metric data ─────────────────────────────────────────────────────────

  const activeGoal = goals.find((g) => g.status === "active");
  const goalType = activeGoal?.goal_type;
  const isMuscleFocus = goalType === "gain_muscle" || goalType === "strength";

  const latest = anthropometry.length > 0 ? anthropometry[0] : null;
  const previous = anthropometry.length > 1 ? anthropometry[1] : null;

  // Determine hero value based on goal
  const heroValue = latest
    ? isMuscleFocus
      ? latest.muscle_mass_kg
      : latest.weight_kg
    : null;
  const heroUnit = isMuscleFocus ? "kg músculo" : "kg";
  const heroLabel = isMuscleFocus ? "Masa muscular" : "Peso";

  const previousHeroValue = previous
    ? isMuscleFocus
      ? previous.muscle_mass_kg
      : previous.weight_kg
    : null;

  const heroDiff = heroValue !== null && previousHeroValue !== null
    ? Math.round((heroValue - previousHeroValue) * 10) / 10
    : null;

  // Determine if trend is good based on goal
  const isTrendGood = (() => {
    if (heroDiff === null || heroDiff === 0) return null;
    if (goalType === "lose_weight") return heroDiff < 0;
    if (goalType === "gain_muscle" || goalType === "strength") return heroDiff > 0;
    return heroDiff < 0; // default: losing weight is considered good
  })();

  // Sparkline data
  const sparklineValues = anthropometry
    .filter((a) => isMuscleFocus ? a.muscle_mass_kg !== null : a.weight_kg !== null)
    .slice(0, 10)
    .reverse()
    .map((a) => (isMuscleFocus ? a.muscle_mass_kg! : a.weight_kg!));

  // Time since last measurement
  const lastMeasuredText = latest
    ? (() => {
        const now = new Date();
        const measured = new Date(latest.measured_at + "T12:00:00");
        const diffDays = Math.floor((now.getTime() - measured.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "hoy";
        if (diffDays === 1) return "ayer";
        if (diffDays < 7) return `hace ${diffDays} días`;
        if (diffDays < 14) return "hace 1 semana";
        if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
        return `hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? "es" : ""}`;
      })()
    : null;

  // ─── Session / constancy data (for zona 2) ────────────────────────────────
  const weekSessions = recentSessions.filter(s => {
    const d = new Date(s.session_date + "T12:00:00");
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo && s.completed_at;
  }).length;

  const completedSessions = adherenceStats?.completedSessions ?? 0;
  const totalSessions = adherenceStats?.totalSessions ?? 0;
  const weeklyGoal = options.length; // approximate: how many days/week they have routines

  const lastSession = recentSessions.find(s => s.completed_at) ?? null;
  const lastSessionDate = lastSession
    ? new Date(lastSession.session_date + "T12:00:00")
    : null;
  const lastSessionVol = lastSession?.total_volume ? Number(lastSession.total_volume) : 0;


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

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 1 — MÉTRICA HERO
            Lo primero que ve el alumno. Número grande + sparkline + contexto.
        ═══════════════════════════════════════════════════════════════════ */}
        {heroValue !== null && (
          <div className="relative -mx-4 px-4 pt-4 pb-3 mb-2 bg-gradient-to-b from-violet-500/[0.07] via-violet-500/[0.03] to-transparent dark:from-violet-500/[0.12] dark:via-violet-500/[0.04] dark:to-transparent">
            {/* Background sparkline (decorative, behind content) */}
            {sparklineValues.length >= 2 && (
              <div className="absolute inset-0 overflow-hidden opacity-[0.07] dark:opacity-[0.1] pointer-events-none">
                <svg viewBox={`0 0 300 80`} preserveAspectRatio="none" className="w-full h-full text-violet-500">
                  {(() => {
                    const min = Math.min(...sparklineValues) - 0.5;
                    const max = Math.max(...sparklineValues) + 0.5;
                    const range = max - min || 1;
                    const pts = sparklineValues.map((v, i) => {
                      const x = (i / (sparklineValues.length - 1)) * 300;
                      const y = 80 - ((v - min) / range) * 70 - 5;
                      return `${x},${y}`;
                    });
                    return (
                      <>
                        <path
                          d={`M${pts.join(" L")} L300,80 L0,80 Z`}
                          fill="currentColor"
                        />
                        <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="3" />
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

            <div className="relative flex items-end gap-3">
              {/* Main number */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                  {heroValue}
                </span>
                <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
                  {heroUnit}
                </span>
              </div>

              {/* Mini sparkline (inline, visible) */}
              {sparklineValues.length >= 2 && (
                <div className="mb-1.5">
                  <MiniSparkline
                    values={sparklineValues}
                    color={isTrendGood === true ? "text-emerald-400" : isTrendGood === false ? "text-rose-400" : "text-violet-400"}
                    width={80}
                    height={32}
                  />
                </div>
              )}
            </div>

            {/* Variation + goal context */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {heroDiff !== null && heroDiff !== 0 && (
                <span className={`flex items-center gap-1 text-sm font-bold ${
                  isTrendGood === true ? "text-emerald-500" : isTrendGood === false ? "text-rose-500" : "text-slate-400"
                }`}>
                  {heroDiff < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {heroDiff > 0 ? "+" : ""}{heroDiff} kg {lastMeasuredText ? `desde ${lastMeasuredText}` : ""}
                </span>
              )}
              {heroDiff === null && lastMeasuredText && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Medido {lastMeasuredText}
                </span>
              )}
            </div>

            {/* Goal target */}
            {activeGoal && activeGoal.target_value && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${goalColors[activeGoal.goal_type] ?? goalColors.other}`}>
                  <Target size={10} />
                  {goalLabels[activeGoal.goal_type] ?? "Otro"}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Meta: {activeGoal.target_value}
                  {heroValue !== null && !isNaN(Number(activeGoal.target_value)) && (
                    <> — {Math.abs(heroValue - Number(activeGoal.target_value)) < 0.1
                      ? "¡La alcanzaste!"
                      : `te ${goalType === "lose_weight" ? "faltan" : "faltan"} ${Math.abs(Math.round((heroValue - Number(activeGoal.target_value)) * 10) / 10)} kg`
                    }</>
                  )}
                </span>
              </div>
            )}

            {/* Weight registration inline */}
            {!weightOpen ? (
              <button
                onClick={() => { setWeightOpen(true); setWeightInput(heroValue?.toString() ?? ''); }}
                className="relative mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
              >
                <Scale size={14} />
                Registrar peso
              </button>
            ) : (
              <div className="relative mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <Scale size={14} className="text-violet-500 shrink-0" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="Ej: 70,5"
                    autoFocus
                    className="w-24 px-3 py-2 rounded-xl border border-violet-300 dark:border-violet-500/50 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleWeightSave(); if (e.key === 'Escape') setWeightOpen(false); }}
                  />
                  <span className="text-xs text-slate-400">kg</span>
                </div>
                <button
                  onClick={handleWeightSave}
                  disabled={weightSaving || !weightInput}
                  className="px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-600 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {weightSaving ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setWeightOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state: no anthropometry data at all — invite to register weight */}
        {heroValue === null && (
          <div className="relative -mx-4 px-4 pt-4 pb-3 mb-2 bg-gradient-to-b from-violet-500/[0.05] to-transparent dark:from-violet-500/[0.08] dark:to-transparent">
            {!weightOpen ? (
              <div className="text-center space-y-2">
                <Scale size={28} className="text-violet-300 dark:text-violet-600 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Registrá tu peso</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Así podés ver tu progreso y tu entrenador también.</p>
                <button
                  onClick={() => setWeightOpen(true)}
                  className="mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 active:scale-[0.97] transition-all shadow-sm shadow-violet-500/20"
                >
                  <Scale size={15} />
                  Registrar peso
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <Scale size={14} className="text-violet-500 shrink-0" />
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="Ej: 70,5"
                  autoFocus
                  className="w-24 px-3 py-2 rounded-xl border border-violet-300 dark:border-violet-500/50 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleWeightSave(); if (e.key === 'Escape') setWeightOpen(false); }}
                />
                <span className="text-xs text-slate-400">kg</span>
                <button
                  onClick={handleWeightSave}
                  disabled={weightSaving || !weightInput}
                  className="px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-600 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {weightSaving ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setWeightOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 2 — PRÓXIMA SESIÓN + CONSTANCIA
            Cuándo entrena + racha. Reemplaza la rutina del día.
        ═══════════════════════════════════════════════════════════════════ */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500/[0.04] to-white dark:from-violet-500/[0.08] dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-md shadow-violet-500/10 dark:shadow-violet-500/5`}>
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-purple-600 rounded-l-2xl" />

          {completedSessions === 0 ? (
            /* Estado C — No sessions yet (new user) */
            <div className="px-4 py-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/15 shrink-0">
                <Dumbbell size={18} className="text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Tu primera sesión te espera</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">¡Arranquemos!</p>
              </div>
            </div>
          ) : (
            /* Estado B — Has sessions (constancy + last session summary) */
            <div className="px-4 py-4 space-y-3">
              {/* Constancy headline */}
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm shadow-orange-500/20">
                  <Flame size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  {weekSessions > 0 ? (
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {weekSessions} sesion{weekSessions !== 1 ? "es" : ""} esta semana
                    </p>
                  ) : (
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {completedSessions} sesion{completedSessions !== 1 ? "es" : ""} completada{completedSessions !== 1 ? "s" : ""}
                    </p>
                  )}
                  {/* Progress bar */}
                  {weeklyGoal > 0 && weekSessions > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-700"
                          style={{ width: `${Math.min(100, Math.round((weekSessions / weeklyGoal) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {weekSessions} de {weeklyGoal}
                      </span>
                    </div>
                  )}
                  {weekSessions === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">¡Seguí así!</p>
                  )}
                </div>
              </div>

              {/* Last session summary */}
              {lastSession && lastSessionDate && (
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${subtleBg}`}>
                  <CalendarDays size={14} className="text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      Última sesión: {lastSessionDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 truncate">{lastSession.plan_name}</span>
                      {lastSessionVol > 0 && (
                        <span className="text-[10px] font-bold text-violet-500 shrink-0">
                          {lastSessionVol >= 1000 ? `${(lastSessionVol / 1000).toFixed(1)}t` : `${Math.round(lastSessionVol)}kg`} vol. total
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 3 — CHECK-IN RÁPIDO
            Compacto, inline. 2-3 taps y listo.
        ═══════════════════════════════════════════════════════════════════ */}
        {wellnessLoaded && (
          <div className={`${card} overflow-hidden`}>
            {wellnessToday && !wellnessOpen ? (
              /* Already checked in — compact summary */
              <button
                onClick={() => setWellnessOpen(true)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-lg">
                  <span>{['😴','😑','😐','😊','⚡'][wellnessToday.energy - 1]}</span>
                  <span>{['😫','😕','😐','😌','😴'][wellnessToday.sleep_quality - 1]}</span>
                  <span>{['😢','😟','😐','🙂','😄'][wellnessToday.mood - 1]}</span>
                  <span>{['✅','🟡','😐','😣','🔴'][wellnessToday.soreness - 1]}</span>
                </div>
                <span className="flex-1 text-left text-xs font-bold text-emerald-500">Check-in de hoy ✓</span>
                <span className="text-[10px] text-slate-400">Editar</span>
              </button>
            ) : !wellnessOpen ? (
              /* Not checked in — invite with emoji preview */
              <button
                onClick={() => setWellnessOpen(true)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="flex-1 text-left text-sm font-bold text-slate-900 dark:text-white">
                  ¿Cómo te sentís hoy?
                </span>
                <div className="flex items-center gap-1 text-base opacity-60">
                  <span title="Energía">⚡</span>
                  <span title="Sueño">😴</span>
                  <span title="Ánimo">🙂</span>
                  <span title="Dolor">💪</span>
                </div>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
              </button>
            ) : null}

            {/* Expanded check-in form */}
            {wellnessOpen && (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">¿Cómo te sentís hoy?</p>
                  <button
                    onClick={() => setWellnessOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <WellnessSlider
                  label="Energía"
                  emojis={['😴','😑','😐','😊','⚡']}
                  value={wellnessForm.energy}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, energy: v }))}
                />
                <WellnessSlider
                  label="Sueño"
                  emojis={['😫','😕','😐','😌','😴']}
                  value={wellnessForm.sleep_quality}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, sleep_quality: v }))}
                />
                <WellnessSlider
                  label="Ánimo"
                  emojis={['😢','😟','😐','🙂','😄']}
                  value={wellnessForm.mood}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, mood: v }))}
                />
                <WellnessSlider
                  label="Dolor muscular"
                  emojis={['✅','🟡','😐','😣','🔴']}
                  value={wellnessForm.soreness}
                  onChange={(v) => setWellnessForm((f) => ({ ...f, soreness: v }))}
                />
                <textarea
                  value={wellnessForm.notes}
                  onChange={(e) => setWellnessForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Nota opcional..."
                  rows={1}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                />
                <button
                  onClick={handleWellnessSave}
                  disabled={wellnessSaving}
                  className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {wellnessSaving ? 'Guardando...' : wellnessToday ? 'Actualizar' : 'Guardar check-in'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 4 — TU EVOLUCIÓN
            Componente dedicado: métricas + sparkline + PR + fotos antes/después.
        ═══════════════════════════════════════════════════════════════════ */}
        <EvolutionSection
          studentId={student?.id}
          anthropometry={anthropometry}
          goals={goals}
          photos={photos}
          onPhotoClick={(photo) => setFullscreenPhoto(photo)}
          onCompareClick={() => { setCompareMode(true); setCompareA(null); setCompareB(null); }}
        />

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 5 — CARDS SECUNDARIOS (colapsados por defecto)
            Una línea cada uno. Expandibles.
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider px-1 mb-1">Más info</p>

          {/* ── Rutina semanal ──────────────────────────────────────────── */}
          {options.length > 0 && (
            <div className={`${cardSecondary} overflow-hidden`}>
              <button
                onClick={() => setShowRoutine((v) => !v)}
                className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Dumbbell size={13} className="text-violet-500 shrink-0" />
                <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {isViewingToday
                    ? `Rutina de hoy${todayOption ? ` · ${todayOption.plan_name}` : ''}`
                    : `Rutina del ${DAY_NAMES_FULL[viewingDay]}${viewingOption ? ` · ${viewingOption.plan_name}` : ''}`}
                </span>
                {isViewingToday && sessionCompleted && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md mr-1">
                    Hecho
                  </span>
                )}
                <ChevronRight
                  size={14}
                  className={`text-slate-400 dark:text-slate-600 transition-transform ${showRoutine ? "rotate-90" : ""}`}
                />
              </button>

              {showRoutine && (
                <div className={`border-t ${cardBorder}`}>
                  {/* Day chips */}
                  <div className="px-3 py-2 flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800/80">
                    {DAY_ORDER.map(d => {
                      const hasRoutine = daysWithRoutine.has(d);
                      const isToday = d === todayDay;
                      const isSelected = d === viewingDay;
                      return (
                        <button
                          key={d}
                          onClick={() => hasRoutine || isToday ? setViewingDay(d) : undefined}
                          disabled={!hasRoutine && !isToday}
                          className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/30'
                              : hasRoutine
                                ? isToday
                                  ? 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          }`}
                        >
                          {DAY_NAMES[d]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Exercise list */}
                  {(() => {
                    // Determine which exercises to show
                    const currentOption = isViewingToday ? todayOption : viewingOption;
                    const exercises = isViewingToday
                      ? exercisesToShow
                      : previewExercises.map((e: any) => ({
                          id: e.id,
                          exercise_name: e.exercise_name ?? e.exerciseName ?? e.name ?? "",
                          sets: e.sets, reps: e.reps, weight: e.weight,
                          notes: e.notes,
                          video_url: e.video_url ?? e.videoUrl ?? null,
                          completed: false,
                        }));

                    if (!currentOption) {
                      return (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-slate-400 dark:text-slate-500">Día de descanso</p>
                          <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                            No hay rutina para el {DAY_NAMES_FULL[viewingDay].toLowerCase()}.
                          </p>
                        </div>
                      );
                    }

                    if (!isViewingToday && loadingPreview) {
                      return (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
                        </div>
                      );
                    }

                    if (exercises.length === 0) {
                      return (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-slate-400 dark:text-slate-500">No hay ejercicios cargados aún.</p>
                        </div>
                      );
                    }

                    return (
                      <div className={`divide-y ${cardDivider}`}>
                        {exercises.map((item: any, idx: number) => {
                          const perf = getLastPerf(item.exercise_name);
                          return (
                            <div key={item.id ?? idx} className="px-4 py-2.5 flex items-center gap-3">
                              <div className="shrink-0 w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <span className="text-[10px] font-black text-violet-400">{idx + 1}</span>
                              </div>
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
                                {perf && !item.completed && (
                                  <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-0.5">
                                    Última vez: {perf.weight}kg × {perf.reps} · {formatRelative(perf.date)}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-slate-400 dark:text-slate-600 italic mt-0.5">{item.notes}</p>
                                )}
                              </div>
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
                          );
                        })}
                        {isViewingToday && sessionCompleted && (
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                              <Trophy size={15} />
                              ¡Entrenamiento completado!
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── Notas del entrenador ──────────────────────────────────────── */}
          <div className={`${cardSecondary} overflow-hidden`}>
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <MessageSquare size={13} className="text-blue-400 shrink-0" />
              <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300">Notas de tu entrenador</span>
              {sessionNotes.length > 0 && (
                <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md mr-1">
                  {sessionNotes.length}
                </span>
              )}
              <ChevronRight
                size={14}
                className={`text-slate-400 dark:text-slate-600 transition-transform ${showNotes ? "rotate-90" : ""}`}
              />
            </button>

            {showNotes && (
              <div className={`border-t ${cardBorder}`}>
                {sessionNotes.length === 0 ? (
                  <div className="px-4 py-6 text-center">
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
                        <div key={note.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
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
            <div className={`${cardSecondary} overflow-hidden`}>
              <button
                onClick={() => setNutritionOpen((v) => !v)}
                className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Coffee size={13} className="text-violet-500 shrink-0" />
                <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {nutritionPlan.title}
                </span>
                <span className="text-[10px] text-slate-400 mr-1">
                  {(() => {
                    const calc = (nutritionPlan.protein_g ?? 0) * 4 + (nutritionPlan.carbs_g ?? 0) * 4 + (nutritionPlan.fat_g ?? 0) * 9;
                    return calc > 0 ? `${calc} kcal` : nutritionPlan.calories_target ? `${nutritionPlan.calories_target} kcal` : '';
                  })()}
                  {nutritionPlan.protein_g ? ` · ${nutritionPlan.protein_g}g P` : ''}
                </span>
                <ChevronRight
                  size={14}
                  className={`text-slate-400 dark:text-slate-600 transition-transform ${nutritionOpen ? "rotate-90" : ""}`}
                />
              </button>

              {nutritionOpen && (() => {
                // Fase 4 reemplazará este bloque por StudentNutritionView (con checkins y flags completos)
                const MEAL_LABEL: Record<MealType, { label: string; emoji: string }> = {
                  desayuno:      { label: 'Desayuno',      emoji: '🌅' },
                  media_mañana:  { label: 'Media mañana',  emoji: '🥐' },
                  almuerzo:      { label: 'Almuerzo',      emoji: '🍽️' },
                  merienda:      { label: 'Merienda',      emoji: '☕' },
                  cena:          { label: 'Cena',          emoji: '🌙' },
                  pre_entreno:   { label: 'Pre-entreno',   emoji: '⚡' },
                  post_entreno:  { label: 'Post-entreno',  emoji: '💪' },
                  snack:         { label: 'Snack',         emoji: '🍎' },
                };
                const showKcal = nutritionPlan.show_calories;
                const showP = nutritionPlan.show_protein;
                const showC = nutritionPlan.show_carbs;
                const showF = nutritionPlan.show_fat;
                return (
                  <div className={`border-t ${cardBorder} px-4 pb-4 pt-3 space-y-3`}>
                    {(nutritionPlan.calories_target || nutritionPlan.protein_g || nutritionPlan.carbs_g || nutritionPlan.fat_g) && (
                      <div className="grid grid-cols-4 gap-2">
                        {showKcal && nutritionPlan.calories_target && (
                          <div className="text-center p-2 rounded-xl bg-orange-500/10">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.calories_target}</p>
                            <p className="text-[10px] text-orange-500">kcal</p>
                          </div>
                        )}
                        {showP && nutritionPlan.protein_g && (
                          <div className="text-center p-2 rounded-xl bg-rose-500/10">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.protein_g}g</p>
                            <p className="text-[10px] text-rose-500">prot</p>
                          </div>
                        )}
                        {showC && nutritionPlan.carbs_g && (
                          <div className="text-center p-2 rounded-xl bg-amber-500/10">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{nutritionPlan.carbs_g}g</p>
                            <p className="text-[10px] text-amber-500">carbs</p>
                          </div>
                        )}
                        {showF && nutritionPlan.fat_g && (
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

                    {nutritionPlan.meals.map((meal) => {
                      const label = MEAL_LABEL[meal.meal_type];
                      return (
                        <div key={meal.id}>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                            {label.emoji} {meal.name || label.label}
                            {meal.time_hint && <span className="ml-2 text-[10px] text-slate-400">{meal.time_hint}</span>}
                          </p>
                          {nutritionPlan.detail_level === 'detailed' && meal.foods.length > 0 ? (
                            <div className="space-y-1">
                              {meal.foods.map((food) => (
                                <div key={food.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                                  <p className="text-sm text-slate-900 dark:text-white font-medium">{food.food_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {food.amount && food.unit && (
                                      <span className="text-[10px] text-slate-400">{food.amount} {food.unit}</span>
                                    )}
                                    {showKcal && food.calories && <span className="text-[10px] text-orange-500 font-medium">{food.calories} kcal</span>}
                                    {showP && food.protein_g && <span className="text-[10px] text-rose-500 font-medium">{food.protein_g}g P</span>}
                                  </div>
                                  {food.notes && <p className="text-[10px] text-slate-400 mt-0.5">{food.notes}</p>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                {showKcal && meal.calories && <span className="text-[10px] text-orange-500 font-medium">{meal.calories} kcal</span>}
                                {showP && meal.protein_g && <span className="text-[10px] text-rose-500 font-medium">{meal.protein_g}g P</span>}
                                {showC && meal.carbs_g && <span className="text-[10px] text-amber-500 font-medium">{meal.carbs_g}g C</span>}
                                {showF && meal.fat_g && <span className="text-[10px] text-cyan-500 font-medium">{meal.fat_g}g G</span>}
                              </div>
                              {meal.notes && <p className="text-[10px] text-slate-400 mt-1">{meal.notes}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Medidas corporales ────────────────────────────────────────── */}
          {measurements.length > 0 && (() => {
            const latestM = measurements[0];
            const previousM = measurements.length > 1 ? measurements[1] : null;

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

            const filledFields = measureFields.filter((f) => latestM[f.key] !== null);
            if (filledFields.length === 0) return null;

            return (
              <div className={`${cardSecondary} overflow-hidden`}>
                <button
                  onClick={() => setShowMeasurements((v) => !v)}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Ruler size={13} className="text-violet-500 shrink-0" />
                  <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300">Medidas corporales</span>
                  <span className="text-[10px] text-slate-400 mr-1">
                    {new Date(latestM.measured_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </span>
                  <ChevronRight
                    size={14}
                    className={`text-slate-400 dark:text-slate-600 transition-transform ${showMeasurements ? "rotate-90" : ""}`}
                  />
                </button>

                {showMeasurements && (
                  <div className={`border-t ${cardBorder}`}>
                    <div className={`divide-y ${cardDivider}`}>
                      {filledFields.map((f) => {
                        const val = latestM[f.key] as number;
                        const prevVal = previousM ? (previousM[f.key] as number | null) : null;
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

          {/* ── Historial de sesiones ─────────────────────────────────────── */}
          <div className={`${cardSecondary} overflow-hidden`}>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <History size={13} className="text-violet-500 shrink-0" />
              <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300">Historial</span>
              <span className="text-[10px] text-slate-400 mr-1">
                {recentSessions.length > 0
                  ? `${recentSessions.length} sesion${recentSessions.length !== 1 ? "es" : ""}`
                  : "Sin sesiones"}
              </span>
              <ChevronRight
                size={14}
                className={`text-slate-400 dark:text-slate-600 transition-transform ${showHistory ? "rotate-90" : ""}`}
              />
            </button>

            {showHistory && (
              <div className={`border-t ${cardBorder}`}>
                {recentSessions.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-slate-400 dark:text-slate-600">Cuando completes entrenamientos van a aparecer acá.</p>
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
                            <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                              isCompleted ? "bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800"
                            }`}>
                              {isCompleted
                                ? <CheckCircle2 size={14} className="text-emerald-500" />
                                : <Circle size={14} className="text-slate-400 dark:text-slate-600" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{session.plan_name}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{dayName} {dateStr}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                            }`}>
                              {isCompleted ? "Completa" : "Parcial"}
                            </span>
                          </div>
                          {(vol > 0 || dur > 0) && (
                            <div className="ml-10 flex gap-3">
                              {dur > 0 && <span className="text-[11px] text-slate-400 dark:text-slate-500">{dur} min</span>}
                              {vol > 0 && <span className="text-[11px] text-slate-400 dark:text-slate-500">{vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)}kg`} vol.</span>}
                            </div>
                          )}
                          {session.pt_notes && (
                            <p className="ml-10 text-[11px] text-violet-500 dark:text-violet-400 italic line-clamp-2">
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

          {/* ── Fotos de progreso (upload section, collapsed) ─────────────── */}
          {photosLoaded && (
            <div className={`${cardSecondary} overflow-hidden`}>
              {/* Upload button / form — only if no photo shown in evolution already, or to add more */}
              {!showPhotoUpload ? (
                <button
                  onClick={() => setShowPhotoUpload(true)}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Camera size={13} className="text-violet-500 shrink-0" />
                  <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300">Subir foto de progreso</span>
                  {photos.length > 0 && (
                    <span className="text-[10px] text-slate-400 mr-1">{photos.length} foto{photos.length !== 1 ? "s" : ""}</span>
                  )}
                  <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
                </button>
              ) : (
                <div className="px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-violet-500 uppercase tracking-wider">Nueva foto</p>
                    <button onClick={() => { setShowPhotoUpload(false); setPhotoFile(null); setPhotoPreview(null); }}>
                      <X size={16} className="text-slate-400" />
                    </button>
                  </div>

                  {photoPreview ? (
                    <div className="relative max-w-xs mx-auto">
                      <img src={photoPreview} alt="Preview" className="w-full aspect-[3/4] object-cover rounded-xl" />
                      <button
                        onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="block w-full aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-violet-400 transition-colors">
                      <Camera size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="text-sm text-slate-400">Tocá para seleccionar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f && f.type.startsWith("image/")) {
                            setPhotoFile(f);
                            setPhotoPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  )}

                  <div className="grid grid-cols-4 gap-1.5">
                    {(["front", "side_left", "side_right", "back"] as PhotoAngle[]).map(a => (
                      <button
                        key={a}
                        onClick={() => setPhotoAngle(a)}
                        className={`py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                          photoAngle === a
                            ? "bg-violet-500 text-white"
                            : `${subtleBg} text-slate-500`
                        }`}
                      >
                        {ANGLE_LABELS[a]}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowPhotoUpload(false); setPhotoFile(null); setPhotoPreview(null); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold ${subtleBg} ${textSecondary}`}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePhotoUpload}
                      disabled={photoUploading || !photoFile}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-violet-500 text-white disabled:opacity-50"
                    >
                      {photoUploading ? "Subiendo..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery inline if photos exist and upload form closed */}
              {!showPhotoUpload && photos.length > 0 && (
                <div className={`border-t ${cardBorder} px-4 pb-4 pt-3`}>
                  {photos.length >= 2 && (
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
                        className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
                          compareMode
                            ? "bg-violet-500 text-white"
                            : `${subtleBg} text-slate-500 hover:text-violet-500`
                        }`}
                      >
                        {compareMode ? "Salir de comparar" : "Comparar"}
                      </button>
                    </div>
                  )}

                  {compareMode && !(compareA && compareB) && (
                    <p className={`text-xs text-center py-2 ${textSecondary}`}>
                      {!compareA
                        ? "Seleccioná la primera foto (antes)"
                        : "Ahora seleccioná la segunda foto (después)"}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-1.5">
                    {photos.map(photo => {
                      const isSelectedA = compareA?.id === photo.id;
                      const isSelectedB = compareB?.id === photo.id;
                      return (
                        <div
                          key={photo.id}
                          className={`relative group rounded-xl overflow-hidden cursor-pointer ${
                            isSelectedA ? "ring-2 ring-violet-500" : isSelectedB ? "ring-2 ring-emerald-500" : ""
                          }`}
                          onClick={compareMode ? () => handleCompareSelect(photo) : () => setFullscreenPhoto(photo)}
                        >
                          <img
                            src={photo.photo_url}
                            alt={ANGLE_LABELS[photo.angle]}
                            className="w-full aspect-square object-cover"
                          />
                          <span className="absolute bottom-1 left-1 text-[7px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-full">
                            {ANGLE_LABELS[photo.angle]}
                          </span>
                          {(isSelectedA || isSelectedB) && (
                            <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${
                              isSelectedA ? "bg-violet-500" : "bg-emerald-500"
                            }`}>
                              {isSelectedA ? "1" : "2"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        {/* END ZONA 5 */}

        <div className="h-4" />
      </div>

      {/* ── Fullscreen comparator ─────────────────────────────────────────── */}
      {compareA && compareB && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80">
            <h3 className="text-white text-sm font-bold">Comparativa</h3>
            <button
              onClick={() => { setCompareA(null); setCompareB(null); setCompareMode(false); }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden items-center justify-center">
            <div className="flex-1 w-full max-w-4xl grid grid-cols-2 gap-[2px] bg-black">
              {[compareA, compareB].map((photo, i) => (
                <div key={photo.id} className="relative flex flex-col h-full">
                  <div className={`py-2 text-center ${i === 0 ? "bg-violet-500/20" : "bg-emerald-500/20"}`}>
                    <p className={`text-xs font-black uppercase tracking-wider ${i === 0 ? "text-violet-400" : "text-emerald-400"}`}>
                      {i === 0 ? "Antes" : "Después"}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {new Date(photo.photo_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <img src={photo.photo_url} alt={ANGLE_LABELS[photo.angle]} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] font-bold bg-black/60 text-white px-2.5 py-1 rounded-full">
                      {ANGLE_LABELS[photo.angle]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-4 bg-black/80">
            <button
              onClick={() => { setCompareA(null); setCompareB(null); }}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
            >
              Elegir otras fotos
            </button>
          </div>
        </div>
      )}

      {/* ── Fullscreen photo viewer ───────────────────────────────────────── */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white z-10" onClick={() => setFullscreenPhoto(null)}>
            <X size={20} />
          </button>
          <img
            src={fullscreenPhoto.photo_url}
            alt={ANGLE_LABELS[fullscreenPhoto.angle]}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white text-sm font-bold">{ANGLE_LABELS[fullscreenPhoto.angle]}</p>
            <p className="text-white/60 text-xs">
              {new Date(fullscreenPhoto.photo_date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      )}

      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, exerciseName: "", videoUrl: "" })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
}
