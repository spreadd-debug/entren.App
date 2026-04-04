import React from 'react';
import { Moon, Zap, Smile, Activity } from 'lucide-react';
import { safe } from '../../utils/safeRender';
import type { WellnessCheckIn } from '../../../shared/types';

interface WellnessQuickViewProps {
  today: WellnessCheckIn | null;
  history: WellnessCheckIn[];
  averages: { energy: number; sleep_quality: number; mood: number; soreness: number; count: number };
}

const METRICS = [
  { key: 'energy' as const, label: 'Energia', icon: Zap, goodHigh: true },
  { key: 'sleep_quality' as const, label: 'Sueno', icon: Moon, goodHigh: true },
  { key: 'mood' as const, label: 'Animo', icon: Smile, goodHigh: true },
  { key: 'soreness' as const, label: 'Dolor', icon: Activity, goodHigh: false },
];

function valueColor(value: number, goodHigh: boolean): string {
  const isGood = goodHigh ? value >= 3.5 : value <= 2;
  const isBad = goodHigh ? value < 2.5 : value > 3.5;

  if (isGood) return 'text-emerald-600 dark:text-emerald-400';
  if (isBad) return 'text-rose-600 dark:text-rose-400';
  return 'text-amber-600 dark:text-amber-400';
}

function barColor(value: number, goodHigh: boolean): string {
  const isGood = goodHigh ? value >= 3.5 : value <= 2;
  const isBad = goodHigh ? value < 2.5 : value > 3.5;

  if (isGood) return 'bg-emerald-500';
  if (isBad) return 'bg-rose-500';
  return 'bg-amber-500';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
}

export const WellnessQuickView: React.FC<WellnessQuickViewProps> = ({ today, history, averages }) => {
  if (averages.count === 0 && !today) {
    return (
      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
        Sin check-ins de bienestar esta semana
      </div>
    );
  }

  // Merge today into history if not already there
  const allCheckins = [...history];
  if (today && !allCheckins.find((c) => c.checkin_date === today.checkin_date)) {
    allCheckins.unshift(today);
  }
  const recent = allCheckins.slice(0, 7);

  return (
    <div className="space-y-4">
      {/* Averages row */}
      <div className="grid grid-cols-4 gap-2">
        {METRICS.map((m) => {
          const val = averages[m.key];
          const Icon = m.icon;
          return (
            <div key={m.key} className="text-center">
              <Icon size={16} className="mx-auto mb-1 text-slate-400 dark:text-slate-500" />
              <div className={`text-lg font-bold ${valueColor(val, m.goodHigh)}`}>
                {safe(val > 0 ? val.toFixed(1) : '-', `avg.${m.key}`)}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                {m.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily bars */}
      {recent.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Ultimos dias
          </p>
          <div className="space-y-1">
            {recent.map((c) => (
              <div key={c.checkin_date} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-500 dark:text-slate-400 shrink-0 text-right">
                  {safe(formatDate(c.checkin_date), 'checkin_date')}
                </span>
                <div className="flex-1 flex items-center gap-1">
                  {METRICS.map((m) => {
                    const val = c[m.key];
                    const widthPct = (val / 5) * 100;
                    return (
                      <div key={m.key} className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden" title={`${m.label}: ${val}/5`}>
                        <div
                          className={`h-full rounded-full transition-all ${barColor(val, m.goodHigh)}`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1 px-18 text-[9px] text-slate-400 dark:text-slate-500">
            {METRICS.map((m) => (
              <span key={m.key} className="flex-1 text-center">{m.label.slice(0, 3)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
