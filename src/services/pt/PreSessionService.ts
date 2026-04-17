import { PTSessionService } from './PTSessionService';
import type { PTSessionFull } from './PTSessionService';
import { WellnessCheckInService } from './WellnessCheckInService';
import { AlertEngineService } from './AlertEngineService';
import type {
  StudentAlert,
  WellnessCheckIn,
  SessionSet,
} from '../../../shared/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ExerciseSessionEntry {
  date: string;
  sets: SessionSet[];
  totalVolume: number;
}

export interface ExerciseHistory {
  exerciseName: string;
  workoutExerciseId: string;
  sessions: ExerciseSessionEntry[];
}

export interface ProgressionMetrics {
  weeklyVolume: number[];       // last 6 weeks, index 0 = most recent
  weeklyFrequency: number[];    // sessions per week, last 6 weeks
  topProgressions: Array<{ exercise: string; deltaKg: number }>;
  topStagnations: Array<{ exercise: string; sameWeightSessions: number }>;
}

export interface PreSessionData {
  wellness: {
    today: WellnessCheckIn | null;
    history: WellnessCheckIn[];
    averages: { energy: number; sleep_quality: number; mood: number; soreness: number; count: number };
  };
  exerciseHistory: ExerciseHistory[];
  progressionMetrics: ProgressionMetrics;
  alerts: StudentAlert[];
  lastSessionDate: string | null;
}

// ─── Service ───────────────────────────────────────────────────────────────

export const PreSessionService = {

  async getPreSessionData(studentId: string, gymId: string): Promise<PreSessionData> {
    // Sweep stale in_progress sessions from prior days so they count in history
    await PTSessionService.completeStaleSessions(studentId).catch((err) =>
      console.error('Error sweeping stale sessions:', err),
    );

    const results = await Promise.allSettled([
      PTSessionService.getSessionsWithSets(studentId, 20),
      WellnessCheckInService.getToday(studentId),
      WellnessCheckInService.getHistory(studentId, 7),
      WellnessCheckInService.getAverages(studentId, 7),
      AlertEngineService.getAlertsForStudent(studentId, gymId),
    ]);

    const sessions = results[0].status === 'fulfilled' ? results[0].value : [];
    const wellnessToday = results[1].status === 'fulfilled' ? results[1].value : null;
    const wellnessHistory = results[2].status === 'fulfilled' ? results[2].value : [];
    const wellnessAverages = results[3].status === 'fulfilled'
      ? results[3].value
      : { energy: 0, sleep_quality: 0, mood: 0, soreness: 0, count: 0 };
    const alerts = results[4].status === 'fulfilled' ? results[4].value : [];

    return {
      wellness: {
        today: wellnessToday,
        history: wellnessHistory,
        averages: wellnessAverages,
      },
      exerciseHistory: buildExerciseHistory(sessions),
      progressionMetrics: buildProgressionMetrics(sessions),
      alerts,
      lastSessionDate: sessions.length > 0
        ? sessions.sort((a, b) => b.session.session_date.localeCompare(a.session.session_date))[0].session.session_date
        : null,
    };
  },
};

// ─── Internal Helpers ──────────────────────────────────────────────────────

export function buildExerciseHistory(sessions: PTSessionFull[]): ExerciseHistory[] {
  const byExercise = AlertEngineService.groupByExercise(sessions);
  const result: ExerciseHistory[] = [];

  for (const [exId, history] of byExercise) {
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    result.push({
      exerciseName: history[0].exerciseName,
      workoutExerciseId: exId,
      sessions: sorted.slice(0, 5).map((h) => ({
        date: h.date,
        sets: h.sets,
        totalVolume: h.sets.reduce(
          (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps_done ?? 0),
          0,
        ),
      })),
    });
  }

  // Sort by most recent activity
  result.sort((a, b) => {
    const aDate = a.sessions[0]?.date ?? '';
    const bDate = b.sessions[0]?.date ?? '';
    return bDate.localeCompare(aDate);
  });

  return result;
}

function buildProgressionMetrics(sessions: PTSessionFull[]): ProgressionMetrics {
  const volumes = AlertEngineService.weeklyVolumes(sessions, 6);
  const frequency = AlertEngineService.weeklyFrequency(sessions, 6);
  const byExercise = AlertEngineService.groupByExercise(sessions);

  const progressions: Array<{ exercise: string; deltaKg: number }> = [];
  const stagnations: Array<{ exercise: string; sameWeightSessions: number }> = [];

  for (const [, history] of byExercise) {
    if (history.length < 2) continue;
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const firstMax = AlertEngineService.maxWeight(sorted[0].sets);
    const lastMax = AlertEngineService.maxWeight(sorted[sorted.length - 1].sets);
    const delta = lastMax - firstMax;
    const name = history[0].exerciseName;

    if (delta > 0) {
      progressions.push({ exercise: name, deltaKg: delta });
    } else if (delta === 0 && sorted.length >= 3) {
      stagnations.push({ exercise: name, sameWeightSessions: sorted.length });
    }
  }

  progressions.sort((a, b) => b.deltaKg - a.deltaKg);
  stagnations.sort((a, b) => b.sameWeightSessions - a.sameWeightSessions);

  return {
    weeklyVolume: volumes,
    weeklyFrequency: frequency,
    topProgressions: progressions.slice(0, 3),
    topStagnations: stagnations.slice(0, 3),
  };
}
