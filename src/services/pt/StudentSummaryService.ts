import { PTSessionService } from './PTSessionService';
import { WellnessCheckInService } from './WellnessCheckInService';
import { AnthropometryService } from './AnthropometryService';
import { GoalsService } from './GoalsService';
import { AlertEngineService } from './AlertEngineService';

const GOAL_TYPE_LABELS: Record<string, string> = {
  lose_weight: 'Bajar de peso',
  gain_muscle: 'Ganar musculo',
  rehab: 'Rehabilitacion',
  flexibility: 'Flexibilidad',
  endurance: 'Resistencia',
  strength: 'Fuerza',
  general_fitness: 'Fitness general',
  other: 'Otro',
};

// Module-level cache so switching tabs (or re-mounting the card) doesn't
// re-fetch the 4 underlying queries. Invalidated explicitly when client data
// changes (session completed, basic info edited, etc).
const summaryCache = new Map<string, string>();

export const StudentSummaryService = {

  getCached(studentId: string): string | null {
    return summaryCache.get(studentId) ?? null;
  },

  invalidate(studentId: string): void {
    summaryCache.delete(studentId);
  },

  async generateSummary(
    studentId: string,
    gymId: string,
    studentName?: string,
    opts: { force?: boolean } = {},
  ): Promise<string> {
    if (!opts.force) {
      const cached = summaryCache.get(studentId);
      if (cached) return cached;
    }

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

    const sentences: string[] = [];
    const name = studentName ?? 'El alumno';

    // ── Session count + frequency ────────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString('sv-SE');

    const recentSessions = sessions.filter(
      (s) => s.session.session_date >= thirtyDaysAgoStr,
    );
    const sessionCount = recentSessions.length;

    if (sessionCount === 0) {
      sentences.push(`${name} no tiene sesiones registradas en los ultimos 30 dias.`);
    } else {
      const weeksActive = Math.max(1, Math.ceil(
        (Date.now() - thirtyDaysAgo.getTime()) / (7 * 24 * 60 * 60 * 1000),
      ));
      const freqPerWeek = Math.round((sessionCount / weeksActive) * 10) / 10;
      sentences.push(
        `${name} lleva ${sessionCount} sesiones en los ultimos 30 dias, entrenando ~${freqPerWeek} veces por semana.`,
      );
    }

    // ── Progression / Stagnation ─────────────────────────────────────────
    if (sessions.length >= 2) {
      const byExercise = AlertEngineService.groupByExercise(sessions);
      let bestProgression: { name: string; delta: number } | null = null;
      let worstStagnation: { name: string; sessions: number } | null = null;

      for (const [, history] of byExercise) {
        if (history.length < 2) continue;
        const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
        const firstMax = AlertEngineService.maxWeight(sorted[0].sets);
        const lastMax = AlertEngineService.maxWeight(sorted[sorted.length - 1].sets);
        const delta = lastMax - firstMax;

        if (delta > 0 && (!bestProgression || delta > bestProgression.delta)) {
          bestProgression = { name: history[0].exerciseName, delta };
        }

        if (delta === 0 && sorted.length >= 4) {
          if (!worstStagnation || sorted.length > worstStagnation.sessions) {
            worstStagnation = { name: history[0].exerciseName, sessions: sorted.length };
          }
        }
      }

      if (bestProgression) {
        sentences.push(
          `Viene progresando bien en ${bestProgression.name} (+${bestProgression.delta}kg en el ultimo mes).`,
        );
      }
      if (worstStagnation) {
        sentences.push(
          `Esta estancado en ${worstStagnation.name} hace ${worstStagnation.sessions} sesiones.`,
        );
      }
      if (!bestProgression && !worstStagnation) {
        sentences.push('Mantiene cargas estables en sus ejercicios principales.');
      }
    } else if (sessions.length > 0) {
      sentences.push('Todavia hay pocas sesiones para evaluar progresion.');
    }

    // ── Body metrics vs goal ─────────────────────────────────────────────
    const activeGoals = goals.filter((g) => g.status === 'active');
    const sortedAnthro = [...anthro].sort((a, b) => b.measured_at.localeCompare(a.measured_at));

    if (activeGoals.length > 0) {
      const goal = activeGoals[0];
      const goalLabel = GOAL_TYPE_LABELS[goal.goal_type] ?? goal.goal_type;

      if (sortedAnthro.length >= 2 && sortedAnthro[0].weight_kg != null && sortedAnthro[1].weight_kg != null) {
        const latest = sortedAnthro[0].weight_kg;
        const previous = sortedAnthro[1].weight_kg;
        const delta = latest - previous;

        if (goal.goal_type === 'lose_weight') {
          if (delta < 0) {
            sentences.push(
              `El peso viene bajando bien: ${previous}kg → ${latest}kg.`,
            );
          } else if (delta > 0) {
            sentences.push(
              `El peso subio ${delta.toFixed(1)}kg. Revisar plan nutricional.`,
            );
          } else {
            sentences.push('El peso se mantiene sin cambios.');
          }
        } else {
          sentences.push(`Objetivo: ${goalLabel}. Peso actual: ${latest}kg.`);
        }

        // Close to target
        const target = parseFloat(goal.target_value ?? '0');
        if (target > 0 && goal.goal_type === 'lose_weight' && latest - target <= 2 && latest >= target) {
          sentences.push(`Esta a ${(latest - target).toFixed(1)}kg de su meta de ${target}kg.`);
        }
      } else if (sortedAnthro.length === 1 && sortedAnthro[0].weight_kg != null) {
        sentences.push(
          `Tiene una medicion inicial (${sortedAnthro[0].weight_kg}kg). Se necesita la proxima para evaluar tendencia.`,
        );
      } else {
        sentences.push(`Objetivo: ${goalLabel}. Sin mediciones corporales registradas.`);
      }
    }

    // ── Wellness state ───────────────────────────────────────────────────
    if (averages.count > 0) {
      const issues: string[] = [];
      if (averages.sleep_quality < 2.5) issues.push('sueno bajo');
      if (averages.soreness > 3.5) issues.push('dolor muscular alto');
      if (averages.energy < 2.5) issues.push('baja energia');

      if (issues.length > 0) {
        sentences.push(`Reporto ${issues.join(', ')} los ultimos dias.`);
      } else if (averages.energy >= 3.5 && averages.sleep_quality >= 3.5) {
        sentences.push('Se siente bien esta semana — buena energia y descanso.');
      }
    } else {
      sentences.push('No completo check-ins de bienestar esta semana.');
    }

    const text = sentences.join(' ');
    summaryCache.set(studentId, text);
    return text;
  },
};
