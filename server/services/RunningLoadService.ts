import { supabase } from '../db/supabase';
import {
  RunningAlert,
  RunningGymAlert,
  RunningLoadDay,
  RunningLoadSummary,
  RunningSession,
} from '../../shared/types';

// ── Constantes del modelo Banister ────────────────────────────────────────────
const HR_REST_DEFAULT = 60;            // v1: hardcoded; v2 → per-athlete override
const CTL_TAU = 42;                    // fitness time constant (días)
const ATL_TAU = 7;                     // fatiga time constant (días)
const HISTORY_DAYS = 60;               // ventana visible
const WARMUP_DAYS = 30;                // días extra leídos para que CTL/ATL no arranquen en 0

// Umbrales de alertas
const VOLUME_SPIKE_RATIO = 1.10;
const VOLUME_SPIKE_MIN_BASELINE_KM = 5;
const INACTIVE_WARN_DAYS = 7;
const INACTIVE_ALERT_DAYS = 14;
const MONOTONY_MIN_SESSIONS = 4;
const MONOTONY_THRESHOLD = 2.0;
const TSB_NEGATIVE_THRESHOLD = -30;

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function computeAgeFromBirthDate(birthDate: string): number {
  const b = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return 0;
  const today = new Date();
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < b.getUTCMonth() ||
    (today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function estimateHrMax(age: number): number {
  // Tanaka: HRmax = 208 − 0.7 × edad (más precisa que 220 − edad)
  return Math.round(208 - 0.7 * age);
}

export function computeSessionLoad(session: RunningSession, hrMax: number | null): number {
  const durationMin = (Number(session.duration_seconds) || 0) / 60;
  if (durationMin <= 0) return 0;

  const hr = session.avg_hr_bpm != null ? Number(session.avg_hr_bpm) : null;
  if (hrMax && hr && hr > 0) {
    // Banister TRIMP: duration × HRr × 0.64 × e^(1.92 × HRr)
    const hrR = clamp((hr - HR_REST_DEFAULT) / (hrMax - HR_REST_DEFAULT), 0, 1);
    return durationMin * hrR * 0.64 * Math.exp(1.92 * hrR);
  }

  // Fallback: estimación grosera por km (~6 TRIMP-eq por km a ritmo easy).
  // Mantiene la serie continua aunque falte la FC.
  const km = Number(session.distance_km) || 0;
  return km * 6;
}

export function buildDailyLoads(
  sessions: RunningSession[],
  hrMax: number | null,
  historyDays = HISTORY_DAYS,
  warmupDays = WARMUP_DAYS,
): RunningLoadDay[] {
  // Mapa: 'YYYY-MM-DD' → load total del día
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const date = String(s.session_date).slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + computeSessionLoad(s, hrMax));
  }

  const today = new Date();
  const totalDays = historyDays + warmupDays;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  let ctl = 0;
  let atl = 0;
  const series: RunningLoadDay[] = [];

  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const key = fmtDate(day);
    const load = byDate.get(key) ?? 0;

    ctl = ctl + (load - ctl) / CTL_TAU;
    atl = atl + (load - atl) / ATL_TAU;
    const tsb = ctl - atl;

    series.push({
      date: key,
      load: roundTo(load, 1),
      ctl: roundTo(ctl, 1),
      atl: roundTo(atl, 1),
      tsb: roundTo(tsb, 1),
    });
  }

  // Devolvemos solo los últimos historyDays (los warmup quedan absorbidos en CTL/ATL).
  return series.slice(-historyDays);
}

function summarizeKmLastNDays(sessions: RunningSession[], n: number, today: Date): number {
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - n);
  const cutoffStr = fmtDate(cutoff);
  let km = 0;
  for (const s of sessions) {
    if (String(s.session_date) >= cutoffStr) km += Number(s.distance_km) || 0;
  }
  return km;
}

