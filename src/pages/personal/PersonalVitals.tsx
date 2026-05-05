import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Battery, Footprints, Flame, Heart, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { MobileHeader, Card } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { usePersistentState } from '../../hooks/usePersistentState';
import { PersonalDailyMetricsService } from '../../services/PersonalTrackerService';
import { api } from '../../services/api';
import { PersonalDailyMetrics } from '../../../shared/types';

type MetricKey = 'steps' | 'total_kcal' | 'resting_hr_bpm' | 'avg_stress' | 'body_battery_high';

const METRIC_LABELS: Record<MetricKey, string> = {
  steps: 'Pasos',
  total_kcal: 'Kcal totales',
  resting_hr_bpm: 'HR rest',
  avg_stress: 'Stress',
  body_battery_high: 'Body battery max',
};

export const PersonalVitals: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  const [items, setItems, hadCache] = usePersistentState<PersonalDailyMetrics[]>('v1:vitals:items', []);
  const [loading, setLoading] = useState(!hadCache);
  const [chartMetric, setChartMetric] = useState<MetricKey>('steps');

  const reload = async (profileId: string) => {
    const rows = await PersonalDailyMetricsService.list(profileId, 30);
    // Filtra registros sin métricas reales — Garmin a veces deja la fila del
    // día actual vacía hasta que el reloj sincroniza.
    setItems(rows.filter(r => r.steps != null || r.body_battery_current != null || r.resting_hr_bpm != null));
  };

  useEffect(() => {
    if (!profile) return;
    if (!hadCache) setLoading(true);
    reload(profile.id)
      .catch(err => console.error('[vitals] load failed', err))
      .finally(() => setLoading(false));
    // Auto-sync silencioso si Garmin está conectado y la última sync es vieja.
    api.garmin.maybeSync(profile.id, 30).then((triggered) => {
      if (triggered) {
        setTimeout(() => { reload(profile.id).catch(() => {}); }, 12_000);
      }
    });
  }, [profile?.id]);

  const today = items[0] ?? null;

  const chartData = useMemo(
    () => [...items].reverse().filter(i => i[chartMetric] != null).map(i => ({
      date: i.metric_date,
      value: i[chartMetric] as number,
    })),
    [items, chartMetric],
  );

  const stepsPct = today?.steps != null && today?.steps_goal
    ? Math.min(100, Math.round((today.steps / today.steps_goal) * 100))
    : null;

  return (
    <>
      <MobileHeader title="Vitals" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && !today && (
          <Card className="mt-4" tone="tinted">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-[var(--color-ink-muted)]" />
              <p className="text-sm text-[var(--color-ink)]">
                Sin datos de Garmin hoy. Conectá Garmin desde Ajustes para empezar.
              </p>
            </div>
          </Card>
        )}

        {!loading && today && (
          <>
            <Card className="mt-4" tone="ink">
              <p className="text-xs uppercase tracking-wider opacity-60">Body Battery</p>
              <p className="font-serif text-5xl mt-1">
                {today.body_battery_current ?? '—'}
                <span className="text-base opacity-60 ml-1">/ 100</span>
              </p>
              {today.body_battery_high != null && today.body_battery_low != null && (
                <p className="text-xs opacity-60 mt-1">
                  Hoy: {today.body_battery_low} → {today.body_battery_high}
                </p>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Tile
                icon={<Footprints size={16} strokeWidth={1.75} />}
                label="Pasos"
                value={today.steps?.toLocaleString('es-AR') ?? '—'}
                hint={stepsPct != null ? `${stepsPct}% del goal` : undefined}
                accent="bg-amber-100 text-amber-700"
              />
              <Tile
                icon={<Flame size={16} strokeWidth={1.75} />}
                label="Kcal totales"
                value={today.total_kcal?.toLocaleString('es-AR') ?? '—'}
                hint={today.active_kcal != null ? `${today.active_kcal} activas` : undefined}
                accent="bg-orange-100 text-orange-700"
              />
              <Tile
                icon={<Heart size={16} strokeWidth={1.75} />}
                label="HR rest"
                value={today.resting_hr_bpm != null ? `${today.resting_hr_bpm} bpm` : '—'}
                hint={today.max_hr_bpm != null ? `max ${today.max_hr_bpm}` : undefined}
                accent="bg-rose-100 text-rose-700"
              />
              <Tile
                icon={<Activity size={16} strokeWidth={1.75} />}
                label="Stress"
                value={today.avg_stress != null ? `${today.avg_stress} / 100` : '—'}
                hint={today.intensity_minutes != null ? `${today.intensity_minutes} min intensos` : undefined}
                accent="bg-violet-100 text-violet-700"
              />
            </div>

            {chartData.length > 1 && (
              <Card className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                    Histórico · {METRIC_LABELS[chartMetric]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(Object.keys(METRIC_LABELS) as MetricKey[]).map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setChartMetric(k)}
                      className={`px-2.5 py-1 rounded-full text-[11px] ${
                        chartMetric === k
                          ? 'bg-[var(--color-ink)] text-white'
                          : 'border border-[var(--color-ink)]/15 text-[var(--color-ink)]'
                      }`}
                    >
                      {METRIC_LABELS[k]}
                    </button>
                  ))}
                </div>
                <div className="h-28 -mx-2">
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip
                        contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 8, fontSize: 11, color: 'white' }}
                        labelFormatter={(d) => new Date(d as string).toLocaleDateString('es-AR')}
                      />
                      <Line type="monotone" dataKey="value" stroke="#0A0A0A" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mt-6 mb-2 px-1">Histórico</p>
            <div className="space-y-2">
              {items.slice(0, 14).map(d => (
                <Card key={d.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight capitalize">
                        {new Date(d.metric_date).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </h4>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                        {d.steps != null ? `${d.steps.toLocaleString('es-AR')} pasos` : ''}
                        {d.total_kcal != null ? ` · ${d.total_kcal} kcal` : ''}
                        {d.resting_hr_bpm != null ? ` · ${d.resting_hr_bpm}bpm` : ''}
                      </p>
                    </div>
                    {d.body_battery_high != null && (
                      <div className="text-right shrink-0">
                        <p className="font-serif text-lg text-[var(--color-ink)]">{d.body_battery_high}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">battery max</p>
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

const Tile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}> = ({ icon, label, value, hint, accent }) => (
  <Card padding="sm">
    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${accent}`}>
      {icon}
    </div>
    <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mt-3">{label}</p>
    <p className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">{value}</p>
    {hint && <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5">{hint}</p>}
  </Card>
);
