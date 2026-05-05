import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { MobileHeader, Card } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { PersonalSleepService } from '../../services/PersonalTrackerService';
import { api } from '../../services/api';
import { PersonalSleep as PSleep } from '../../../shared/types';

function fmtHours(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
}

// "Anoche" sólo cuando el sleep es de hoy (Garmin marca sleep_date = fecha de despertar).
// Si la última noche registrada es vieja, mostramos algo claro tipo "Hace N días".
function relativeLabel(sleepDateIso: string): string {
  const sleep = new Date(sleepDateIso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - sleep.getTime()) / 86_400_000);
  if (days <= 1) return 'Anoche';
  if (days <= 7) return `Hace ${days} días`;
  return sleep.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export const PersonalSleep: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  const [items, setItems] = useState<PSleep[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async (profileId: string) => {
    const rows = await PersonalSleepService.list(profileId, 30);
    // Garmin a veces crea filas vacías para la fecha del día actual antes de
    // que termines de dormir. Filtramos cualquier registro sin minutos válidos.
    setItems(rows.filter(r => (r.total_seconds ?? 0) > 0));
  };

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    reload(profile.id)
      .catch(err => console.error('[sleep] load failed', err))
      .finally(() => setLoading(false));
    // Auto-sync silencioso si Garmin está conectado y la última sync es vieja.
    api.garmin.maybeSync(profile.id, 30).then((triggered) => {
      if (triggered) {
        setTimeout(() => { reload(profile.id).catch(() => {}); }, 12_000);
      }
    });
  }, [profile?.id]);

  const last = items[0] ?? null;

  const stages = useMemo(() => {
    if (!last || !last.total_seconds) return null;
    const total = last.total_seconds;
    return [
      { key: 'deep',  label: 'Deep',  seconds: last.deep_seconds  ?? 0, color: '#312E81' },
      { key: 'rem',   label: 'REM',   seconds: last.rem_seconds   ?? 0, color: '#7C3AED' },
      { key: 'light', label: 'Light', seconds: last.light_seconds ?? 0, color: '#A5B4FC' },
      { key: 'awake', label: 'Awake', seconds: last.awake_seconds ?? 0, color: '#FCA5A5' },
    ].map(s => ({ ...s, pct: total > 0 ? Math.round((s.seconds / total) * 100) : 0 }));
  }, [last]);

  const trend = useMemo(
    () => [...items].reverse().filter(i => i.sleep_score != null).map(i => ({
      date: i.sleep_date,
      score: i.sleep_score,
    })),
    [items],
  );

  return (
    <>
      <MobileHeader title="Sleep" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && !last && (
          <Card className="mt-4" tone="tinted">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-[var(--color-ink-muted)]" />
              <p className="text-sm text-[var(--color-ink)]">
                Sin datos de sueño. Conectá Garmin desde Ajustes para empezar a importar.
              </p>
            </div>
          </Card>
        )}

        {!loading && last && (
          <>
            <Card className="mt-4" tone="ink">
              <p className="text-xs uppercase tracking-wider opacity-60">{relativeLabel(last.sleep_date)}</p>
              <p className="font-serif text-5xl mt-1">{fmtHours(last.total_seconds)}</p>
              {last.sleep_score != null && (
                <p className="text-sm opacity-80 mt-1">Sleep score <span className="font-semibold">{last.sleep_score}/100</span></p>
              )}

              {stages && (
                <div className="mt-5 space-y-2.5">
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/10">
                    {stages.map(s => (
                      <div key={s.key} style={{ width: `${s.pct}%`, background: s.color }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {stages.map(s => (
                      <div key={s.key}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span className="text-[10px] uppercase tracking-wider opacity-60">{s.label}</span>
                        </div>
                        <p className="text-sm font-semibold mt-0.5">{s.pct}%</p>
                        <p className="text-[10px] opacity-50">{fmtHours(s.seconds)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60">HR rest</p>
                  <p className="font-serif text-lg mt-0.5">{last.avg_hr_bpm ?? '—'}<span className="text-xs opacity-60 ml-1">bpm</span></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60">HRV</p>
                  <p className="font-serif text-lg mt-0.5">{last.avg_hrv_ms ?? '—'}<span className="text-xs opacity-60 ml-1">ms</span></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60">Battery Δ</p>
                  <p className="font-serif text-lg mt-0.5">{last.body_battery_change != null ? (last.body_battery_change > 0 ? '+' : '') + last.body_battery_change : '—'}</p>
                </div>
              </div>
            </Card>

            {trend.length > 1 && (
              <Card className="mt-3">
                <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Sleep score · últimos {trend.length} días</p>
                <div className="h-28 mt-3 -mx-2">
                  <ResponsiveContainer>
                    <LineChart data={trend} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 8, fontSize: 11, color: 'white' }}
                        labelFormatter={(d) => new Date(d as string).toLocaleDateString('es-AR')}
                        formatter={(v) => [`${v}/100`, 'Score']}
                      />
                      <Line type="monotone" dataKey="score" stroke="#0A0A0A" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mt-6 mb-2 px-1">Histórico</p>
            <div className="space-y-2">
              {items.map(s => (
                <Card key={s.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight capitalize">
                        {fmtDate(s.sleep_date)}
                      </h4>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                        {fmtHours(s.total_seconds)}
                        {s.deep_seconds != null && ` · D ${Math.round((s.deep_seconds / (s.total_seconds || 1)) * 100)}%`}
                        {s.rem_seconds != null && ` · REM ${Math.round((s.rem_seconds / (s.total_seconds || 1)) * 100)}%`}
                      </p>
                    </div>
                    {s.sleep_score != null && (
                      <div className="text-right shrink-0">
                        <p className="font-serif text-2xl text-[var(--color-ink)]">{s.sleep_score}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">score</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};
