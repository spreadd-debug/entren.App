import { GarminConnect } from 'garmin-connect';
import { supabase } from '../db/supabase';
import { encrypt, decrypt, EncryptedField } from '../utils/cryptoAes';

// ── Mapping de Strava → sport_type interno ────────────────────────────────────
// typeKey de Garmin (parent + child) → nuestro sport_type usado en UI/DB.
// Se elige por prefijo para cubrir variantes (ej. 'mountain_biking' → cycling).
function mapGarminSportType(typeKey: string): string {
  const k = (typeKey || '').toLowerCase();
  if (k.includes('trail_run')) return 'trail_run';
  if (k.includes('treadmill') || k.includes('indoor_running')) return 'virtual_run';
  if (k.includes('run')) return 'run';
  if (k === 'tennis' || k.includes('tennis')) return 'tennis';
  if (k.includes('cycl') || k.includes('biking') || k.includes('bike')) return 'cycling';
  if (k.includes('swim')) return 'swimming';
  if (k.includes('strength') || k.includes('weight_training')) return 'strength';
  if (k.includes('walk')) return 'walking';
  if (k.includes('hik')) return 'hiking';
  if (k.includes('yoga')) return 'yoga';
  return 'other';
}

// ── Pool de clientes en memoria ──────────────────────────────────────────────
// Garmin tiene rate-limit; reusar el client autenticado entre calls cercanas
// minimiza requests. TTL 30min porque los OAuth tokens internos suelen durar.
interface CachedClient {
  client: GarminConnect;
  loggedInAt: number;
}
const CLIENT_TTL_MS = 30 * 60 * 1000;
const clientCache = new Map<string, CachedClient>();

async function loadCredentials(profileId: string): Promise<{ email: string; password: string } | null> {
  const { data, error } = await supabase
    .from('garmin_connections')
    .select('email_encrypted, email_iv, email_tag, password_encrypted, password_iv, password_tag')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const emailField: EncryptedField = {
    ciphertext: data.email_encrypted,
    iv: data.email_iv,
    tag: data.email_tag,
  };
  const passwordField: EncryptedField = {
    ciphertext: data.password_encrypted,
    iv: data.password_iv,
    tag: data.password_tag,
  };
  return { email: decrypt(emailField), password: decrypt(passwordField) };
}

async function getClient(profileId: string): Promise<GarminConnect> {
  const cached = clientCache.get(profileId);
  if (cached && Date.now() - cached.loggedInAt < CLIENT_TTL_MS) {
    return cached.client;
  }
  const creds = await loadCredentials(profileId);
  if (!creds) throw new Error('No Garmin connection for profile ' + profileId);
  const client = new GarminConnect({ username: creds.email, password: creds.password });
  await client.login();
  clientCache.set(profileId, { client, loggedInAt: Date.now() });
  return client;
}

