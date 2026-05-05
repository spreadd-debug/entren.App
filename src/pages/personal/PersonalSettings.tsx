import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, RefreshCw, Trash2 } from 'lucide-react';
import { MobileHeader, Card } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { api } from '../../services/api';

interface GarminStatus {
  display_name: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  connected_at: string;
}

export const PersonalSettings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, update, loading } = usePersonalProfile();
  const [form, setForm] = useState({
    display_name: '',
    weight_kg: '',
    height_cm: '',
    currency: 'ARS',
  });
  const [saving, setSaving] = useState(false);

  // Garmin connection state
  const [garminStatus, setGarminStatus] = useState<GarminStatus | null>(null);
  const [garminLoading, setGarminLoading] = useState(false);
  const [garminForm, setGarminForm] = useState({ email: '', password: '' });
  const [garminBusy, setGarminBusy] = useState<'connect' | 'sync' | 'backfill' | 'disconnect' | null>(null);
  const [backfillDays, setBackfillDays] = useState<number>(90);
  const [garminError, setGarminError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? '',
      weight_kg: profile.weight_kg != null ? String(profile.weight_kg) : '',
      height_cm: profile.height_cm != null ? String(profile.height_cm) : '',
      currency: profile.currency ?? 'ARS',
    });
  }, [profile?.id]);

  const refreshGarminStatus = async () => {
    if (!profile) return;
    setGarminLoading(true);
    try {
      const status = await api.garmin.getStatus(profile.id);
      setGarminStatus(status);
    } catch (err) {
      console.error('[settings] garmin status failed', err);
    } finally {
      setGarminLoading(false);
    }
  };

  useEffect(() => { refreshGarminStatus(); /* eslint-disable-next-line */ }, [profile?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({
        display_name: form.display_name || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        currency: form.currency || 'ARS',
      });
      navigate(-1);
    } catch (err) {
      console.error('[settings] save failed', err);
      alert('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleGarminConnect = async () => {
    if (!profile) return;
    if (!garminForm.email || !garminForm.password) {
      setGarminError('Email y password requeridos');
      return;
    }
    setGarminBusy('connect');
    setGarminError(null);
    try {
      await api.garmin.connect(profile.id, garminForm.email, garminForm.password);
      setGarminForm({ email: '', password: '' });
      await refreshGarminStatus();
    } catch (err: any) {
      setGarminError(err?.message ?? 'No se pudo conectar');
    } finally {
      setGarminBusy(null);
    }
  };

  const handleGarminSync = async () => {
    if (!profile) return;
    setGarminBusy('sync');
    setGarminError(null);
    try {
      await api.garmin.sync(profile.id, 7);
      await refreshGarminStatus();
    } catch (err: any) {
      setGarminError(err?.message ?? 'Sync falló');
    } finally {
      setGarminBusy(null);
    }
  };

  const handleGarminBackfill = async () => {
    if (!profile) return;
    if (!confirm(`Importar ${backfillDays} días de actividades, sueño y métricas. Puede tardar 2-3 minutos. ¿Continuar?`)) return;
    setGarminBusy('backfill');
    setGarminError(null);
    try {
      const result = await api.garmin.backfill(profile.id, backfillDays);
      await refreshGarminStatus();
      alert(`Listo: ${result.activities} actividades, ${result.days_synced} días de sleep/métricas.`);
    } catch (err: any) {
      setGarminError(err?.message ?? 'Backfill falló');
    } finally {
      setGarminBusy(null);
    }
  };

  const handleGarminDisconnect = async () => {
    if (!profile) return;
    if (!confirm('¿Desconectar Garmin? Tus datos guardados quedan, pero se detiene la sincronización.')) return;
    setGarminBusy('disconnect');
    try {
      await api.garmin.disconnect(profile.id);
      setGarminStatus(null);
    } catch (err: any) {
      setGarminError(err?.message ?? 'No se pudo desconectar');
    } finally {
      setGarminBusy(null);
    }
  };

  return (
    <>
      <MobileHeader title="Ajustes" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && (
          <Card className="mt-4">
            <div className="space-y-4">
              <Field label="Nombre" type="text" value={form.display_name} onChange={v => setForm({ ...form, display_name: v })} placeholder="Mauro" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Peso (kg)" type="number" value={form.weight_kg} onChange={v => setForm({ ...form, weight_kg: v })} placeholder="75" />
                <Field label="Altura (cm)" type="number" value={form.height_cm} onChange={v => setForm({ ...form, height_cm: v })} placeholder="175" />
              </div>
              <Field label="Moneda" type="text" value={form.currency} onChange={v => setForm({ ...form, currency: v })} placeholder="ARS" />
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                El peso se usa para estimar las kcal de tus entrenamientos importados desde Strava.
              </p>
            </div>
          </Card>
        )}

        <button
          type="button"
          disabled={saving || loading}
          onClick={handleSave}
          className="w-full py-3 mt-4 rounded-full bg-[var(--color-ink)] text-white font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar perfil'}
        </button>

        {/* ── Garmin Connect ───────────────────────────────────────── */}
        <Card className="mt-6" tone="tinted">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-ink)] flex items-center justify-center text-white">
              <Activity size={16} strokeWidth={1.75} />
            </div>
            <h3 className="font-serif text-xl text-[var(--color-ink)]">Garmin Connect</h3>
          </div>

          {garminLoading && <p className="text-xs text-[var(--color-ink-muted)]">Cargando…</p>}

          {!garminLoading && garminStatus && (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Conectado como</p>
                <p className="font-serif text-lg text-[var(--color-ink)]">
                  {garminStatus.display_name ?? '—'}
                </p>
                <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                  Último sync: {garminStatus.last_sync_at
                    ? new Date(garminStatus.last_sync_at).toLocaleString('es-AR')
                    : 'nunca'}
                </p>
                {garminStatus.last_sync_error && (
                  <p className="text-[11px] text-rose-600 mt-1">⚠ {garminStatus.last_sync_error}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGarminSync}
                  disabled={garminBusy !== null}
                  className="flex-1 px-4 py-2 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={garminBusy === 'sync' ? 'animate-spin' : ''} />
                  {garminBusy === 'sync' ? 'Sincronizando…' : 'Sincronizar'}
                </button>
                <button
                  type="button"
                  onClick={handleGarminDisconnect}
                  disabled={garminBusy !== null}
                  className="px-4 py-2 rounded-full border border-rose-200 text-rose-600 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Desconectar
                </button>
              </div>

              {/* Backfill profundo: trae histórico viejo que el sync diario no
                  alcanza. El daily sync sólo trae los últimos 2 días. */}
              <div className="mt-3 pt-3 border-t border-[var(--color-ink)]/8">
                <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                  Importar historial: trae actividades + sueño + métricas viejas que no sincronizaron al conectar.
                </p>
                <div className="flex gap-2">
                  <select
                    value={backfillDays}
                    onChange={e => setBackfillDays(Number(e.target.value))}
                    disabled={garminBusy !== null}
                    className="flex-1 px-3 py-2 rounded-full bg-white border border-[var(--color-ink)]/15 text-[var(--color-ink)] text-sm disabled:opacity-50"
                  >
                    <option value={30}>30 días</option>
                    <option value={60}>60 días</option>
                    <option value={90}>90 días</option>
                    <option value={180}>180 días</option>
                    <option value={365}>1 año</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGarminBackfill}
                    disabled={garminBusy !== null}
                    className="px-4 py-2 rounded-full bg-[var(--color-cream-200)] text-[var(--color-ink)] text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {garminBusy === 'backfill' ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Importando…
                      </>
                    ) : (
                      'Importar'
                    )}
                  </button>
                </div>
                {garminBusy === 'backfill' && (
                  <p className="text-[11px] text-[var(--color-ink-muted)] mt-2 italic">
                    Esto puede tardar varios minutos. No cierres la app.
                  </p>
                )}
              </div>
            </div>
          )}

          {!garminLoading && !garminStatus && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-ink-muted)]">
                Importamos automáticamente todas tus actividades, sleep, body battery, steps y calorías desde Garmin Connect.
                Tus credenciales se guardan encriptadas.
              </p>
              <Field label="Email Garmin" type="email" value={garminForm.email} onChange={v => setGarminForm({ ...garminForm, email: v })} placeholder="tu@email.com" />
              <Field label="Password" type="password" value={garminForm.password} onChange={v => setGarminForm({ ...garminForm, password: v })} placeholder="••••••••" />
              <button
                type="button"
                onClick={handleGarminConnect}
                disabled={garminBusy !== null}
                className="w-full py-3 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium disabled:opacity-50"
              >
                {garminBusy === 'connect' ? 'Conectando + sincronizando…' : 'Conectar Garmin'}
              </button>
            </div>
          )}

          {garminError && (
            <p className="text-xs text-rose-600 mt-3">⚠ {garminError}</p>
          )}
        </Card>
      </div>
    </>
  );
};

const Field: React.FC<{ label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, type, value, onChange, placeholder }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
    />
  </label>
);
