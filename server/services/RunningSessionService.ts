import { supabase } from '../db/supabase';
import { RunningSession, RunningSessionInput, RunningWeeklyTotal } from '../../shared/types';

interface ListOpts {
  from?: string; // ISO date inclusive
  to?: string;   // ISO date inclusive
  limit?: number;
}

function isoMonday(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = out.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7;  // days since Monday
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const RunningSessionService = {
  async getForStudent(studentId: string, opts: ListOpts = {}): Promise<RunningSession[]> {
    let q = supabase
      .from('running_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (opts.from) q = q.gte('session_date', opts.from);
    if (opts.to) q = q.lte('session_date', opts.to);
    if (opts.limit && opts.limit > 0) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as RunningSession[];
  },

  async getById(id: string): Promise<RunningSession | null> {
    const { data, error } = await supabase
      .from('running_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as RunningSession | null;
  },

  async create(input: RunningSessionInput): Promise<RunningSession> {
    const payload = {
      gym_id: input.gym_id,
      student_id: input.student_id,
      session_date: input.session_date,
      distance_km: input.distance_km,
      duration_seconds: input.duration_seconds,
      avg_hr_bpm: input.avg_hr_bpm ?? null,
      perceived_effort: input.perceived_effort ?? null,
      session_type: input.session_type,
      notes: input.notes ?? null,
      logged_by: input.logged_by ?? 'pt',
    };

    const { data, error } = await supabase
      .from('running_sessions')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as RunningSession;
  },

  async update(id: string, patch: Partial<RunningSessionInput>): Promise<RunningSession> {
    const allowed: Record<string, unknown> = {};
    if (patch.session_date !== undefined) allowed.session_date = patch.session_date;
    if (patch.distance_km !== undefined) allowed.distance_km = patch.distance_km;
    if (patch.duration_seconds !== undefined) allowed.duration_seconds = patch.duration_seconds;
    if (patch.avg_hr_bpm !== undefined) allowed.avg_hr_bpm = patch.avg_hr_bpm;
    if (patch.perceived_effort !== undefined) allowed.perceived_effort = patch.perceived_effort;
    if (patch.session_type !== undefined) allowed.session_type = patch.session_type;
    if (patch.notes !== undefined) allowed.notes = patch.notes;
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('running_sessions')
      .update(allowed)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as RunningSession;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('running_sessions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getWeeklyTotals(studentId: string, weeks = 8): Promise<RunningWeeklyTotal[]> {
    const today = new Date();
    const currentMonday = isoMonday(today);
    const startMonday = new Date(currentMonday);
    startMonday.setUTCDate(startMonday.getUTCDate() - (weeks - 1) * 7);
    const fromIso = fmtDate(startMonday);

    const { data, error } = await supabase
      .from('running_sessions')
      .select('session_date, distance_km, duration_seconds')
      .eq('student_id', studentId)
      .gte('session_date', fromIso);

    if (error) throw error;

    const buckets = new Map<string, RunningWeeklyTotal>();
    for (let i = 0; i < weeks; i++) {
      const wk = new Date(startMonday);
      wk.setUTCDate(wk.getUTCDate() + i * 7);
      const key = fmtDate(wk);
      buckets.set(key, { week_start: key, km: 0, minutes: 0, sessions: 0 });
    }

    for (const row of data || []) {
      const d = new Date(`${row.session_date}T00:00:00Z`);
      const key = fmtDate(isoMonday(d));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.km += Number(row.distance_km) || 0;
      bucket.minutes += (Number(row.duration_seconds) || 0) / 60;
      bucket.sessions += 1;
    }

    return Array.from(buckets.values())
      .map(b => ({
        ...b,
        km: Math.round(b.km * 100) / 100,
        minutes: Math.round(b.minutes * 10) / 10,
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));
  },
};
