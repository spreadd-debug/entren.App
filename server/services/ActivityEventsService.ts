import { supabase } from '../db/supabase';
import {
  GymActivityEvent,
  GymActivityEventType,
  OnboardingFunnel,
  RetentionCohort,
} from '../../shared/types';

const TABLE = 'gym_activity_events';

function mapRow(row: any): GymActivityEvent {
  return {
    id: row.id,
    gym_id: row.gym_id,
    user_id: row.user_id ?? null,
    event_type: row.event_type,
    event_data: row.event_data ?? null,
    created_at: row.created_at,
  };
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const ActivityEventsService = {

  /**
   * Insert an event. For event types that have unique constraints in DB
   * (first_*, daily login), Supabase returns an error on conflict — we swallow
   * it so the caller doesn't care whether the event was already logged.
   */
  async log(params: {
    gym_id: string;
    event_type: GymActivityEventType;
    event_data?: Record<string, any> | null;
    user_id?: string | null;
  }): Promise<GymActivityEvent | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        gym_id: params.gym_id,
        event_type: params.event_type,
        event_data: params.event_data ?? null,
        user_id: params.user_id ?? null,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      // 23505 = unique_violation (expected for daily-login & first-* dedupe)
      const code = (error as any).code ?? '';
      if (code === '23505') return null;
      throw error;
    }
    return data ? mapRow(data) : null;
  },

  async getForGym(gymId: string, limit = 200): Promise<GymActivityEvent[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  /**
   * Funnel: cuántos gyms alcanzaron cada paso del onboarding.
   * `registered` = COUNT(DISTINCT gym_id WHERE event_type = 'gym_registered').
   * Los otros son COUNT(DISTINCT gym_id WHERE event_type = 'first_*').
   */
  async getFunnel(): Promise<OnboardingFunnel> {
    const targets: GymActivityEventType[] = [
      'gym_registered',
      'first_student_created',
      'first_payment_registered',
      'gym_activated',
    ];

    const counts: Record<string, number> = {};
    await Promise.all(
      targets.map(async (type) => {
        const { count, error } = await supabase
          .from(TABLE)
          .select('gym_id', { count: 'exact', head: true })
          .eq('event_type', type);
        if (error) throw error;
        counts[type] = count ?? 0;
      }),
    );

    return {
      registered:     counts['gym_registered']          ?? 0,
      first_student:  counts['first_student_created']   ?? 0,
      first_payment:  counts['first_payment_registered'] ?? 0,
      activated:      counts['gym_activated']           ?? 0,
    };
  },

  /**
   * Retention por cohorte semanal (últimas 8 semanas).
   * Para cada gym con evento `gym_registered` en la semana, se marca:
   *   - d1: login en las 24-48hs posteriores al registro
   *   - d7: login en las horas 144-336 (día 7 ±1)
   *   - d30: login en las horas 696-888 (día 30 ±1)
   * Se usan ventanas laxas de ±1 día para no perder gente que entra un día
   * antes o después del target exacto.
   */
  async getRetention(weeks = 8): Promise<RetentionCohort[]> {
    const now = new Date();
    // Alinear a lunes UTC de la semana actual
    const day = now.getUTCDay(); // 0=Sun
    const daysSinceMonday = (day + 6) % 7;
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));

    const cohortStarts: Date[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      cohortStarts.push(addDays(thisMonday, -7 * i));
    }

    // Rango total (cohorte más vieja menos margen, hasta hoy)
    const windowStart = addDays(cohortStarts[0], -1);
    const windowEnd = addDays(now, 1);

    // Traemos 'gym_registered' y 'login' en la ventana (más d30 de la cohorte más reciente)
    const maxEnd = addDays(cohortStarts[cohortStarts.length - 1], 32);
    const effectiveEnd = maxEnd > windowEnd ? maxEnd : windowEnd;

    const [{ data: regRows, error: regErr }, { data: loginRows, error: loginErr }] = await Promise.all([
      supabase.from(TABLE)
        .select('gym_id, created_at')
        .eq('event_type', 'gym_registered')
        .gte('created_at', windowStart.toISOString())
        .lte('created_at', effectiveEnd.toISOString()),
      supabase.from(TABLE)
        .select('gym_id, created_at')
        .eq('event_type', 'login')
        .gte('created_at', windowStart.toISOString())
        .lte('created_at', effectiveEnd.toISOString()),
    ]);
    if (regErr) throw regErr;
    if (loginErr) throw loginErr;

    // Logins por gym (ordenados asc)
    const loginsByGym = new Map<string, number[]>();
    for (const r of loginRows ?? []) {
      const arr = loginsByGym.get(r.gym_id) ?? [];
      arr.push(new Date(r.created_at).getTime());
      loginsByGym.set(r.gym_id, arr);
    }
    for (const arr of loginsByGym.values()) arr.sort((a, b) => a - b);

    // Registros por gym (nos quedamos con el más antiguo)
    const registrationByGym = new Map<string, number>();
    for (const r of regRows ?? []) {
      const t = new Date(r.created_at).getTime();
      const current = registrationByGym.get(r.gym_id);
      if (current == null || t < current) registrationByGym.set(r.gym_id, t);
    }

    const hasLoginInWindow = (gymId: string, startOffsetDays: number, endOffsetDays: number, regTime: number): boolean => {
      const logins = loginsByGym.get(gymId);
      if (!logins) return false;
      const start = regTime + startOffsetDays * 86_400_000;
      const end = regTime + endOffsetDays * 86_400_000;
      // Si la ventana aún no terminó, no contamos como "perdido" pero tampoco "logueado"
      if (Date.now() < start) return false;
      return logins.some(t => t >= start && t <= end);
    };

    const cohorts: RetentionCohort[] = cohortStarts.map(weekStart => {
      const weekEnd = addDays(weekStart, 7);
      const cohortGymIds: { gymId: string; regTime: number }[] = [];
      for (const [gymId, regTime] of registrationByGym.entries()) {
        if (regTime >= weekStart.getTime() && regTime < weekEnd.getTime()) {
          cohortGymIds.push({ gymId, regTime });
        }
      }

      let d1 = 0, d7 = 0, d30 = 0;
      for (const { gymId, regTime } of cohortGymIds) {
        if (hasLoginInWindow(gymId, 0.5, 2,  regTime)) d1++;   // 12h-48h
        if (hasLoginInWindow(gymId, 6, 9,    regTime)) d7++;   // día 6-9
        if (hasLoginInWindow(gymId, 28, 32,  regTime)) d30++;  // día 28-32
      }

      return {
        cohort_date: isoDate(weekStart),
        cohort_size: cohortGymIds.length,
        d1,
        d7,
        d30,
      };
    });

    return cohorts;
  },
};
