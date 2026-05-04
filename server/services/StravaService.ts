import crypto from 'crypto';
import { supabase } from '../db/supabase';
import { StudentDisciplinesService } from './StudentDisciplinesService';
import { StravaConnection } from '../../shared/types';
import { estimateKcal } from '../utils/metKcal';

const STRAVA_OAUTH_BASE = 'https://www.strava.com';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutos para completar el OAuth
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // refrescar si expira en <5min
const DEDUPE_DISTANCE_TOLERANCE_KM = 0.5;

// Mapping Strava activity type → sport_type interno.
// Para alumnos solo se persisten los de RUNNING_SPORTS (running_sessions).
// Para superadmin (owner_kind='personal') se persisten todos los del map.
const TRACKED_SPORT_TYPES: Record<string, string> = {
  Run: 'run',
  TrailRun: 'trail_run',
  VirtualRun: 'virtual_run',
  Tennis: 'tennis',
};
const RUNNING_SPORTS = new Set(['run', 'trail_run', 'virtual_run']);

type OwnerKind = 'student' | 'personal';

interface StravaTokenResponse {
  token_type: string;
  expires_at: number; // unix seconds
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
  };
}

interface StravaActivity {
  id: number;
  name?: string;
  description?: string;
  type: string;
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  average_heartrate?: number;
  average_speed?: number; // m/s
  total_elevation_gain?: number;
}

interface StoredConnection extends StravaConnection {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
  owner_kind: OwnerKind;
  owner_id: string; // student_id (when owner_kind='student') or personal_profile id
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function envOptional(name: string): string | null {
  return process.env[name] ?? null;
}

// ── State signing (HMAC) ─────────────────────────────────────────────────────

interface StatePayload {
  sid: string;       // student_id o personal_profile id
  ts: number;
  kind?: OwnerKind;  // default 'student' (back-compat: payloads viejos sin kind)
}

function signState(payload: StatePayload): string {
  const secret = env('STRAVA_OAUTH_STATE_SECRET');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state: string): StatePayload | null {
  const secret = env('STRAVA_OAUTH_STATE_SECRET');
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof parsed.sid !== 'string' || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > STATE_TTL_MS) return null;
    if (parsed.kind && parsed.kind !== 'student' && parsed.kind !== 'personal') return null;
    return parsed as StatePayload;
  } catch {
    return null;
  }
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

function publicConnection(row: StoredConnection): StravaConnection {
  return {
    id: row.id,
    gym_id: row.gym_id,
    student_id: row.student_id,
    athlete_id: row.athlete_id,
    athlete_firstname: row.athlete_firstname ?? null,
    athlete_lastname: row.athlete_lastname ?? null,
    scope: row.scope ?? null,
    connected_at: row.connected_at,
    last_sync_at: row.last_sync_at ?? null,
  };
}

function mapStravaTypeToSession(type: string): 'easy' | 'long' | 'other' {
  if (type === 'TrailRun') return 'long';
  if (type === 'Run' || type === 'VirtualRun') return 'easy';
  return 'other';
}

function mapStravaTypeToSport(type: string): string | null {
  return TRACKED_SPORT_TYPES[type] ?? null;
}

function buildNotes(activity: StravaActivity): string | null {
  const parts: string[] = [];
  if (activity.name) parts.push(activity.name);
  if (activity.description) parts.push(activity.description);
  const joined = parts.join(' — ').trim();
  return joined || null;
}

// ── Strava HTTP helpers ──────────────────────────────────────────────────────

async function postForm(url: string, params: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
}

async function fetchAuthed(url: string, accessToken: string): Promise<Response> {
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
}

// ── Connection persistence ──────────────────────────────────────────────────

async function getStoredByStudent(studentId: string): Promise<StoredConnection | null> {
  const { data, error } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('owner_kind', 'student')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StoredConnection | null;
}

