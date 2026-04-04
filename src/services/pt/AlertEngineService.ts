import { PTSessionService } from './PTSessionService';
import { WellnessCheckInService } from './WellnessCheckInService';
import { AnthropometryService } from './AnthropometryService';
import { GoalsService } from './GoalsService';
import type { PTSessionFull } from './PTSessionService';
import type {
  Student,
  StudentAlert,
  StudentSemaphore,
  SemaphoreColor,
  AlertSeverity,
  WellnessCheckIn,
  ClientAnthropometry,
  ClientGoal,
  WorkoutSession,
  SessionSet,
} from '../../../shared/types';

// ─── Thresholds ────────────────────────────────────────────────────────────

const PROGRESSION_SESSIONS_TO_SUGGEST = 3;
const STAGNATION_SESSIONS_THRESHOLD = 4;
const VOLUME_INCREASE_PCT_WARN = 20;
const VOLUME_DECREASE_PCT_WARN = 15;
const SLEEP_DANGER_THRESHOLD = 2.5;
const SORENESS_WARN_THRESHOLD = 3.5;
const ENERGY_WARN_THRESHOLD = 2.5;
const MOOD_DANGER_THRESHOLD = 2;
const INACTIVITY_WARN_DAYS = 7;
const INACTIVITY_DANGER_DAYS = 14;
const GOAL_CLOSE_KG = 2;
const BODY_STAGNATION_READINGS = 3;

// ─── Helpers ───────────────────────────────────────────────────────────────

