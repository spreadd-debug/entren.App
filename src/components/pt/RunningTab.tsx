import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Plus, Pencil, Trash2, Loader2, Footprints } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, Button } from '../UI';
import { LogRunModal } from '../running/LogRunModal';
import { RunningLoadPanel } from './RunningLoadPanel';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  RunningSession,
  RunningSessionType,
  RunningWeeklyTotal,
} from '../../../shared/types';

interface RunningTabProps {
  studentId: string;
  gymId: string;
  /** 'pt' when rendered in the PT panel, 'student' when rendered in the portal. */
  loggedBy?: 'pt' | 'student';
  /** Hide editing controls when the athlete is browsing their own log. */
  readOnly?: boolean;
}

const TYPE_LABELS: Record<RunningSessionType, string> = {
  easy:      'Suave',
  long:      'Fondo',
  tempo:     'Tempo',
  intervals: 'Series',
  race:      'Carrera',
  other:     'Otro',
};

const TYPE_COLORS: Record<RunningSessionType, string> = {
  easy:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  long:      'bg-violet-500/10 text-violet-600 border-violet-500/20',
  tempo:     'bg-amber-500/10 text-amber-600 border-amber-500/20',
  intervals: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  race:      'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  other:     'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function fmtDate(iso: string): string {
  // YYYY-MM-DD
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function fmtWeekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const RunningTab: React.FC<RunningTabProps> = ({
  studentId,
  gymId,
  loggedBy = 'pt',
  readOnly = false,
}) => {
  const toast = useToast();
  const [sessions, setSessions] = useState<RunningSession[]>([]);
  const [weekly, setWeekly] = useState<RunningWeeklyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RunningSession | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([
        api.running.listSessions(studentId, { limit: 30 }),
        api.running.weeklyTotals(studentId, 8),
      ]);
      setSessions(list);
      setWeekly(totals);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  const totals = useMemo(() => {
    if (weekly.length === 0) return { week: { km: 0, min: 0, n: 0 }, last4: { km: 0, min: 0, n: 0 } };
    const current = weekly[weekly.length - 1];
    const last4 = weekly.slice(-4).reduce(
      (acc, w) => ({ km: acc.km + w.km, min: acc.min + w.minutes, n: acc.n + w.sessions }),
      { km: 0, min: 0, n: 0 },
    );
    return {
      week: { km: current.km, min: current.minutes, n: current.sessions },
      last4: {
        km: Math.round(last4.km * 10) / 10,
        min: Math.round(last4.min),
        n: last4.n,
      },
    };
  }, [weekly]);

  const chartData = weekly.map(w => ({ ...w, label: fmtWeekLabel(w.week_start) }));

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: RunningSession) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleDelete = async (s: RunningSession) => {
    if (!confirm(`Borrar la corrida del ${fmtDate(s.session_date)}?`)) return;
    try {
      await api.running.deleteSession(s.id);
      toast.success('Corrida eliminada');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Carga de entrenamiento + alertas (solo vista PT) */}
      {loggedBy === 'pt' && <RunningLoadPanel studentId={studentId} />}

      {/* Header con totales */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Esta semana</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.week.km} km</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {totals.week.n} {totals.week.n === 1 ? 'corrida' : 'corridas'} · {Math.round(totals.week.min)} min
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Últimas 4 sem</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.last4.km} km</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {totals.last4.n} {totals.last4.n === 1 ? 'corrida' : 'corridas'} · {totals.last4.min} min
          </p>
        </Card>
        {!readOnly && (
          <div className="col-span-2 md:col-span-1 flex">
            <Button variant="primary" fullWidth onClick={openNew}>
              <Plus size={16} /> Cargar corrida
            </Button>
          </div>
        )}
      </div>

      {/* Gráfico 8 semanas */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="text-violet-500" size={16} />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Volumen semanal (km · 8 semanas)</h4>
        </div>
        <div className="h-48">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              <Loader2 className="animate-spin mr-2" size={16} /> Cargando…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: number) => [`${v} km`, 'Volumen']}
                />
                <Bar dataKey="km" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Lista de sesiones */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Footprints className="text-violet-500" size={16} />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Historial</h4>
        </div>
        {loading ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            <Loader2 className="animate-spin inline mr-2" size={16} /> Cargando…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
            Todavía no hay corridas registradas.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map(s => (
              <div key={s.id} className="py-3 flex items-center gap-3">
                <div className="w-14 shrink-0 text-center">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{fmtDate(s.session_date)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_COLORS[s.session_type]}`}>
                      {TYPE_LABELS[s.session_type]}
                    </span>
                    {s.source === 'strava' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-orange-500/10 text-orange-600 border-orange-500/20">
                        Strava
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {Number(s.distance_km).toFixed(2)} km
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      · {fmtDuration(s.duration_seconds)}
                    </span>
                    <span className="text-xs text-violet-500 font-semibold">
                      · {fmtPace(s.pace_seconds_per_km)}
                    </span>
                    {s.avg_hr_bpm != null && (
                      <span className="text-xs text-rose-500">· {s.avg_hr_bpm} bpm</span>
                    )}
                  </div>
                  {s.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{s.notes}</p>
                  )}
                </div>
                {!readOnly && (
                  s.source === 'strava' ? (
                    <div
                      className="shrink-0 text-[10px] font-semibold text-orange-500"
                      title="Importada de Strava — editala desde Strava para que el cambio se sincronice"
                    >
                      🔒
                    </div>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Borrar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <LogRunModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => load()}
        gymId={gymId}
        studentId={studentId}
        loggedBy={loggedBy}
        existing={editing}
      />
    </div>
  );
};