async function getStoredByPersonalProfile(profileId: string): Promise<StoredConnection | null> {
  const { data, error } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('owner_kind', 'personal')
    .eq('owner_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StoredConnection | null;
}

async function getStoredByAthlete(athleteId: number): Promise<StoredConnection | null> {
  const { data, error } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('athlete_id', athleteId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StoredConnection | null;
}

async function persistTokenUpdate(
  connectionId: string,
  tokens: { access_token: string; refresh_token: string; expires_at: number },
): Promise<StoredConnection> {
  const { data, error } = await supabase
    .from('strava_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select('*')
    .single();
  if (error) throw error;
  return data as StoredConnection;
}

async function refreshAccessToken(connection: StoredConnection): Promise<StoredConnection> {
  const res = await postForm(`${STRAVA_OAUTH_BASE}/oauth/token`, {
    client_id: env('STRAVA_CLIENT_ID'),
    client_secret: env('STRAVA_CLIENT_SECRET'),
    grant_type: 'refresh_token',
    refresh_token: connection.refresh_token,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${text}`);
  }
  const tokens = (await res.json()) as StravaTokenResponse;
  return persistTokenUpdate(connection.id, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
  });
}

async function getValidConnection(connection: StoredConnection): Promise<StoredConnection> {
  const expiresAtMs = new Date(connection.expires_at).getTime();
  if (expiresAtMs - Date.now() > TOKEN_REFRESH_MARGIN_MS) return connection;
  return refreshAccessToken(connection);
}

// ── Activity import ──────────────────────────────────────────────────────────

async function deleteManualDuplicates(
  studentId: string,
  sessionDate: string,
  distanceKm: number,
): Promise<void> {
  const minKm = distanceKm - DEDUPE_DISTANCE_TOLERANCE_KM;
  const maxKm = distanceKm + DEDUPE_DISTANCE_TOLERANCE_KM;
  const { error } = await supabase
    .from('running_sessions')
    .delete()
    .eq('student_id', studentId)
    .eq('session_date', sessionDate)
    .eq('source', 'manual')
    .gte('distance_km', minKm)
    .lte('distance_km', maxKm);
  if (error) throw error;
}

async function upsertStudentRunningActivity(
  connection: StoredConnection,
  activity: StravaActivity,
): Promise<void> {
  const sessionDate = (activity.start_date_local || '').slice(0, 10);
  const distanceKm = Math.round((activity.distance / 1000) * 100) / 100;
  const durationSeconds = Math.round(activity.moving_time);

  if (!sessionDate || !(distanceKm > 0) || !(durationSeconds > 0)) return;
  if (!connection.student_id || !connection.gym_id) return;

  await deleteManualDuplicates(connection.student_id, sessionDate, distanceKm);

  const payload = {
    gym_id: connection.gym_id,
    student_id: connection.student_id,
    session_date: sessionDate,
    distance_km: distanceKm,
    duration_seconds: durationSeconds,
    avg_hr_bpm: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    perceived_effort: null,
    session_type: mapStravaTypeToSession(activity.type),
    notes: buildNotes(activity),
    logged_by: 'student' as const,
    source: 'strava' as const,
    external_provider: 'strava' as const,
    external_id: String(activity.id),
    avg_speed_mps: activity.average_speed != null
      ? Math.round(activity.average_speed * 100) / 100
      : null,
    elevation_gain_m: activity.total_elevation_gain != null
      ? Math.round(activity.total_elevation_gain)
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('running_sessions')
    .upsert(payload, { onConflict: 'external_provider,external_id' });
  if (error) throw error;
}

async function upsertPersonalActivity(
  connection: StoredConnection,
  activity: StravaActivity,
  sportType: string,
): Promise<void> {
  const startedAt = activity.start_date_local;
  const durationSeconds = Math.round(activity.moving_time);
  if (!startedAt || !(durationSeconds > 0)) return;

  // Peso del perfil para calcular kcal por MET cuando Strava no las da.
  const { data: profile } = await supabase
    .from('personal_profiles')
    .select('weight_kg')
    .eq('id', connection.owner_id)
    .maybeSingle();
  const weightKg = (profile as any)?.weight_kg ?? null;

  const distanceKm = activity.distance > 0
    ? Math.round((activity.distance / 1000) * 100) / 100
    : null;

  const payload = {
    profile_id: connection.owner_id,
    source: 'strava' as const,
    external_id: String(activity.id),
    sport_type: sportType,
    started_at: new Date(startedAt).toISOString(),
    duration_seconds: durationSeconds,
    distance_km: distanceKm,
    avg_hr_bpm: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    elevation_gain_m: activity.total_elevation_gain != null
      ? Math.round(activity.total_elevation_gain)
      : null,
    calories_kcal: estimateKcal({ sportType, durationSeconds, weightKg }),
    notes: buildNotes(activity),
    raw: activity as any,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('personal_activities')
    .upsert(payload, { onConflict: 'source,external_id' });
  if (error) throw error;
}

async function upsertActivity(
  connection: StoredConnection,
  activity: StravaActivity,
): Promise<void> {
  const sportType = mapStravaTypeToSport(activity.type);
  if (!sportType) return;

  if (connection.owner_kind === 'personal') {
    await upsertPersonalActivity(connection, activity, sportType);
    return;
  }

  // owner_kind='student': flujo legacy — solo running se persiste.
  if (!RUNNING_SPORTS.has(sportType)) return;
  await upsertStudentRunningActivity(connection, activity);
}

async function backfillSince(connection: StoredConnection, sinceUnix: number): Promise<number> {
  const fresh = await getValidConnection(connection);
  let imported = 0;
  let page = 1;
  // Strava paginates; cortamos al primer page vacío. perPage=100 cubre el caso típico.
  while (true) {
    const url = `${STRAVA_API_BASE}/athlete/activities?after=${sinceUnix}&per_page=100&page=${page}`;
    const res = await fetchAuthed(url, fresh.access_token);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strava list activities failed: ${res.status} ${text}`);
    }
    const list = (await res.json()) as StravaActivity[];
    if (!Array.isArray(list) || list.length === 0) break;
    for (const activity of list) {
      try {
        await upsertActivity(fresh, activity);
        if (mapStravaTypeToSport(activity.type)) imported += 1;
      } catch (err) {
        console.error('[strava] failed to upsert activity', activity.id, err);
      }
    }
    if (list.length < 100) break;
    page += 1;
  }
  await supabase
    .from('strava_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', fresh.id);
  return imported;
}

// ── Connection bootstrap helpers ─────────────────────────────────────────────

function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    response_type: 'code',
    redirect_uri: env('STRAVA_REDIRECT_URI'),
    approval_prompt: 'auto',
    scope: 'read,activity:read',
    state,
  });
  return `${STRAVA_OAUTH_BASE}/oauth/authorize?${params.toString()}`;
}