// ── Sync helpers ─────────────────────────────────────────────────────────────

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function syncActivities(profileId: string, days = 30): Promise<number> {
  const client = await getClient(profileId);
  // getActivities(offset, limit) usa offset, no fecha — paginamos en chunks de
  // 100 hasta que las actividades recibidas son anteriores a `since`. Sin esto,
  // un solo fetch de 100 puede no alcanzar para 90 días si entrenás todos los
  // días (90 días * 1.5 actividades = 135).
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const PAGE = 100;
  const MAX_PAGES = 10; // hard ceiling — cubre ~1000 actividades, más que un año normal
  const filtered: any[] = [];
  let stop = false;
  for (let page = 0; page < MAX_PAGES && !stop; page++) {
    const batch = await client.getActivities(page * PAGE, PAGE);
    if (!batch || batch.length === 0) break;
    for (const a of batch) {
      const t = a.beginTimestamp ?? Date.parse(a.startTimeLocal ?? '');
      if (!t) continue;
      if (t < since) {
        // Las activities vienen ordenadas desc — al ver una más vieja que since,
        // ya no hay nada útil más adelante.
        stop = true;
        break;
      }
      filtered.push(a);
    }
    if (batch.length < PAGE) break; // no hay más páginas
  }

  let imported = 0;
  for (const a of filtered) {
    const sportType = mapGarminSportType(a.activityType?.typeKey ?? '');
    const distanceKm = a.distance > 0 ? Math.round((a.distance / 1000) * 100) / 100 : null;

    const payload = {
      profile_id: profileId,
      source: 'garmin' as const,
      external_id: String(a.activityId),
      sport_type: sportType,
      started_at: a.startTimeLocal ? new Date(a.startTimeLocal).toISOString() : new Date().toISOString(),
      duration_seconds: Math.round(a.duration ?? 0),
      distance_km: distanceKm,
      avg_hr_bpm: a.averageHR != null ? Math.round(a.averageHR) : null,
      elevation_gain_m: a.elevationGain != null ? Math.round(a.elevationGain) : null,
      calories_kcal: a.calories != null ? Math.round(a.calories) : null,
      notes: a.activityName || null,
      raw: a as any,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('personal_activities')
      .upsert(payload, { onConflict: 'source,external_id' });
    if (error) {
      console.error('[garmin] activity upsert failed', a.activityId, error);
      continue;
    }
    imported += 1;
  }
  return imported;
}

async function syncSleep(profileId: string, date: string): Promise<void> {
  const client = await getClient(profileId);
  const data: any = await client.getSleepData(new Date(date));
  if (!data || !data.dailySleepDTO) return;

  const dto = data.dailySleepDTO;
  const startMs = dto.sleepStartTimestampLocal ?? null;
  const endMs = dto.sleepEndTimestampLocal ?? null;

  const payload = {
    profile_id: profileId,
    sleep_date: date,
    start_at: startMs ? new Date(startMs).toISOString() : null,
    end_at:   endMs   ? new Date(endMs).toISOString()   : null,
    total_seconds: dto.sleepTimeSeconds ?? null,
    deep_seconds:  dto.deepSleepSeconds ?? null,
    light_seconds: dto.lightSleepSeconds ?? null,
    rem_seconds:   dto.remSleepSeconds ?? null,
    awake_seconds: dto.awakeSleepSeconds ?? null,
    sleep_score:   dto.sleepScores?.overall?.value ?? null,
    avg_hr_bpm:    data.restingHeartRate ?? null,
    avg_hrv_ms:    data.avgOvernightHrv ?? null,
    body_battery_change: data.bodyBatteryChange ?? null,
    raw: data as any,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('personal_sleep')
    .upsert(payload, { onConflict: 'profile_id,sleep_date' });
  if (error) throw error;
}

async function syncDailyMetrics(profileId: string, date: string): Promise<void> {
  const client = await getClient(profileId);
  const dateObj = new Date(date);

  // Steps (number directo)
  let steps: number | null = null;
  try { steps = await client.getSteps(dateObj); } catch (err) { console.warn('[garmin] steps failed', err); }

  // Heart rate detail
  let restingHr: number | null = null;
  let maxHr: number | null = null;
  try {
    const hr: any = await client.getHeartRate(dateObj);
    restingHr = hr?.restingHeartRate ?? null;
    maxHr = hr?.maxHeartRate ?? null;
  } catch (err) { console.warn('[garmin] HR failed', err); }

  // Daily summary (kcal totales, BMR, body battery, stress, intensity minutes).
  // Usamos el método get<T> genérico de la lib para llegar al endpoint que
  // los wrappers oficiales no exponen.
  let summary: any = null;
  try {
    const userSettings: any = await client.getUserSettings();
    const userId = userSettings?.id ?? userSettings?.userData?.userId;
    if (userId) {
      summary = await client.get<any>(
        `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${userId}?calendarDate=${date}`,
      );
    }
  } catch (err) { console.warn('[garmin] daily summary failed', err); }

  const payload = {
    profile_id: profileId,
    metric_date: date,
    steps: steps ?? summary?.totalSteps ?? null,
    steps_goal: summary?.dailyStepGoal ?? null,
    total_kcal:  summary?.totalKilocalories ?? null,
    active_kcal: summary?.activeKilocalories ?? null,
    bmr_kcal:    summary?.bmrKilocalories ?? null,
    resting_hr_bpm: restingHr ?? summary?.restingHeartRate ?? null,
    max_hr_bpm: maxHr ?? summary?.maxHeartRate ?? null,
    avg_stress: summary?.averageStressLevel ?? null,
    body_battery_high:    summary?.bodyBatteryHighestValue ?? null,
    body_battery_low:     summary?.bodyBatteryLowestValue ?? null,
    body_battery_current: summary?.bodyBatteryMostRecentValue ?? null,
    intensity_minutes:
      (summary?.moderateIntensityMinutes ?? 0) + (summary?.vigorousIntensityMinutes ?? 0) || null,
    raw: summary as any,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('personal_daily_metrics')
    .upsert(payload, { onConflict: 'profile_id,metric_date' });
  if (error) throw error;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const GarminService = {
  async connect(profileId: string, email: string, password: string): Promise<{ display_name: string | null }> {
    // Validamos las credenciales con un login real antes de persistir nada.
    const probe = new GarminConnect({ username: email, password });
    await probe.login();
    let displayName: string | null = null;
    try {
      // displayName es un GCUserHash (UUID) — el nombre legible está en fullName.
      const profile: any = await probe.getUserProfile();
      displayName = profile?.fullName || profile?.userName || profile?.displayName || null;
    } catch { /* opcional, no abortar */ }

    const e = encrypt(email);
    const p = encrypt(password);
    const { error } = await supabase
      .from('garmin_connections')
      .upsert(
        {
          profile_id: profileId,
          email_encrypted: e.ciphertext,
          email_iv: e.iv,
          email_tag: e.tag,
          password_encrypted: p.ciphertext,
          password_iv: p.iv,
          password_tag: p.tag,
          display_name: displayName,
          last_sync_at: null,
          last_sync_error: null,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' },
      );
    if (error) throw error;

    // Cachear el cliente probado para evitar re-loguear inmediatamente.
    clientCache.set(profileId, { client: probe, loggedInAt: Date.now() });
    return { display_name: displayName };
  },

  async disconnect(profileId: string): Promise<void> {
    clientCache.delete(profileId);
    const { error } = await supabase
      .from('garmin_connections')
      .delete()
      .eq('profile_id', profileId);
    if (error) throw error;
  },

  async getStatus(profileId: string) {
    const { data, error } = await supabase
      .from('garmin_connections')
      .select('display_name, last_sync_at, last_sync_error, connected_at')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async syncRecent(profileId: string, days = 2): Promise<{ activities: number; days_synced: number }> {
    const today = new Date();
    let daysSynced = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toIsoDateLocal(d);
      try {
        await syncSleep(profileId, iso);
        await syncDailyMetrics(profileId, iso);
        daysSynced += 1;
      } catch (err) {
        console.error('[garmin] daily sync failed for', iso, err);
      }
    }
    const activities = await syncActivities(profileId, Math.max(days, 7));

    await supabase
      .from('garmin_connections')
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq('profile_id', profileId);

    return { activities, days_synced: daysSynced };
  },

  // Sync inicial al conectar — más histórico (30 días).
  async initialBackfill(profileId: string): Promise<{ activities: number; days_synced: number }> {
    return this.syncRecent(profileId, 14);
  },

  // Backfill profundo on-demand: trae N días de actividades + sleep + daily metrics.
  // Pensado para que el usuario pueda recuperar histórico viejo desde Settings.
  // Sleep/daily metrics son requests por día, así que en N=180 son ~360 requests
  // (sleep + daily). Garmin suele aguantarlo, pero le ponemos un sleep entre
  // requests para no abusar y un cap de 365.
  async backfillHistory(profileId: string, days: number): Promise<{ activities: number; days_synced: number }> {
    const cappedDays = Math.max(1, Math.min(365, Math.floor(days)));

    // 1. Activities en una sola tirada (con paginación interna en syncActivities).
    const activities = await syncActivities(profileId, cappedDays);

    // 2. Sleep + daily metrics día por día. Tarda — para 90 días, ~3 minutos.
    const today = new Date();
    let daysSynced = 0;
    for (let i = 0; i < cappedDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toIsoDateLocal(d);
      try {
        await syncSleep(profileId, iso);
        await syncDailyMetrics(profileId, iso);
        daysSynced += 1;
      } catch (err) {
        console.error('[garmin] backfill daily failed for', iso, err);
      }
      // pausa cortita para no saturar Garmin
      await new Promise(r => setTimeout(r, 80));
    }

    await supabase
      .from('garmin_connections')
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq('profile_id', profileId);

    return { activities, days_synced: daysSynced };
  },

  // Para el cron diario.
  async backfillRecentForAllConnections(): Promise<{ checked: number; errors: number }> {
    const { data, error } = await supabase.from('garmin_connections').select('profile_id');
    if (error) throw error;
    let errors = 0;
    for (const row of (data ?? []) as { profile_id: string }[]) {
      try {
        await this.syncRecent(row.profile_id, 2);
      } catch (err: any) {
        errors += 1;
        console.error('[garmin] cron sync failed for profile', row.profile_id, err);
        await supabase
          .from('garmin_connections')
          .update({ last_sync_error: String(err?.message ?? err) })
          .eq('profile_id', row.profile_id);
      }
    }
    return { checked: (data ?? []).length, errors };
  },
};
