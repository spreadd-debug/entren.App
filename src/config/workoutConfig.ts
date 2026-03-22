// ── Workout Staleness Configuration ───────────────────────────────────────────
// Centraliza los umbrales de "antigüedad de rutina" para que no estén
// hardcodeados en múltiples componentes.

export const WORKOUT_STALENESS_DAYS = {
  /** Rutina reciente: verde  (0 – FRESH días) */
  FRESH: 14,
  /** Rutina que empieza a quedar vieja: naranja  (FRESH+1 – STALE días) */
  STALE: 30,
  /** Más de STALE días: roja */
} as const;

export type WorkoutFreshnessLevel = 'fresh' | 'stale' | 'outdated' | 'none';

export interface WorkoutFreshness {
  level: WorkoutFreshnessLevel;
  daysOld: number | null;
  /** Texto corto para mostrar en badges  (ej. "8d", "Hoy", "Sin fecha") */
  label: string;
  colorClass: string;
  dotClass: string;
  bgClass: string;
  borderClass: string;
}

/**
 * Calcula el estado de frescura de una rutina a partir de su fecha de
 * última actualización.  Usá esta función en lugar de duplicar la lógica
 * en cada componente.
 */
export function getWorkoutFreshness(updatedAt: string | null | undefined): WorkoutFreshness {
  if (!updatedAt) {
    return {
      level: 'none',
      daysOld: null,
      label: 'Sin fecha',
      colorClass: 'text-slate-500 dark:text-slate-400',
      dotClass: 'bg-slate-400',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      borderClass: 'border-slate-200 dark:border-slate-700',
    };
  }

  const daysOld = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysOld <= WORKOUT_STALENESS_DAYS.FRESH) {
    return {
      level: 'fresh',
      daysOld,
      label: daysOld === 0 ? 'Hoy' : `${daysOld}d`,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20',
    };
  }

  if (daysOld <= WORKOUT_STALENESS_DAYS.STALE) {
    return {
      level: 'stale',
      daysOld,
      label: `${daysOld}d`,
      colorClass: 'text-amber-600 dark:text-amber-400',
      dotClass: 'bg-amber-500',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20',
    };
  }

  return {
    level: 'outdated',
    daysOld,
    label: `${daysOld}d`,
    colorClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/20',
  };
}
