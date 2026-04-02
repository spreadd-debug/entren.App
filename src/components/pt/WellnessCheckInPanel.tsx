import React, { useEffect, useState } from 'react';
import { Activity, Moon, Smile, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../UI';
import { WellnessCheckInService } from '../../services/pt/WellnessCheckInService';
import { WellnessCheckIn } from '../../../shared/types';

interface WellnessCheckInPanelProps {
  studentId: string;
  gymId: string;
}

const METRICS: {
  key: keyof Pick<WellnessCheckIn, 'energy' | 'sleep_quality' | 'mood' | 'soreness'>;
  label: string;
  icon: React.ElementType;
  emojis: string[];
  invertColor?: boolean; // soreness: high = bad
}[] = [
  { key: 'energy', label: 'Energía', icon: Activity, emojis: ['😴', '😑', '😐', '😊', '⚡'] },
  { key: 'sleep_quality', label: 'Sueño', icon: Moon, emojis: ['😫', '😕', '😐', '😌', '😴'] },
  { key: 'mood', label: 'Ánimo', icon: Smile, emojis: ['😢', '😟', '😐', '🙂', '😄'] },
  { key: 'soreness', label: 'Dolor', icon: AlertTriangle, emojis: ['✅', '🟡', '😐', '😣', '🔴'], invertColor: true },
];

const getColor = (val: number, invert?: boolean) => {
  const effective = invert ? 6 - val : val;
  if (effective >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (effective >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const getBgColor = (val: number, invert?: boolean) => {
  const effective = invert ? 6 - val : val;
  if (effective >= 4) return 'bg-emerald-500/10';
  if (effective >= 3) return 'bg-amber-500/10';
  return 'bg-rose-500/10';
};

export const WellnessCheckInPanel: React.FC<WellnessCheckInPanelProps> = ({ studentId }) => {
  const [history, setHistory] = useState<WellnessCheckIn[]>([]);
  const [averages, setAverages] = useState<{ energy: number; sleep_quality: number; mood: number; soreness: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hist, avg] = await Promise.all([
          WellnessCheckInService.getHistory(studentId, 30),
          WellnessCheckInService.getAverages(studentId, 7),
        ]);
        setHistory(hist);
        setAverages(avg);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [studentId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Activity className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={32} />
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          El alumno aún no registró check-ins de bienestar.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Los check-ins aparecerán cuando el alumno los complete desde su portal.
        </p>
      </Card>
    );
  }

  const formatDate = (d: string) => {
    const date = new Date(d + 'T12:00:00');
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const getTrend = (key: string) => {
    if (history.length < 3) return null;
    const recent = history.slice(0, 3);
    const older = history.slice(3, 7);
    if (older.length === 0) return null;
    const avgRecent = recent.reduce((s, c) => s + (c as any)[key], 0) / recent.length;
    const avgOlder = older.reduce((s, c) => s + (c as any)[key], 0) / older.length;
    const diff = avgRecent - avgOlder;
    if (Math.abs(diff) < 0.3) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  return (
    <div className="space-y-4">
      {/* Promedios 7 días */}
      {averages && averages.count > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Promedio últimos 7 días
            <span className="text-xs font-normal text-slate-400 ml-2">({averages.count} check-ins)</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {METRICS.map((m) => {
              const val = averages[m.key];
              const trend = getTrend(m.key);
              return (
                <div key={m.key} className={`rounded-xl p-3 ${getBgColor(Math.round(val), m.invertColor)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{m.label}</span>
                    {trend === 'up' && <TrendingUp size={14} className={m.invertColor ? 'text-rose-500' : 'text-emerald-500'} />}
                    {trend === 'down' && <TrendingDown size={14} className={m.invertColor ? 'text-emerald-500' : 'text-rose-500'} />}
                    {trend === 'stable' && <Minus size={14} className="text-slate-400" />}
                  </div>
                  <div className={`text-lg font-bold ${getColor(Math.round(val), m.invertColor)}`}>
                    {val.toFixed(1)}
                    <span className="text-xs font-normal"> /5</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Historial */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Historial de check-ins
        </h3>
        <div className="space-y-2">
          {history.map((ci) => (
            <div
              key={ci.id}
              className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className="text-xs text-slate-400 dark:text-slate-500 w-14 shrink-0 font-medium">
                {formatDate(ci.checkin_date)}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {METRICS.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center gap-0.5"
                    title={`${m.label}: ${ci[m.key]}/5`}
                  >
                    <span className="text-sm">{m.emojis[ci[m.key] - 1]}</span>
                  </div>
                ))}
              </div>
              {ci.notes && (
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]" title={ci.notes}>
                  {ci.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
