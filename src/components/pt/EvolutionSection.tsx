import { useState, useEffect } from "react";
import {
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Trophy,
  Activity,
  Maximize2,
  X,
} from "lucide-react";
import { supabase } from "../../db/supabase";
import { ClientAnthropometry, ClientGoal } from "../../../shared/types";
import { ProgressPhoto, PhotoAngle } from "../../../shared/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PersonalRecord {
  exerciseName: string;
  weightKg: number;
  daysAgo: number;
}

export interface EvolutionSectionProps {
  studentId: string;
  anthropometry: ClientAnthropometry[];
  goals: ClientGoal[];
  photos: ProgressPhoto[];
  onPhotoClick?: (photo: ProgressPhoto) => void;
  onCompareClick?: () => void;
}

// ─── Angle labels ───────────────────────────────────────────────────────────

const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: "Frente",
  side_left: "Lat. izq.",
  side_right: "Lat. der.",
  back: "Espalda",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function EvolutionSection({
  studentId,
  anthropometry,
  goals,
  photos,
  onPhotoClick,
  onCompareClick,
}: EvolutionSectionProps) {
  const [pr, setPr] = useState<PersonalRecord | null>(null);
  const [showChart, setShowChart] = useState(false);

  // ─── Fetch recent PR ────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        // Get recent completed sessions
        const { data: sessions } = await supabase
          .from("workout_sessions")
          .select("id, session_date")
          .eq("student_id", studentId)
          .eq("status", "completed")
          .gte("session_date", twoWeeksAgo.toISOString().split("T")[0])
          .order("session_date", { ascending: false })
          .limit(10);

        if (!sessions?.length) return;

        // Get exercises from those sessions
        const sessionIds = sessions.map((s) => s.id);
        const { data: exercises } = await supabase
          .from("workout_session_exercises")
          .select("id, session_id, workout_exercises(exercise_name)")
          .in("session_id", sessionIds);

        if (!exercises?.length) return;

        const exerciseIds = exercises.map((e: any) => e.id);
        const { data: sets } = await supabase
          .from("session_sets")
          .select("session_exercise_id, weight_kg")
          .in("session_exercise_id", exerciseIds)
          .not("weight_kg", "is", null)
          .order("weight_kg", { ascending: false })
          .limit(1);

        if (!sets?.length || !sets[0].weight_kg) return;

        const bestSet = sets[0];
        const exercise = exercises.find(
          (e: any) => e.id === bestSet.session_exercise_id
        );
        if (!exercise) return;

        const session = sessions.find((s) =>
          exercises.some(
            (e: any) =>
              e.id === bestSet.session_exercise_id && e.session_id === s.id
          )
        );
        const daysAgo = session
          ? Math.floor(
              (Date.now() -
                new Date(session.session_date + "T12:00:00").getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        setPr({
          exerciseName:
            (exercise as any).workout_exercises?.exercise_name ?? "Ejercicio",
          weightKg: bestSet.weight_kg,
          daysAgo,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [studentId]);

  // ─── Derived data ───────────────────────────────────────────────────────

  const activeGoal = goals.find((g) => g.status === "active");
  const goalType = activeGoal?.goal_type;
  const isMuscleFocus = goalType === "gain_muscle" || goalType === "strength";

  const latest = anthropometry.length > 0 ? anthropometry[0] : null;
  const previous = anthropometry.length > 1 ? anthropometry[1] : null;
  const hasTrend = !!previous;

  // Metric helpers
  const computeDiff = (a: number | null, b: number | null) =>
    a !== null && b !== null ? Math.round((a - b) * 10) / 10 : null;

  const weightDiff = computeDiff(latest?.weight_kg ?? null, previous?.weight_kg ?? null);
  const fatDiff = computeDiff(latest?.body_fat_pct ?? null, previous?.body_fat_pct ?? null);
  const muscleDiff = computeDiff(latest?.muscle_mass_kg ?? null, previous?.muscle_mass_kg ?? null);

  // Is trend good? (per goal)
  const isTrendGoodFor = (diff: number | null, invertedBetter: boolean) => {
    if (diff === null || diff === 0) return null;
    return invertedBetter ? diff < 0 : diff > 0;
  };

  const weightGood = isTrendGoodFor(weightDiff, goalType !== "gain_muscle");
  const fatGood = isTrendGoodFor(fatDiff, true);
  const muscleGood = isTrendGoodFor(muscleDiff, false);

  // Sparkline data (weight)
  const chartData = anthropometry
    .filter((a) => a.weight_kg !== null)
    .slice(0, 12)
    .reverse();
  const weights = chartData.map((a) => a.weight_kg!);
  const minW = weights.length > 0 ? Math.min(...weights) - 1 : 0;
  const maxW = weights.length > 0 ? Math.max(...weights) + 1 : 1;
  const wRange = maxW - minW || 1;

  // Photo data
  const sortedPhotos = [...photos].sort(
    (a, b) => new Date(a.photo_date).getTime() - new Date(b.photo_date).getTime()
  );
  const firstPhoto = sortedPhotos.length > 0 ? sortedPhotos[0] : null;
  const lastPhoto =
    sortedPhotos.length > 1 ? sortedPhotos[sortedPhotos.length - 1] : null;

  // ─── If no data at all, don't render ────────────────────────────────────
  if (!latest) return null;

  // ─── Metric card helper ─────────────────────────────────────────────────
  const MetricCard = ({
    value,
    unit,
    diff,
    isGood,
  }: {
    value: number | null;
    unit: string;
    diff: number | null;
    isGood: boolean | null;
  }) => {
    const bg =
      diff === null || diff === 0
        ? "bg-white dark:bg-slate-800/80"
        : isGood
          ? "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14]"
          : "bg-rose-500/[0.08] dark:bg-rose-500/[0.14]";

    const borderColor =
      diff === null || diff === 0
        ? "border-slate-100 dark:border-slate-700/50"
        : isGood
          ? "border-emerald-500/20 dark:border-emerald-500/20"
          : "border-rose-500/20 dark:border-rose-500/20";

    return (
      <div
        className={`${bg} border ${borderColor} rounded-2xl p-3 text-center transition-all`}
      >
        <p className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
          {value ?? "—"}
        </p>
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
          {unit}
        </p>
        {hasTrend && diff !== null && diff !== 0 ? (
          <div
            className={`flex items-center justify-center gap-0.5 mt-1.5 text-[11px] font-bold ${
              isGood ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {diff < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            {diff > 0 ? "+" : ""}
            {diff}
          </div>
        ) : !hasTrend ? (
          <p className="text-[9px] font-medium text-violet-400 dark:text-violet-500 mt-1.5">
            Punto de partida
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/[0.06] via-violet-500/[0.03] to-indigo-500/[0.04] dark:from-violet-500/[0.12] dark:via-violet-500/[0.06] dark:to-indigo-500/[0.08] border border-violet-200/60 dark:border-violet-500/20 shadow-lg shadow-violet-500/[0.06] dark:shadow-violet-500/[0.08]">
      {/* Section header */}
      <div className="px-5 pt-5 pb-1 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-violet-500/15">
          <Activity size={14} className="text-violet-500" />
        </div>
        <h2 className="text-sm font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">
          Tu evolución
        </h2>
      </div>

      {/* ─── Metrics ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-2">
        <div className="grid grid-cols-3 gap-2.5">
          <MetricCard
            value={latest.weight_kg}
            unit="kg"
            diff={weightDiff}
            isGood={weightGood}
          />
          <MetricCard
            value={latest.body_fat_pct}
            unit="% grasa"
            diff={fatDiff}
            isGood={fatGood}
          />
          <MetricCard
            value={latest.muscle_mass_kg}
            unit="kg músc."
            diff={muscleDiff}
            isGood={muscleGood}
          />
        </div>

        {/* IMC inline */}
        {latest.bmi && (
          <div className="flex items-center justify-center gap-2 mt-2.5">
            <span className="text-[10px] text-slate-400">IMC</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                latest.bmi < 18.5
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : latest.bmi < 25
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : latest.bmi < 30
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {latest.bmi}{" "}
              {latest.bmi < 18.5
                ? "Bajo peso"
                : latest.bmi < 25
                  ? "Normal"
                  : latest.bmi < 30
                    ? "Sobrepeso"
                    : "Obesidad"}
            </span>
          </div>
        )}
      </div>

      {/* ─── Sparkline / Chart ────────────────────────────────────────── */}
      {chartData.length >= 2 ? (
        <div className="px-5 pb-2">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="w-full group"
          >
            {!showChart ? (
              /* Compact sparkline with gradient fill */
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden rounded-xl bg-white/50 dark:bg-slate-800/40 px-3 py-2">
                  <svg
                    viewBox="0 0 240 48"
                    className="w-full h-10"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="sparkFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="currentColor"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="currentColor"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const pts = weights.map((w, i) => {
                        const x = (i / (weights.length - 1)) * 240;
                        const y =
                          46 - ((w - minW) / wRange) * 40 - 2;
                        return `${x},${y}`;
                      });
                      return (
                        <>
                          <path
                            d={`M${pts.join(" L")} L240,48 L0,48 Z`}
                            className="text-violet-400"
                            fill="url(#sparkFill)"
                          />
                          <polyline
                            points={pts.join(" ")}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-violet-500"
                          />
                          {/* Dots at start and end */}
                          {[0, weights.length - 1].map((i) => {
                            const x =
                              (i / (weights.length - 1)) * 240;
                            const y =
                              46 -
                              ((weights[i] - minW) / wRange) * 40 -
                              2;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="3.5"
                                className="fill-violet-500"
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <ChevronRight
                  size={14}
                  className="text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-violet-400 transition-colors"
                />
              </div>
            ) : (
              /* Expanded chart */
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-violet-400 dark:text-violet-500 uppercase tracking-wider">
                    Evolución de peso
                  </p>
                  <ChevronRight
                    size={14}
                    className="text-slate-400 rotate-90"
                  />
                </div>
                <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl p-3">
                  <svg viewBox="0 0 300 120" className="w-full h-auto">
                    {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                      <line
                        key={pct}
                        x1="30"
                        y1={10 + (1 - pct) * 90}
                        x2="290"
                        y2={10 + (1 - pct) * 90}
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-slate-200 dark:text-slate-700"
                      />
                    ))}
                    {[0, 0.5, 1].map((pct) => (
                      <text
                        key={pct}
                        x="27"
                        y={10 + (1 - pct) * 90 + 3}
                        textAnchor="end"
                        className="fill-slate-400 dark:fill-slate-500"
                        fontSize="8"
                      >
                        {Math.round(minW + pct * wRange)}
                      </text>
                    ))}
                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(139, 92, 246)"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(139, 92, 246)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M${chartData
                        .map((_, i) => {
                          const x = 30 + (i / (chartData.length - 1)) * 260;
                          const y =
                            10 +
                            (1 - (weights[i] - minW) / wRange) * 90;
                          return `${x},${y}`;
                        })
                        .join(" L")} L${30 + 260},100 L30,100 Z`}
                      fill="url(#chartFill)"
                    />
                    <polyline
                      points={chartData
                        .map((_, i) => {
                          const x = 30 + (i / (chartData.length - 1)) * 260;
                          const y =
                            10 +
                            (1 - (weights[i] - minW) / wRange) * 90;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-violet-500"
                    />
                    {chartData.map((entry, i) => {
                      const x = 30 + (i / (chartData.length - 1)) * 260;
                      const y =
                        10 + (1 - (weights[i] - minW) / wRange) * 90;
                      return (
                        <g key={entry.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            className="fill-violet-500"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="2"
                            className="fill-white dark:fill-slate-800"
                          />
                          {(i === 0 || i === chartData.length - 1) && (
                            <text
                              x={x}
                              y={y - 8}
                              textAnchor="middle"
                              className="fill-slate-600 dark:fill-slate-300"
                              fontSize="9"
                              fontWeight="bold"
                            >
                              {weights[i]}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {chartData.map((entry, i) => {
                      if (
                        chartData.length > 5 &&
                        i % 2 !== 0 &&
                        i !== chartData.length - 1
                      )
                        return null;
                      const x = 30 + (i / (chartData.length - 1)) * 260;
                      const d = new Date(entry.measured_at + "T12:00:00");
                      return (
                        <text
                          key={entry.id + "_label"}
                          x={x}
                          y={112}
                          textAnchor="middle"
                          className="fill-slate-400 dark:fill-slate-500"
                          fontSize="7"
                        >
                          {d.toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </button>
        </div>
      ) : (
        /* Single measurement — placeholder for future chart */
        <div className="px-5 pb-2">
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/40 dark:bg-slate-800/30 border border-dashed border-violet-200/60 dark:border-violet-500/15">
            <Activity size={14} className="text-violet-300 dark:text-violet-600" />
            <p className="text-[11px] text-violet-400 dark:text-violet-500/70 font-medium">
              Tu progreso va a aparecer acá
            </p>
          </div>
        </div>
      )}

      {/* ─── PR Badge ─────────────────────────────────────────────────── */}
      {pr && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/[0.1] to-orange-500/[0.06] dark:from-amber-500/[0.15] dark:to-orange-500/[0.1] border border-amber-400/20 dark:border-amber-500/15">
            <Trophy
              size={16}
              className="text-amber-500 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                PR {pr.exerciseName}: {pr.weightKg} kg
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400/70 font-medium">
                {pr.daysAgo === 0
                  ? "¡Hoy!"
                  : pr.daysAgo === 1
                    ? "Ayer"
                    : `Hace ${pr.daysAgo} días`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Before / After Photos ────────────────────────────────────── */}
      {firstPhoto && lastPhoto ? (
        /* 2+ photos: before / after mini comparison */
        <div className="px-5 pb-4 pt-1">
          <div className="flex items-center gap-3">
            {/* Before photo */}
            <div
              className="flex-1 cursor-pointer group"
              onClick={() => onPhotoClick?.(firstPhoto)}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-md shadow-slate-900/10 dark:shadow-black/30 ring-1 ring-white/60 dark:ring-slate-700/50 aspect-[3/4]">
                <img
                  src={firstPhoto.photo_url}
                  alt={ANGLE_LABELS[firstPhoto.angle]}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6">
                  <p className="text-[10px] font-black text-white/90 uppercase tracking-wider">
                    Antes
                  </p>
                  <p className="text-[9px] text-white/60">
                    {new Date(firstPhoto.photo_date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* After photo */}
            <div
              className="flex-1 cursor-pointer group"
              onClick={() => onPhotoClick?.(lastPhoto)}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-md shadow-slate-900/10 dark:shadow-black/30 ring-1 ring-white/60 dark:ring-slate-700/50 aspect-[3/4]">
                <img
                  src={lastPhoto.photo_url}
                  alt={ANGLE_LABELS[lastPhoto.angle]}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6">
                  <p className="text-[10px] font-black text-white/90 uppercase tracking-wider">
                    Ahora
                  </p>
                  <p className="text-[9px] text-white/60">
                    {new Date(lastPhoto.photo_date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Compare button */}
            <button
              onClick={onCompareClick}
              className="shrink-0 flex flex-col items-center gap-1 px-2 py-3 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <Maximize2 size={16} className="text-violet-400" />
              <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400">
                Comparar
              </span>
            </button>
          </div>
        </div>
      ) : firstPhoto ? (
        /* Single photo — show it nicely */
        <div className="px-5 pb-4 pt-1">
          <div className="flex items-center gap-4">
            <div
              className="shrink-0 cursor-pointer group"
              onClick={() => onPhotoClick?.(firstPhoto)}
              style={{ width: 72, height: 96 }}
            >
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-md shadow-slate-900/10 dark:shadow-black/30 ring-1 ring-white/60 dark:ring-slate-700/50">
                <img
                  src={firstPhoto.photo_url}
                  alt={ANGLE_LABELS[firstPhoto.angle]}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Última foto
              </p>
              <p className="text-[10px] text-slate-400">
                {new Date(firstPhoto.photo_date).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {ANGLE_LABELS[firstPhoto.angle]}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {photos.length} foto{photos.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── Last measurement date ────────────────────────────────────── */}
      <p className="text-[10px] text-violet-400/60 dark:text-violet-500/40 text-center pb-4 px-5">
        Última medición:{" "}
        {new Date(latest.measured_at + "T12:00:00").toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