export function computeAlerts(history: RunningLoadDay[], sessions: RunningSession[]): RunningAlert[] {
  const alerts: RunningAlert[] = [];
  const today = new Date();

  // ── Alerta 1: spike de volumen (regla 10%) ─────────────────────────────────
  const last7 = summarizeKmLastNDays(sessions, 7, today);
  const last35 = summarizeKmLastNDays(sessions, 35, today);
  const baselineKmPerWeek = (last35 - last7) / 4; // promedio de las 4 semanas previas
  if (baselineKmPerWeek >= VOLUME_SPIKE_MIN_BASELINE_KM && last7 > baselineKmPerWeek * VOLUME_SPIKE_RATIO) {
    const deltaPct = Math.round(((last7 / baselineKmPerWeek) - 1) * 100);
    alerts.push({
      kind: 'volume_spike',
      severity: deltaPct >= 25 ? 'alert' : 'warn',
      message: `Subida de volumen de ${deltaPct}% (${roundTo(last7, 1)} km vs baseline ${roundTo(baselineKmPerWeek, 1)} km/sem).`,
      metadata: {
        delta_pct: deltaPct,
        last7_km: roundTo(last7, 1),
        baseline_km: roundTo(baselineKmPerWeek, 1),
      },
    });
  }

  // ── Alerta 2: ausencia prolongada ──────────────────────────────────────────
  if (sessions.length === 0) {
    alerts.push({
      kind: 'inactive',
      severity: 'warn',
      message: 'Todavía no hay corridas registradas.',
      metadata: { days_since: -1 },
    });
  } else {
    // sessions vienen ordenados desc por session_date
    const lastDate = String(sessions[0].session_date).slice(0, 10);
    const last = new Date(`${lastDate}T00:00:00Z`);
    const daysSince = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > INACTIVE_WARN_DAYS) {
      alerts.push({
        kind: 'inactive',
        severity: daysSince >= INACTIVE_ALERT_DAYS ? 'alert' : 'warn',
        message: `Sin correr hace ${daysSince} días.`,
        metadata: { days_since: daysSince, last_session_date: lastDate },
      });
    }
  }

  // ── Alerta 3: monotonía (Foster) ───────────────────────────────────────────
  const last7Loads = history.slice(-7).map(d => d.load).filter(l => l > 0);
  if (last7Loads.length >= MONOTONY_MIN_SESSIONS) {
    const mean = last7Loads.reduce((a, b) => a + b, 0) / last7Loads.length;
    const variance = last7Loads.reduce((a, b) => a + (b - mean) ** 2, 0) / last7Loads.length;
    const std = Math.sqrt(variance);
    if (std > 0) {
      const monotony = mean / std;
      if (monotony > MONOTONY_THRESHOLD) {
        alerts.push({
          kind: 'monotony',
          severity: 'warn',
          message: `Monotonía alta (${roundTo(monotony, 2)}) — poca variabilidad de carga, considerá alternar intensidades.`,
          metadata: { monotony: roundTo(monotony, 2), sessions_in_week: last7Loads.length },
        });
      }
    }
  }

  // ── Alerta 4: TSB negativo extremo ─────────────────────────────────────────
  const todayDay = history[history.length - 1];
  if (todayDay && todayDay.tsb < TSB_NEGATIVE_THRESHOLD) {
    alerts.push({
      kind: 'tsb_negative',
      severity: todayDay.tsb < -50 ? 'alert' : 'warn',
      message: `Fatiga acumulada (TSB ${todayDay.tsb}). Considerá una semana de descarga.`,
      metadata: { tsb: todayDay.tsb, ctl: todayDay.ctl, atl: todayDay.atl },
    });
  }

  return alerts;
}

async function fetchStudentBirthDate(studentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('students')
    .select('birth_date')
    .eq('id', studentId)
    .maybeSingle();
  if (error) throw error;
  return (data?.birth_date as string | null) ?? null;
}

async function fetchSessions(studentId: string): Promise<RunningSession[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (HISTORY_DAYS + WARMUP_DAYS));
  const cutoffStr = fmtDate(cutoff);

  const { data, error } = await supabase
    .from('running_sessions')
    .select('*')
    .eq('student_id', studentId)
    .gte('session_date', cutoffStr)
    .order('session_date', { ascending: false });

  if (error) throw error;
  return (data || []) as RunningSession[];
}

export const RunningLoadService = {
  computeAgeFromBirthDate,
  estimateHrMax,
  computeSessionLoad,
  buildDailyLoads,
  computeAlerts,

  async getSummary(studentId: string): Promise<RunningLoadSummary> {
    const birthDate = await fetchStudentBirthDate(studentId);
    const age = birthDate ? computeAgeFromBirthDate(birthDate) : null;
    const hrMax = age && age > 0 ? estimateHrMax(age) : null;

    const sessions = await fetchSessions(studentId);
    const history = buildDailyLoads(sessions, hrMax);
    const alerts = computeAlerts(history, sessions);

    const lastDay = history[history.length - 1] ?? { ctl: 0, atl: 0, tsb: 0 };

    return {
      has_birth_date: !!birthDate,
      age,
      hr_max: hrMax,
      current: { ctl: lastDay.ctl, atl: lastDay.atl, tsb: lastDay.tsb },
      history,
      alerts,
    };
  },

  async getGymAlerts(gymId: string): Promise<RunningGymAlert[]> {
    // 1) listar alumnos del gym con disciplina 'running'
    const { data: discRows, error: discErr } = await supabase
      .from('student_disciplines')
      .select('student_id')
      .eq('discipline', 'running');
    if (discErr) throw discErr;

    const runnerIds = Array.from(new Set((discRows || []).map((r: any) => r.student_id)));
    if (runnerIds.length === 0) return [];

    const { data: studentRows, error: studErr } = await supabase
      .from('students')
      .select('id, nombre, apellido')
      .eq('gym_id', gymId)
      .in('id', runnerIds);
    if (studErr) throw studErr;

    const students = (studentRows || []) as Array<{ id: string; nombre: string; apellido: string | null }>;

    // 2) calcular summary de cada alumno en paralelo, recolectar alerts no-info
    const summaries = await Promise.all(
      students.map(async (s) => {
        try {
          const sum = await this.getSummary(s.id);
          return { student: s, alerts: sum.alerts };
        } catch (err) {
          console.error(`[runningLoad] getSummary failed for ${s.id}`, err);
          return { student: s, alerts: [] as RunningAlert[] };
        }
      }),
    );

    const out: RunningGymAlert[] = [];
    for (const { student, alerts } of summaries) {
      for (const a of alerts) {
        if (a.severity === 'info') continue;
        out.push({
          ...a,
          student_id: student.id,
          student_name: `${student.nombre ?? ''} ${student.apellido ?? ''}`.trim() || 'Sin nombre',
        });
      }
    }

    // 3) ordenar: alert > warn, luego por kind
    const sevOrder: Record<string, number> = { alert: 0, warn: 1, info: 2 };
    out.sort((a, b) => (sevOrder[a.severity] - sevOrder[b.severity]) || a.kind.localeCompare(b.kind));

    return out;
  },
};
