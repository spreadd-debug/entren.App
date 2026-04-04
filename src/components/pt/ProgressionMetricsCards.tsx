import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { safe } from '../../utils/safeRender';
import type { ProgressionMetrics } from '../../services/pt/PreSessionService';

interface ProgressionMetricsCardsProps {
  metrics: ProgressionMetrics;
}

function VolumeChart({ volumes }: { volumes: number[] }) {
  const max = Math.max(...volumes, 1);
  // Reverse so oldest is left, most recent is right
  const reversed = [...volumes].reverse();

  return (
    <div className="flex items-end gap-1 h-12">
      {reversed.map((v, i) => {
        const heightPct = max > 0 ? (v / max) * 100 : 0;
        const isLatest = i === reversed.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div
              className={`w-full rounded-t-sm transition-all ${
                isLatest
                  ? 'bg-indigo-500'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
              style={{ height: `${Math.max(heightPct, 4)}%` }}
              title={`${Math.round(v).toLocaleString()} kg`}
            />
          </div>
        );
      })}
    </div>
  );
}

export const ProgressionMetricsCards: React.FC<ProgressionMetricsCardsProps> = ({ metrics }) => {
  const currentVolume = metrics.weeklyVolume[0] ?? 0;
  const prevVolume = metrics.weeklyVolume[1] ?? 0;
  const volumeDelta = prevVolume > 0
    ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    : 0;

  const currentFreq = metrics.weeklyFrequency[0] ?? 0;

  return (
    <div className="space-y-3">
      {/* Volume + Frequency row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weekly Volume */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={14} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vol. semanal
            </span>
          </div>
          <VolumeChart volumes={metrics.weeklyVolume} />
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {safe(currentVolume > 0 ? `${(currentVolume / 1000).toFixed(1)}t` : '-', 'currentVolume')}
            </span>
            {volumeDelta !== 0 && (
              <span className={`text-xs font-semibold ${volumeDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {volumeDelta > 0 ? '+' : ''}{safe(volumeDelta, 'volumeDelta')}%
              </span>
            )}
          </div>
        </div>

        {/* Weekly Frequency */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={14} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Frecuencia
            </span>
          </div>
          <div className="flex items-end gap-1 h-12">
            {[...metrics.weeklyFrequency].reverse().map((f, i) => {
              const isLatest = i === metrics.weeklyFrequency.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400">{safe(f, 'freq')}</span>
                  <div
                    className={`w-full rounded-t-sm ${isLatest ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    style={{ height: `${Math.max((f / Math.max(...metrics.weeklyFrequency, 1)) * 100, 8)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {safe(currentFreq, 'currentFreq')} ses/sem
            </span>
          </div>
        </div>
      </div>

      {/* Progressions + Stagnations */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top Progressions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Progreso
            </span>
          </div>
          {metrics.topProgressions.length > 0 ? (
            <div className="space-y-1.5">
              {metrics.topProgressions.map((p) => (
                <div key={p.exercise} className="text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{safe(p.exercise, 'prog.exercise')}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">+{safe(p.deltaKg, 'prog.deltaKg')}kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos</p>
          )}
        </div>

        {/* Top Stagnations */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estancado
            </span>
          </div>
          {metrics.topStagnations.length > 0 ? (
            <div className="space-y-1.5">
              {metrics.topStagnations.map((s) => (
                <div key={s.exercise} className="text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{safe(s.exercise, 'stag.exercise')}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">{safe(s.sameWeightSessions, 'stag.sessions')} ses</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Sin estancamientos</p>
          )}
        </div>
      </div>
    </div>
  );
};