async function handleStudentConnection(
  studentId: string,
  tokens: StravaTokenResponse,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: studentRow, error: studentErr } = await supabase
    .from('students')
    .select('id, gym_id')
    .eq('id', studentId)
    .maybeSingle();
  if (studentErr) throw studentErr;
  if (!studentRow) return { ok: false, reason: 'student_not_found' };

  const { data: connRow, error: connErr } = await supabase
    .from('strava_connections')
    .upsert(
      {
        owner_kind: 'student',
        owner_id: studentId,
        gym_id: studentRow.gym_id,
        student_id: studentId,
        athlete_id: tokens.athlete!.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        scope: 'read,activity:read',
        athlete_firstname: tokens.athlete!.firstname ?? null,
        athlete_lastname: tokens.athlete!.lastname ?? null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' },
    )
    .select('*')
    .single();
  if (connErr) throw connErr;

  // Auto-marcar discipline running (el atleta podría no haberse marcado todavía)
  try {
    await StudentDisciplinesService.add(studentRow.gym_id, studentId, 'running');
  } catch (err) {
    console.error('[strava] failed to auto-mark running discipline', err);
  }

  await backfillThirtyDays(connRow as StoredConnection);
  return { ok: true };
}

async function handlePersonalConnection(
  profileId: string,
  tokens: StravaTokenResponse,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: profileRow, error: profileErr } = await supabase
    .from('personal_profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profileRow) return { ok: false, reason: 'profile_not_found' };

  // No usamos onConflict porque student_id puede ser NULL — onConflict requiere
  // una constraint única no-nullable. Hacemos delete+insert manual.
  await supabase
    .from('strava_connections')
    .delete()
    .eq('owner_kind', 'personal')
    .eq('owner_id', profileId);

  const { data: connRow, error: connErr } = await supabase
    .from('strava_connections')
    .insert({
      owner_kind: 'personal',
      owner_id: profileId,
      gym_id: null,
      student_id: null,
      athlete_id: tokens.athlete!.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      scope: 'read,activity:read',
      athlete_firstname: tokens.athlete!.firstname ?? null,
      athlete_lastname: tokens.athlete!.lastname ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (connErr) throw connErr;

  await backfillThirtyDays(connRow as StoredConnection);
  return { ok: true };
}

async function backfillThirtyDays(connection: StoredConnection): Promise<void> {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  try {
    await backfillSince(connection, since);
  } catch (err) {
    console.error('[strava] backfill failed', err);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const StravaService = {
  buildAuthUrl(studentId: string): string {
    const state = signState({ sid: studentId, ts: Date.now(), kind: 'student' });
    return buildAuthorizationUrl(state);
  },

  buildAuthUrlForPersonal(profileId: string): string {
    const state = signState({ sid: profileId, ts: Date.now(), kind: 'personal' });
    return buildAuthorizationUrl(state);
  },

  async handleCallback(code: string, state: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const verified = verifyState(state);
    if (!verified) return { ok: false, reason: 'invalid_state' };

    const kind: OwnerKind = verified.kind ?? 'student';

    // Intercambiar code por tokens (común a ambos flujos)
    const tokenRes = await postForm(`${STRAVA_OAUTH_BASE}/oauth/token`, {
      client_id: env('STRAVA_CLIENT_ID'),
      client_secret: env('STRAVA_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('[strava] token exchange failed', tokenRes.status, text);
      return { ok: false, reason: 'token_exchange_failed' };
    }
    const tokens = (await tokenRes.json()) as StravaTokenResponse;
    if (!tokens.athlete?.id) return { ok: false, reason: 'missing_athlete' };

    if (kind === 'personal') {
      return handlePersonalConnection(verified.sid, tokens);
    }
    return handleStudentConnection(verified.sid, tokens);
  },

  async importActivity(athleteId: number, activityId: number): Promise<void> {
    const stored = await getStoredByAthlete(athleteId);
    if (!stored) {
      console.warn('[strava] webhook for unknown athlete', athleteId);
      return;
    }
    const fresh = await getValidConnection(stored);
    const res = await fetchAuthed(`${STRAVA_API_BASE}/activities/${activityId}`, fresh.access_token);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strava get activity ${activityId} failed: ${res.status} ${text}`);
    }
    const activity = (await res.json()) as StravaActivity;
    await upsertActivity(fresh, activity);
    await supabase
      .from('strava_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', fresh.id);
  },

  async deleteImportedActivity(athleteId: number, activityId: number): Promise<void> {
    const stored = await getStoredByAthlete(athleteId);
    if (!stored) return;

    if (stored.owner_kind === 'personal') {
      const { error } = await supabase
        .from('personal_activities')
        .delete()
        .eq('profile_id', stored.owner_id)
        .eq('source', 'strava')
        .eq('external_id', String(activityId));
      if (error) throw error;
      return;
    }

    if (!stored.student_id) return;
    const { error } = await supabase
      .from('running_sessions')
      .delete()
      .eq('student_id', stored.student_id)
      .eq('external_provider', 'strava')
      .eq('external_id', String(activityId));
    if (error) throw error;
  },

  async disconnect(studentId: string): Promise<void> {
    const stored = await getStoredByStudent(studentId);
    if (!stored) return;

    // Revoke en Strava PRIMERO (con Bearer auth, como pide la API).
    // Si falla con algo distinto de 401 (que significa "ya revocado"), abortamos
    // el delete local — si no, el alumno queda en un estado inconsistente
    // (sin conexión local pero Strava lo sigue contando como athlete autorizado,
    // bloqueándolo para reconectar contra el cap de la app).
    const fresh = await getValidConnection(stored);
    const res = await fetch(`${STRAVA_OAUTH_BASE}/oauth/deauthorize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${fresh.access_token}` },
    });
    if (!res.ok && res.status !== 401) {
      const text = await res.text();
      throw new Error(`Strava deauthorize failed: ${res.status} ${text}`);
    }

    const { error } = await supabase
      .from('strava_connections')
      .delete()
      .eq('student_id', studentId);
    if (error) throw error;
  },

  async getConnectionStatus(studentId: string): Promise<StravaConnection | null> {
    const stored = await getStoredByStudent(studentId);
    return stored ? publicConnection(stored) : null;
  },

  async getPersonalConnectionStatus(profileId: string): Promise<StravaConnection | null> {
    const stored = await getStoredByPersonalProfile(profileId);
    return stored ? publicConnection(stored) : null;
  },

  async disconnectPersonal(profileId: string): Promise<void> {
    const stored = await getStoredByPersonalProfile(profileId);
    if (!stored) return;

    const fresh = await getValidConnection(stored);
    const res = await fetch(`${STRAVA_OAUTH_BASE}/oauth/deauthorize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${fresh.access_token}` },
    });
    if (!res.ok && res.status !== 401) {
      const text = await res.text();
      throw new Error(`Strava deauthorize failed: ${res.status} ${text}`);
    }

    const { error } = await supabase
      .from('strava_connections')
      .delete()
      .eq('owner_kind', 'personal')
      .eq('owner_id', profileId);
    if (error) throw error;
  },

  async backfillRecentForAllConnections(windowHours = 24): Promise<{ checked: number; imported: number }> {
    const { data, error } = await supabase.from('strava_connections').select('*');
    if (error) throw error;
    const since = Math.floor((Date.now() - windowHours * 60 * 60 * 1000) / 1000);
    let imported = 0;
    for (const row of (data || []) as StoredConnection[]) {
      try {
        imported += await backfillSince(row, since);
      } catch (err) {
        console.error('[strava] cron backfill failed for student', row.student_id, err);
      }
    }
    return { checked: (data || []).length, imported };
  },

  // Exposed para el script de bootstrap del webhook
  webhookVerifyToken(): string {
    return env('STRAVA_WEBHOOK_VERIFY_TOKEN');
  },

  envSummary() {
    return {
      hasClientId: !!envOptional('STRAVA_CLIENT_ID'),
      hasClientSecret: !!envOptional('STRAVA_CLIENT_SECRET'),
      hasRedirectUri: !!envOptional('STRAVA_REDIRECT_URI'),
      hasVerifyToken: !!envOptional('STRAVA_WEBHOOK_VERIFY_TOKEN'),
      hasStateSecret: !!envOptional('STRAVA_OAUTH_STATE_SECRET'),
    };
  },
};