function alertId(category: string, key: string): string {
  return `${category}:${key}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE');
}

/** Group sessions by exercise, returning per-exercise history */
function groupByExercise(
  sessions: PTSessionFull[],
): Map<string, Array<{ date: string; sets: SessionSet[]; exerciseName: string }>> {
  const map = new Map<string, Array<{ date: string; sets: SessionSet[]; exerciseName: string }>>();

  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (!ex.sets_data.length) continue;
      const key = ex.workout_exercise_id;
      const arr = map.get(key) ?? [];
      arr.push({
        date: s.session.session_date,
        sets: ex.sets_data,
        exerciseName: ex.exercise_name,
      });
      map.set(key, arr);
    }
  }

  return map;
}

/** Max weight used in a set array */
function maxWeight(sets: SessionSet[]): number {
  return sets.reduce((m, s) => Math.max(m, s.weight_kg ?? 0), 0);
}

/** Whether all planned reps were completed (no failed sets) */
function allRepsCompleted(sets: SessionSet[]): boolean {
  return sets.every((s) => s.completed && (s.reps_done ?? 0) > 0);
}

/** Calculate weekly volumes from sessions */
function weeklyVolumes(sessions: PTSessionFull[], weeks: number): number[] {
  const now = new Date();
  const result: number[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekStartStr = weekStart.toLocaleDateString('sv-SE');
    const weekEndStr = weekEnd.toLocaleDateString('sv-SE');

    let vol = 0;
    for (const s of sessions) {
      if (s.session.session_date >= weekStartStr && s.session.session_date <= weekEndStr) {
        vol += s.session.total_volume ?? 0;
      }
    }
    result.push(vol);
  }

  return result; // index 0 = current week, index 1 = last week, etc.
}

/** Sessions per week count */
function weeklyFrequency(sessions: PTSessionFull[], weeks: number): number[] {
  const now = new Date();
  const result: number[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekStartStr = weekStart.toLocaleDateString('sv-SE');
    const weekEndStr = weekEnd.toLocaleDateString('sv-SE');

    let count = 0;
    for (const s of sessions) {
      if (s.session.session_date >= weekStartStr && s.session.session_date <= weekEndStr) {
        count++;
      }
    }
    result.push(count);
  }

  return result;
}

// ─── Rule Functions ────────────────────────────────────────────────────────

function checkProgression(sessions: PTSessionFull[]): StudentAlert[] {
  const alerts: StudentAlert[] = [];
  const byExercise = groupByExercise(sessions);

  for (const [exId, history] of byExercise) {
    if (history.length < 2) continue;

    const name = history[0].exerciseName;
    // Sort by date desc (most recent first)
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

    // Check for PR (latest session has max weight ever)
    const latestMax = maxWeight(sorted[0].sets);
    const historicalMax = Math.max(...sorted.slice(1).map((h) => maxWeight(h.sets)));
    if (latestMax > historicalMax && latestMax > 0) {
      alerts.push({
        id: alertId('progression', `pr:${exId}`),
        category: 'progression',
        severity: 'success',
        message: `Nuevo PR en ${name}: ${latestMax}kg`,
        data: { exerciseName: name, weight: latestMax },
      });
    }

    // Check same weight + completed all reps → ready to increase
    const recentSameWeight = sorted.filter(
      (h) => maxWeight(h.sets) === latestMax && allRepsCompleted(h.sets),
    );
    if (
      recentSameWeight.length >= PROGRESSION_SESSIONS_TO_SUGGEST &&
      latestMax > 0 &&
      latestMax <= historicalMax // not a PR — already tracked above
    ) {
      alerts.push({
        id: alertId('progression', `ready:${exId}`),
        category: 'progression',
        severity: 'info',
        message: `${name}: completo todas las reps con ${latestMax}kg las ultimas ${recentSameWeight.length} sesiones. Listo para subir.`,
        data: { exerciseName: name, weight: latestMax, sessions: recentSameWeight.length },
      });
    }

    // Check stagnation: same weight 4+ sessions and NOT completing all reps
    const sameWeightCount = sorted.filter(
      (h) => maxWeight(h.sets) === latestMax,
    ).length;
    if (sameWeightCount >= STAGNATION_SESSIONS_THRESHOLD && !allRepsCompleted(sorted[0].sets)) {
      alerts.push({
        id: alertId('progression', `stagnation:${exId}`),
        category: 'progression',
        severity: 'warning',
        message: `${name}: mismo peso (${latestMax}kg) hace ${sameWeightCount} sesiones. Posible estancamiento.`,
        data: { exerciseName: name, weight: latestMax, sessions: sameWeightCount },
      });
    }
  }

  return alerts;
}

function checkVolumeTrends(sessions: PTSessionFull[]): StudentAlert[] {
  const alerts: StudentAlert[] = [];
  const volumes = weeklyVolumes(sessions, 4);

  // volumes[0] = current week, volumes[1] = last week, etc.
  // Check 3-week increasing trend > 20%
  if (volumes[2] > 0 && volumes[0] > 0) {
    const pctIncrease = ((volumes[0] - volumes[2]) / volumes[2]) * 100;
    if (pctIncrease > VOLUME_INCREASE_PCT_WARN) {
      alerts.push({
        id: alertId('volume', 'overload'),
        category: 'volume',
        severity: 'warning',
        message: `Volumen semanal subio ${Math.round(pctIncrease)}% en 3 semanas. Considerar semana de descarga.`,
        data: { pctIncrease: Math.round(pctIncrease), volumes },
      });
    }
  }

  // Check decline vs last month average
  const recentAvg = volumes[0];
  const pastAvg = volumes.slice(1).reduce((a, b) => a + b, 0) / Math.max(volumes.length - 1, 1);
  if (pastAvg > 0 && recentAvg > 0) {
    const pctDecrease = ((pastAvg - recentAvg) / pastAvg) * 100;
    if (pctDecrease > VOLUME_DECREASE_PCT_WARN) {
      alerts.push({
        id: alertId('volume', 'decline'),
        category: 'volume',
        severity: 'info',
        message: `Volumen semanal bajo ${Math.round(pctDecrease)}% respecto al promedio del ultimo mes.`,
        data: { pctDecrease: Math.round(pctDecrease) },
      });
    }
  }

  return alerts;
}

function checkWellness(
  averages: { energy: number; sleep_quality: number; mood: number; soreness: number; count: number },
): StudentAlert[] {
  const alerts: StudentAlert[] = [];

  if (averages.count === 0) return alerts;

  if (averages.sleep_quality > 0 && averages.sleep_quality < SLEEP_DANGER_THRESHOLD) {
    alerts.push({
      id: alertId('wellness', 'sleep'),
      category: 'wellness',
      severity: 'danger',
      message: `Promedio de sueno esta semana: ${averages.sleep_quality}/5 (bajo). Considerar bajar intensidad.`,
      data: { avg: averages.sleep_quality },
    });
  }

  if (averages.soreness > SORENESS_WARN_THRESHOLD) {
    alerts.push({
      id: alertId('wellness', 'soreness'),
      category: 'wellness',
      severity: 'warning',
      message: `Dolor muscular alto esta semana (${averages.soreness}/5). Posible sobreentrenamiento.`,
      data: { avg: averages.soreness },
    });
  }

  if (averages.energy > 0 && averages.energy < ENERGY_WARN_THRESHOLD) {
    alerts.push({
      id: alertId('wellness', 'energy'),
      category: 'wellness',
      severity: 'warning',
      message: `Energia baja esta semana (${averages.energy}/5). Considerar bajar volumen.`,
      data: { avg: averages.energy },
    });
  }

  if (averages.mood > 0 && averages.mood < MOOD_DANGER_THRESHOLD) {
    alerts.push({
      id: alertId('wellness', 'mood'),
      category: 'wellness',
      severity: 'danger',
      message: `Animo muy bajo esta semana (${averages.mood}/5).`,
      data: { avg: averages.mood },
    });
  }

  return alerts;
}

function checkBodyVsGoals(
  anthro: ClientAnthropometry[],
  goals: ClientGoal[],
): StudentAlert[] {
  const alerts: StudentAlert[] = [];
  const activeGoals = goals.filter((g) => g.status === 'active');
  if (!activeGoals.length || anthro.length < 1) return alerts;

  const sorted = [...anthro].sort(
    (a, b) => b.measured_at.localeCompare(a.measured_at),
  );
  const latest = sorted[0];

  for (const goal of activeGoals) {
    if (goal.goal_type === 'lose_weight' && latest.weight_kg != null) {
      const targetWeight = parseFloat(goal.target_value ?? '0');

      // Close to goal
      if (targetWeight > 0 && latest.weight_kg - targetWeight <= GOAL_CLOSE_KG && latest.weight_kg >= targetWeight) {
        alerts.push({
          id: alertId('body', `close:${goal.id}`),
          category: 'body',
          severity: 'success',
          message: `A ${(latest.weight_kg - targetWeight).toFixed(1)}kg del objetivo de peso. Esta muy cerca!`,
          data: { current: latest.weight_kg, target: targetWeight },
        });
      }

      // Weight going wrong direction
      if (sorted.length >= 2 && sorted[1].weight_kg != null) {
        const prevWeight = sorted[1].weight_kg;
        if (latest.weight_kg > prevWeight) {
          alerts.push({
            id: alertId('body', `wrong_dir:${goal.id}`),
            category: 'body',
            severity: 'warning',
            message: `Peso corporal subio ${(latest.weight_kg - prevWeight).toFixed(1)}kg pero el objetivo es bajar.`,
            data: { current: latest.weight_kg, previous: prevWeight },
          });
        }
      }

      // Stagnation
      if (sorted.length >= BODY_STAGNATION_READINGS) {
        const weights = sorted.slice(0, BODY_STAGNATION_READINGS).map((a) => a.weight_kg ?? 0);
        const range = Math.max(...weights) - Math.min(...weights);
        if (range < 0.5 && weights[0] > 0) {
          alerts.push({
            id: alertId('body', `stagnation:${goal.id}`),
            category: 'body',
            severity: 'warning',
            message: `Peso sin cambios en las ultimas ${BODY_STAGNATION_READINGS} mediciones. Revisar plan nutricional.`,
            data: { weights },
          });
        }
      }
    }

    if (goal.goal_type === 'gain_muscle' && latest.muscle_mass_kg != null) {
      if (sorted.length >= 2 && sorted[1].muscle_mass_kg != null) {
        if (latest.muscle_mass_kg < sorted[1].muscle_mass_kg) {
          alerts.push({
            id: alertId('body', `muscle_drop:${goal.id}`),
            category: 'body',
            severity: 'warning',
            message: `Masa muscular bajo de ${sorted[1].muscle_mass_kg}kg a ${latest.muscle_mass_kg}kg. Revisar carga y nutricion.`,
            data: { current: latest.muscle_mass_kg, previous: sorted[1].muscle_mass_kg },
          });
        }
      }
    }
  }

  return alerts;
}

function checkAttendance(sessions: PTSessionFull[]): StudentAlert[] {
  const alerts: StudentAlert[] = [];
  const today = todayStr();

  if (!sessions.length) {
    alerts.push({
      id: alertId('attendance', 'no_sessions'),
      category: 'attendance',
      severity: 'danger',
      message: 'No tiene sesiones registradas.',
      data: {},
    });
    return alerts;
  }

  const lastDate = sessions
    .map((s) => s.session.session_date)
    .sort()
    .reverse()[0];

  const daysSince = daysBetween(lastDate, today);

  if (daysSince >= INACTIVITY_DANGER_DAYS) {
    alerts.push({
      id: alertId('attendance', 'inactive_danger'),
      category: 'attendance',
      severity: 'danger',
      message: `No entrena hace ${daysSince} dias.`,
      data: { daysSince, lastDate },
    });
  } else if (daysSince >= INACTIVITY_WARN_DAYS) {
    alerts.push({
      id: alertId('attendance', 'inactive_warn'),
      category: 'attendance',
      severity: 'warning',
      message: `No entrena hace ${daysSince} dias.`,
      data: { daysSince, lastDate },
    });
  }

  return alerts;
}

function deriveSemaphore(alerts: StudentAlert[]): { color: SemaphoreColor; statusText: string; priorityScore: number } {
  let dangerCount = 0;
  let warningCount = 0;

  for (const a of alerts) {
    if (a.severity === 'danger') dangerCount++;
    if (a.severity === 'warning') warningCount++;
  }

  const priorityScore = dangerCount * 100 + warningCount * 10;

  if (dangerCount > 0) {
    const topAlert = alerts.find((a) => a.severity === 'danger')!;
    return { color: 'red', statusText: topAlert.message, priorityScore };
  }

  if (warningCount > 0) {
    const topAlert = alerts.find((a) => a.severity === 'warning')!;
    return { color: 'yellow', statusText: topAlert.message, priorityScore };
  }

  // Green — pick a success message or default
  const successAlert = alerts.find((a) => a.severity === 'success');
  return {
    color: 'green',
    statusText: successAlert?.message ?? 'Progresando bien',
    priorityScore,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export const AlertEngineService = {

  async getAlertsForStudent(studentId: string, gymId: string): Promise<StudentAlert[]> {
    const results = await Promise.allSettled([
      PTSessionService.getSessionsWithSets(studentId, 15),
      WellnessCheckInService.getAverages(studentId, 7),
      AnthropometryService.getByStudent(studentId),
      GoalsService.getByStudent(studentId),
    ]);

    const sessions = results[0].status === 'fulfilled' ? results[0].value : [];
    const averages = results[1].status === 'fulfilled'
      ? results[1].value
      : { energy: 0, sleep_quality: 0, mood: 0, soreness: 0, count: 0 };
    const anthro = results[2].status === 'fulfilled' ? results[2].value : [];
    const goals = results[3].status === 'fulfilled' ? results[3].value : [];

    const alerts: StudentAlert[] = [
      ...checkProgression(sessions),
      ...checkVolumeTrends(sessions),
      ...checkWellness(averages),
      ...checkBodyVsGoals(anthro, goals),
      ...checkAttendance(sessions),
    ];

    // Sort: danger first, then warning, then info, then success
    const severityOrder: Record<string, number> = { danger: 0, warning: 1, info: 2, success: 3 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

    return alerts;
  },

  async getSemaphoresForStudents(
    students: Student[],
    gymId: string,
  ): Promise<Map<string, StudentSemaphore>> {
    const result = new Map<string, StudentSemaphore>();

    const promises = students.map(async (student) => {
      try {
        const alerts = await this.getAlertsForStudent(student.id, gymId);
        const { color, statusText, priorityScore } = deriveSemaphore(alerts);
        result.set(student.id, { color, statusText, alerts, priorityScore });
      } catch {
        result.set(student.id, {
          color: 'green',
          statusText: 'Sin datos suficientes',
          alerts: [],
          priorityScore: 0,
        });
      }
    });

    await Promise.allSettled(promises);
    return result;
  },

  // Expose helpers for PreSessionService
  weeklyVolumes,
  weeklyFrequency,
  groupByExercise,
  maxWeight,
};
