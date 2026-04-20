import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Send, MessageCircle, MessagesSquare, Calendar,
  TrendingUp, AlertCircle, CheckCircle2, Save, RefreshCw, Trash2,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { OutreachDailyLog } from '../../../shared/types';
import { api } from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function pct(numer: number, denom: number): number | null {
  if (!denom || denom <= 0) return null;
  return Math.round((numer / denom) * 1000) / 10;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v}%`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  messages_sent: string;
  replies_received: string;
  conversations_started: string;
  demos_scheduled: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  messages_sent: '0',
  replies_received: '0',
  conversations_started: '0',
  demos_scheduled: '0',
  notes: '',
};

function toForm(log: OutreachDailyLog | null): FormState {
  if (!log) return EMPTY_FORM;
  return {
    messages_sent: String(log.messages_sent),
    replies_received: String(log.replies_received),
    conversations_started: String(log.conversations_started),
    demos_scheduled: String(log.demos_scheduled),
    notes: log.notes ?? '',
  };
}

// ── Diagnostic engine ─────────────────────────────────────────────────────────

type Diagnosis = {
  tone: 'ok' | 'warn' | 'bad';
  title: string;
  detail: string;
};

function diagnoseFunnel(totals: {
  messages: number;
  replies: number;
  conversations: number;
  demos: number;
}, daysElapsed: number): Diagnosis {
  const { messages, replies, conversations, demos } = totals;
  const msgsPerDay = daysElapsed > 0 ? messages / daysElapsed : 0;

  if (messages === 0) {
    return {
      tone: 'warn',
      title: 'Sin actividad registrada todavía',
      detail: 'Empezá cargando los números de hoy. La primera métrica a mover son los mensajes enviados.',
    };
  }

  // Stage 1: execution / discipline
  if (msgsPerDay < 5 && daysElapsed >= 3) {
    return {
      tone: 'warn',
      title: 'Pocos mensajes enviados',
      detail: `Promedio ${msgsPerDay.toFixed(1)} mensajes/día en ${daysElapsed} días. Es un problema de ejecución/disciplina, no de estrategia. Subí el volumen antes de optimizar otras etapas.`,
    };
  }

  const responseRate = pct(replies, messages);
  // Stage 2: copy / targeting
  if (responseRate != null && responseRate < 10) {
    return {
      tone: 'bad',
      title: 'Tasa de respuesta baja',
      detail: `Respondieron ${replies} de ${messages} (${responseRate}%). Meta inicial: 10-20%. Problema de copy o de a quién estás contactando. Probá cambiar una variable por vez.`,
    };
  }

  const convRate = pct(conversations, replies);
  // Stage 3: follow-up
  if (responseRate != null && responseRate >= 10 && convRate != null && convRate < 40) {
    return {
      tone: 'bad',
      title: 'Respuestas que no avanzan',
      detail: `De ${replies} respuestas, sólo ${conversations} se convirtieron en conversación (${convRate}%). Problema de follow-up / segundo mensaje: cómo seguís la charla.`,
    };
  }

  // Stage 4: ask for next step
  if (conversations >= 5 && demos === 0) {
    return {
      tone: 'bad',
      title: 'Conversaciones sin demos agendadas',
      detail: `${conversations} conversaciones en curso pero 0 demos agendadas. Problema de cómo pedís el siguiente paso en la charla.`,
    };
  }

  if (responseRate != null && responseRate >= 15 && convRate != null && convRate >= 40 && demos > 0) {
    return {
      tone: 'ok',
      title: 'Embudo sano',
      detail: `Response rate ${responseRate}% · conversación ${convRate}% · ${demos} demo${demos === 1 ? '' : 's'}. Seguí así, no cambies variables sin motivo.`,
    };
  }

  return {
    tone: 'ok',
    title: 'Embudo en rango razonable',
    detail: `Response rate ${fmtPct(responseRate)} · conversación ${fmtPct(convRate)} · ${demos} demo${demos === 1 ? '' : 's'} agendada${demos === 1 ? '' : 's'}.`,
  };
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatBox({ icon: Icon, label, value, hint, accent }: {
  icon: React.FC<any>;
  label: string;
  value: string | number;
  hint?: string;
  accent: 'cyan' | 'violet' | 'green' | 'amber';
}) {
  const accentMap = {
    cyan:   'text-cyan-500   bg-cyan-50   dark:bg-cyan-950/40',
    violet: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40',
    green:  'text-green-500  bg-green-50  dark:bg-green-950/40',
    amber:  'text-amber-500  bg-amber-50  dark:bg-amber-950/40',
  }[accent];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentMap}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{value}</p>
          {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function DiagnosisCard({ diag }: { diag: Diagnosis }) {
  const Icon = diag.tone === 'ok' ? CheckCircle2 : AlertCircle;
  const cfg = diag.tone === 'ok'
    ? 'border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
    : diag.tone === 'warn'
      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
      : 'border-red-200   dark:border-red-900/40   bg-red-50/50   dark:bg-red-950/20   text-red-700   dark:text-red-300';
  return (
    <div className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${cfg}`}>
      <Icon size={18} strokeWidth={2.5} className="shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{diag.title}</p>
        <p className="text-xs mt-1 opacity-90 leading-relaxed">{diag.detail}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SAOutreach() {
  const [logs, setLogs] = useState<OutreachDailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const from = addDays(todayISO(), -89); // últimos 90 días
    const data = await api.outreach.getRange(from, todayISO());
    setLogs(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Sync form cuando cambia fecha o llegan logs
  useEffect(() => {
    const existing = logs.find(l => l.date === selectedDate) ?? null;
    setForm(toForm(existing));
    setLastSavedAt(existing?.updated_at ?? null);
  }, [selectedDate, logs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.outreach.upsertDay(selectedDate, {
        messages_sent: Number(form.messages_sent) || 0,
        replies_received: Number(form.replies_received) || 0,
        conversations_started: Number(form.conversations_started) || 0,
        demos_scheduled: Number(form.demos_scheduled) || 0,
        notes: form.notes || null,
      });
      setLogs(prev => {
        const without = prev.filter(l => l.date !== selectedDate);
        return [updated, ...without].sort((a, b) => b.date.localeCompare(a.date));
      });
      setLastSavedAt(updated.updated_at);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Borrar el registro del ${fmtShortDate(selectedDate)}?`)) return;
    setDeleting(true);
    try {
      await api.outreach.remove(selectedDate);
      setLogs(prev => prev.filter(l => l.date !== selectedDate));
      setForm(EMPTY_FORM);
      setLastSavedAt(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Totals & derived metrics ────────────────────────────────────────────────
  const totals7 = useMemo(() => aggregateLastN(logs, 7), [logs]);
  const totals30 = useMemo(() => aggregateLastN(logs, 30), [logs]);

  const responseRate7 = pct(totals7.replies, totals7.messages);
  const convRate7 = pct(totals7.conversations, totals7.replies);

  const diagnosis = useMemo(() => {
    const from = addDays(todayISO(), -13);
    const last14 = logs.filter(l => l.date >= from);
    const sum = last14.reduce((acc, l) => ({
      messages: acc.messages + l.messages_sent,
      replies: acc.replies + l.replies_received,
      conversations: acc.conversations + l.conversations_started,
      demos: acc.demos + l.demos_scheduled,
    }), { messages: 0, replies: 0, conversations: 0, demos: 0 });
    return diagnoseFunnel(sum, Math.max(1, last14.length));
  }, [logs]);

  // ── Chart data (last 30 days, chronological) ────────────────────────────────
  const chartData = useMemo(() => {
    const byDate = new Map(logs.map(l => [l.date, l]));
    const rows: { date: string; label: string; messages: number; replies: number; conversations: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(todayISO(), -i);
      const l = byDate.get(d);
      rows.push({
        date: d,
        label: fmtShortDate(d),
        messages: l?.messages_sent ?? 0,
        replies: l?.replies_received ?? 0,
        conversations: l?.conversations_started ?? 0,
      });
    }
    return rows;
  }, [logs]);

  const existingForSelected = logs.some(l => l.date === selectedDate);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header con fecha ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
              Registrar día
            </label>
            <input
              type="date"
              value={selectedDate}
              max={todayISO()}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setSelectedDate(todayISO())}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={fetchAll}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* ── Form inputs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <LogInput
            icon={Send}
            label="Mensajes enviados"
            value={form.messages_sent}
            onChange={v => setForm(f => ({ ...f, messages_sent: v }))}
          />
          <LogInput
            icon={MessageCircle}
            label="Respuestas"
            value={form.replies_received}
            onChange={v => setForm(f => ({ ...f, replies_received: v }))}
          />
          <LogInput
            icon={MessagesSquare}
            label="Conversaciones (>2 msgs)"
            value={form.conversations_started}
            onChange={v => setForm(f => ({ ...f, conversations_started: v }))}
          />
          <LogInput
            icon={Calendar}
            label="Demos agendadas"
            value={form.demos_scheduled}
            onChange={v => setForm(f => ({ ...f, demos_scheduled: v }))}
          />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notas del día</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Qué probaste, qué cambiaste, qué notaste..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {lastSavedAt
              ? <>Última actualización: {new Date(lastSavedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</>
              : 'Sin registro para esta fecha todavía.'}
          </p>
          <div className="flex gap-2 ml-auto">
            {existingForSelected && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Borrar día
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-60 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Save size={13} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Diagnostic ──────────────────────────────────────────────────── */}
      <DiagnosisCard diag={diagnosis} />

      {/* ── Last 7 days totals + ratios ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
            Últimos 7 días
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
            30d: {totals30.messages} msg · {totals30.replies} resp · {totals30.conversations} conv · {totals30.demos} demos
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox icon={Send}           label="Mensajes"   value={totals7.messages}      accent="cyan"   />
          <StatBox icon={MessageCircle}  label="Respuestas" value={totals7.replies}       hint={`Tasa: ${fmtPct(responseRate7)}`} accent="violet" />
          <StatBox icon={MessagesSquare} label="Conversac." value={totals7.conversations} hint={`Conversión: ${fmtPct(convRate7)}`} accent="green" />
          <StatBox icon={Calendar}       label="Demos"      value={totals7.demos}         accent="amber"  />
        </div>
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
            Evolución 30 días
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12, color: '#fff' }}
              labelFormatter={(l) => l}
            />
            <Line type="monotone" dataKey="messages"      stroke="#06b6d4" strokeWidth={2} dot={false} name="Mensajes" />
            <Line type="monotone" dataKey="replies"       stroke="#8b5cf6" strokeWidth={2} dot={false} name="Respuestas" />
            <Line type="monotone" dataKey="conversations" stroke="#10b981" strokeWidth={2} dot={false} name="Conversaciones" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Rules reminder ──────────────────────────────────────────────── */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 text-slate-300 text-xs leading-relaxed border border-slate-800">
        <p className="font-black text-cyan-400 uppercase tracking-widest text-[10px] mb-2">Regla operativa</p>
        <p>
          Un mensaje cuenta si va a una persona específica, tiene al menos una frase personalizada real
          (algo que no podrías mandarle a cualquier otro) y pide algo concreto o abre una conversación concreta.
          Templates con el nombre cambiado sólo cuentan si el resto tiene una frase real para esa persona.
          Disparos idénticos a 50 personas no cuentan.
        </p>
        <p className="mt-2 text-slate-500">
          No toques varias etapas del embudo a la vez — cambiás una variable, mandás otra tanda, medís.
          Si cambiás tres cosas no vas a saber cuál funcionó.
        </p>
      </div>

      {/* ── History table ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Historial</h3>
          <span className="text-[10px] text-slate-400 font-semibold">{logs.length} día{logs.length === 1 ? '' : 's'} registrado{logs.length === 1 ? '' : 's'}</span>
        </div>
        {isLoading ? (
          <p className="text-center py-10 text-slate-400 dark:text-slate-600 text-xs">Cargando...</p>
        ) : logs.length === 0 ? (
          <p className="text-center py-10 text-slate-400 dark:text-slate-600 text-xs">
            Sin registros. Cargá el día de hoy para arrancar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-2.5 text-left">Fecha</th>
                  <th className="px-3 py-2.5 text-right">Msgs</th>
                  <th className="px-3 py-2.5 text-right">Resp</th>
                  <th className="px-3 py-2.5 text-right">Conv</th>
                  <th className="px-3 py-2.5 text-right">Demos</th>
                  <th className="px-3 py-2.5 text-right">Resp %</th>
                  <th className="px-3 py-2.5 text-right">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => {
                  const rr = pct(l.replies_received, l.messages_sent);
                  const cr = pct(l.conversations_started, l.replies_received);
                  return (
                    <tr
                      key={l.date}
                      onClick={() => setSelectedDate(l.date)}
                      className={`border-t border-slate-100 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                        l.date === selectedDate ? 'bg-cyan-50/60 dark:bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="px-5 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                        {new Date(l.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{l.messages_sent}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{l.replies_received}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{l.conversations_started}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{l.demos_scheduled}</td>
                      <td className="px-3 py-2.5 text-right text-violet-600 dark:text-violet-400 tabular-nums font-semibold">{fmtPct(rr)}</td>
                      <td className="px-3 py-2.5 text-right text-green-600 dark:text-green-400 tabular-nums font-semibold">{fmtPct(cr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small input control ──────────────────────────────────────────────────────

function LogInput({ icon: Icon, label, value, onChange }: {
  icon: React.FC<any>;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
        <Icon size={11} className="inline mr-1 -mt-0.5" strokeWidth={2.5} />
        {label}
      </label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => e.target.select()}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-slate-900 dark:text-white tabular-nums"
      />
    </div>
  );
}

// ── Aggregation helper ───────────────────────────────────────────────────────

function aggregateLastN(logs: OutreachDailyLog[], n: number) {
  const from = addDays(todayISO(), -(n - 1));
  const slice = logs.filter(l => l.date >= from);
  return slice.reduce((acc, l) => ({
    messages: acc.messages + l.messages_sent,
    replies: acc.replies + l.replies_received,
    conversations: acc.conversations + l.conversations_started,
    demos: acc.demos + l.demos_scheduled,
  }), { messages: 0, replies: 0, conversations: 0, demos: 0 });
}
