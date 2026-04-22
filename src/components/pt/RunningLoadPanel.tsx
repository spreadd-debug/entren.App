import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Loader2,
  BatteryLow,
  CalendarX,
  Repeat,
  Info,
} from 'lucide-react';
import {
  Area,
  ComposedChart,
  Bar,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../UI';
import { api } from '../../services/api';
import { RunningAlertKind, RunningLoadSummary } from '../../../shared/types';

interface RunningLoadPanelProps {
  studentId: string;
}

const ALERT_ICON: Record<RunningAlertKind, React.ReactNode> = {
  volume_spike: <TrendingUp size={14} />,
  inactive: <CalendarX size={14} />,
  monotony: <Repeat size={14} />,
  tsb_negative: <BatteryLow size={14} />,
};

function fmtChartLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function deltaVs7DaysAgo(history: RunningLoadSummary['history'], key: 'ctl' | 'atl' | 'tsb'): number | null {
  if (history.length < 8) return null;
  const today = history[history.length - 1][key];
  const past = history[history.length - 8][key];
  return Math.round((today - past) * 10) / 10;
}

const SEV_BADGE: Record<string, string> = {
  alert: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  warn: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  info: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const SEV_LABEL: Record<string, string> = {
  alert: 'Alerta',
  warn: 'Atención',
  info: 'Info',
};

export const RunningLoadPanel: React.FC<RunningLoadPanelProps> = ({ studentId }) => {
  const [summary, setSummary] = useState<RunningLoadSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.running.load.getSummary(studentId)
      .then(s => { if (!cancelled) setSummary(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center text-sm text-slate-400 py-6">
          <Loader2 className="animate-spin mr-2" size={16} /> Calculando carga…
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-4">
        <p className="text-sm text-slate-500 text-center py-4">
          No se pudo calcular la carga de entrenamiento.
        </p>
      </Card>
    );
  }

  const ctlDelta = deltaVs7DaysAgo(summary.history, 'ctl');
  const atlDelta = deltaVs7DaysAgo(summary.history, 'atl');
  const tsbDelta = deltaVs7DaysAgo(summary.history, 'tsb');

  const chartData = summary.history.map(d => ({
    label: fmtChartLabel(d.date),
    ctl: d.ctl,
    atl: d.atl,
    tsb: d.tsb,
  }));

  const formColor =
    summary.current.tsb < -30 ? 'text-rose-600 dark:text-rose-400'
      : summary.current.tsb < -10 ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="space-y-4">
      {/* Banner si falta birth_date */}
      {!summary.has_birth_date && (
        <Card className="p-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Cargá la <strong>fecha de nacimiento</strong> del alumno en su perfil para mejorar la precisión de las métricas (hoy se estiman por km).
            </p>
          </div>
        </Card>
      )}

      {/* CTL / ATL / TSB cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fitness (CTL)
          </p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
            {summary.current.ctl}
          </p>
          {ctlDelta !== null && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-0.5">
              {ctlDelta > 0 ? <TrendingUp size={10} /> : ctlDelta < 0 ? <TrendingDown size={10} /> : null}
              {ctlDelta > 0 ? '+' : ''}{ctlDelta} vs 7d
            </p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fatiga (ATL)
          </p>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {summary.current.atl}
          </p>
          {atlDelta !== null && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-0.5">
              {atlDelta > 0 ? <TrendingUp size={10} /> : atlDelta < 0 ? <TrendingDown size={10} /> : null}
              {atlDelta > 0 ? '+' : ''}{atlDelta} vs 7d
            </p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Forma (TSB)
          </p>
          <p className={`text-xl font-black mt-0.5 ${formColor}`}>
            {summary.current.tsb > 0 ? '+' : ''}{summary.current.tsb}
          </p>
          {tsbDelta !== null && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-0.5">
              {tsbDelta > 0 ? <TrendingUp size={10} /> : tsbDelta < 0 ? <TrendingDown size={10} /> : null}
              {tsbDelta > 0 ? '+' : ''}{tsbDelta} vs 7d
            </p>
          )}
        </Card>
      </div>

      {/* Chart fitness/fatigue/form */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="text-violet-500" size={16} />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Carga de entrenamiento (60 días)
            </h4>
          </div>
          {summary.hr_max != null && (
            <span className="text-[10px] text-slate-400">
              FCmax estimada: {summary.hr_max} bpm{summary.age != null ? ` · ${summary.age} años` : ''}
            </span>
          )}
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={Math.floor(chartData.length / 8)}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v: number, name: string) => [v, name]}
              />
              <Bar dataKey="tsb" fill="#94a3b8" opacity={0.4} name="TSB (forma)" />
              <Line
                type="monotone"
                dataKey="ctl"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="CTL (fitness)"
              />
              <Line
                type="monotone"
                dataKey="atl"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                name="ATL (fatiga)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Alertas activas */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-amber-500" size={16} />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Alertas {summary.alerts.length > 0 && `(${summary.alerts.length})`}
          </h4>
        </div>
        {summary.alerts.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
            Sin alertas — el alumno está en una buena ventana de carga.
          </p>
        ) : (
          <div className="space-y-2">
            {summary.alerts.map((a, i) => (
              <div
                key={`${a.kind}-${i}`}
                className={`flex items-start gap-2 p-2.5 rounded-lg border ${SEV_BADGE[a.severity]}`}
              >
                <div className="mt-0.5">{ALERT_ICON[a.kind]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {SEV_LABEL[a.severity]}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
