import React, { useEffect, useMemo, useState } from 'react';
import {
  Rocket, Clock, TrendingUp, Users, Activity, AlertCircle, CheckCircle2, Info, Repeat,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import {
  GymSubscription, GymBillingPayment,
  OnboardingFunnel, RetentionCohort,
} from '../../../shared/types';
import { api } from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function pct(numer: number, denom: number): number | null {
  if (!denom || denom <= 0) return null;
  return Math.round((numer / denom) * 1000) / 10;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v}%`;
}

function fmtDays(v: number | null): string {
  if (v == null) return '—';
  if (v < 1) return '< 1d';
  return `${v.toFixed(1)}d`;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({ icon: Icon, label, value, hint, accent, tone }: {
  icon: React.FC<any>;
  label: string;
  value: string;
  hint?: string;
  accent: 'cyan' | 'violet' | 'green' | 'amber' | 'slate';
  tone?: 'ok' | 'warn' | 'bad';
}) {
  const accentMap = {
    cyan:   'text-cyan-500   bg-cyan-50   dark:bg-cyan-950/40',
    violet: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40',
    green:  'text-green-500  bg-green-50  dark:bg-green-950/40',
    amber:  'text-amber-500  bg-amber-50  dark:bg-amber-950/40',
    slate:  'text-slate-500  bg-slate-100 dark:bg-slate-800',
  }[accent];
  const toneIndicator = tone === 'ok'   ? 'bg-green-500'
                      : tone === 'warn' ? 'bg-amber-500'
                      : tone === 'bad'  ? 'bg-red-500'
                      : null;
  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4">
      {toneIndicator && <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${toneIndicator}`} />}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentMap}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">{value}</p>
          {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function DiagCard({ tone, title, detail }: { tone: 'ok' | 'warn' | 'bad' | 'info'; title: string; detail: string }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'info' ? Info : AlertCircle;
  const cls =
    tone === 'ok'   ? 'border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300' :
    tone === 'warn' ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300' :
    tone === 'bad'  ? 'border-red-200   dark:border-red-900/40   bg-red-50/50   dark:bg-red-950/20   text-red-700   dark:text-red-300' :
                      'border-slate-200 dark:border-slate-800    bg-slate-50    dark:bg-slate-900/60 text-slate-600 dark:text-slate-400';
  return (
    <div className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${cls}`}>
      <Icon size={18} strokeWidth={2.5} className="shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{title}</p>
        <p className="text-xs mt-1 opacity-90 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SAOnboarding({
  subscriptions,
  billingPayments,
}: {
  subscriptions: GymSubscription[];
  billingPayments: GymBillingPayment[];
}) {

  const [funnel, setFunnel] = useState<OnboardingFunnel | null>(null);
  const [retention, setRetention] = useState<RetentionCohort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [f, r] = await Promise.all([
        api.activity.getFunnel(),
        api.activity.getRetention(8),
      ]);
      if (!active) return;
      setFunnel(f);
      setRetention(r);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const now = useMemo(() => new Date(), []);

  // ── Activation (desde subscriptions, sin depender de eventos) ───────────
  // Proxy: % de gyms registrados que tienen al menos un billing_payment.
  const registered = subscriptions.length;
  const activated = subscriptions.filter(s => billingPayments.some(p => p.gym_id === s.gym_id)).length;
  const activationRate = pct(activated, registered);

  // ── Time To First Value (TTFV) ──────────────────────────────────────────
  const ttfvSamples: number[] = [];
  for (const sub of subscriptions) {
    const firstPayment = billingPayments
      .filter(p => p.gym_id === sub.gym_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    if (!firstPayment) continue;
    ttfvSamples.push(daysBetween(sub.created_at, firstPayment.created_at));
  }
  const ttfvAvg = ttfvSamples.length > 0 ? ttfvSamples.reduce((a, b) => a + b, 0) / ttfvSamples.length : null;
  const ttfvMedian = ttfvSamples.length > 0 ? median(ttfvSamples) : null;

  const inTrial = subscriptions.filter(s => s.status === 'trial').length;
  const pastDue = subscriptions.filter(s => s.status === 'past_due').length;
  const churned = subscriptions.filter(s => s.status === 'cancelled' || s.status === 'suspended').length;

  // ── Retention aggregates (desde últimas 8 cohortes) ─────────────────────
  const retentionAgg = useMemo(() => {
    const totalSize = retention.reduce((s, c) => s + c.cohort_size, 0);
    const d1 = retention.reduce((s, c) => s + c.d1, 0);
    const d7 = retention.reduce((s, c) => s + c.d7, 0);
    const d30 = retention.reduce((s, c) => s + c.d30, 0);
    return {
      totalSize,
      d1Rate:  pct(d1, totalSize),
      d7Rate:  pct(d7, totalSize),
      d30Rate: pct(d30, totalSize),
    };
  }, [retention]);

  // Dataset para el gráfico de retención por cohorte
  const retentionChart = useMemo(
    () => retention.map(c => ({
      label: new Date(c.cohort_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      size: c.cohort_size,
      d1: c.cohort_size > 0 ? Math.round((c.d1 / c.cohort_size) * 100) : 0,
      d7: c.cohort_size > 0 ? Math.round((c.d7 / c.cohort_size) * 100) : 0,
      d30: c.cohort_size > 0 ? Math.round((c.d30 / c.cohort_size) * 100) : 0,
    })),
    [retention],
  );

  // ── Funnel por pasos (evento-based) ──────────────────────────────────────
  const funnelChart = useMemo(() => {
    const f = funnel ?? { registered: 0, first_student: 0, first_payment: 0, activated: 0 };
    return [
      { stage: 'Registrados',    count: f.registered,    color: '#94a3b8' },
      { stage: '1er alumno',     count: f.first_student, color: '#06b6d4' },
      { stage: '1er pago',       count: f.first_payment, color: '#8b5cf6' },
      { stage: 'Activados',      count: f.activated,     color: '#10b981' },
    ];
  }, [funnel]);

  // ── Drop-off por paso ────────────────────────────────────────────────────
  const dropOff = useMemo(() => {
    if (!funnel) return [];
    const steps = [
      { from: 'Registrados', to: '1er alumno', a: funnel.registered,    b: funnel.first_student },
      { from: '1er alumno',  to: '1er pago',   a: funnel.first_student, b: funnel.first_payment },
      { from: '1er pago',    to: 'Activados',  a: funnel.first_payment, b: funnel.activated    },
    ];
    return steps.map(s => ({
      ...s,
      retained: s.a > 0 ? Math.round((s.b / s.a) * 100) : 0,
      lost: Math.max(0, s.a - s.b),
    }));
  }, [funnel]);

  // ── Diagnósticos combinados ─────────────────────────────────────────────
  const diagnoses: { tone: 'ok' | 'warn' | 'bad' | 'info'; title: string; detail: string }[] = [];

  if (loading) {
    // No diagnosticamos hasta tener datos
  } else if (registered === 0) {
    diagnoses.push({
      tone: 'info',
      title: 'Aún no hay gyms registrados',
      detail: 'Las métricas aparecen cuando el primer gym se registra.',
    });
  } else {
    // Activation
    if (activationRate != null && activationRate < 40) {
      diagnoses.push({
        tone: 'bad',
        title: `Activation baja (${fmtPct(activationRate)})`,
        detail: `Pocos registrados pagan el primer mes. Si la D1 está alta en los que sí activan, el problema está en el onboarding (entre registro y primer pago).`,
      });
    } else if (activationRate != null && activationRate >= 70) {
      diagnoses.push({
        tone: 'ok',
        title: `Activation sana (${fmtPct(activationRate)})`,
        detail: `La mayoría de los registrados activan. Enfocate en retención si querés mover la aguja.`,
      });
    }

    // Retention-based diagnostics
    if (retentionAgg.totalSize > 0) {
      const { d1Rate, d7Rate, d30Rate } = retentionAgg;
      if (activationRate != null && activationRate >= 50 && d1Rate != null && d1Rate < 40) {
        diagnoses.push({
          tone: 'bad',
          title: 'Onboarding claro pero D1 baja',
          detail: `${fmtPct(d1Rate)} de los nuevos gyms vuelven al día siguiente. El onboarding funciona (activan) pero la primera experiencia no engancha — arreglá la primera experiencia real.`,
        });
      }
      if (d1Rate != null && d7Rate != null && d1Rate >= 50 && d7Rate < 30) {
        diagnoses.push({
          tone: 'warn',
          title: 'D1 alta pero D7 baja',
          detail: `Buen enganche inicial (${fmtPct(d1Rate)}) pero la gente no forma hábito (D7 ${fmtPct(d7Rate)}). Falta una razón recurrente para volver.`,
        });
      }
      if (d7Rate != null && d30Rate != null && d7Rate >= 40 && d30Rate < 20) {
        diagnoses.push({
          tone: 'warn',
          title: 'D7 alta pero D30 baja',
          detail: `Entusiasma al inicio pero no termina de ser esencial (D30 ${fmtPct(d30Rate)}). Falta profundidad de valor.`,
        });
      }
    }

    // Funnel drop-off
    for (const step of dropOff) {
      if (step.retained < 40 && step.lost >= 2) {
        diagnoses.push({
          tone: 'warn',
          title: `Drop-off en "${step.from} → ${step.to}"`,
          detail: `Sólo ${step.retained}% de los que pasaron por "${step.from}" llegan a "${step.to}" (${step.lost} gyms se pierden). Ese paso específico es el cuello de botella.`,
        });
        break; // mostramos sólo el peor
      }
    }

    // TTFV
    if (ttfvAvg != null && ttfvAvg > 7) {
      diagnoses.push({
        tone: 'warn',
        title: `Tiempo a primer valor alto (~${fmtDays(ttfvAvg)})`,
        detail: `Desde registro hasta primer pago promedia ${fmtDays(ttfvAvg)}. Ideal: < 5 días.`,
      });
    }

    if (churned > 0 && churned / Math.max(1, registered) > 0.2) {
      diagnoses.push({
        tone: 'bad',
        title: `Churn alto (${fmtPct(pct(churned, registered))})`,
        detail: `Más del 20% de gyms registrados están cancelados/suspendidos. Falta profundidad de valor o hábito.`,
      });
    }
  }

  if (!loading && diagnoses.length === 0) {
    diagnoses.push({
      tone: 'info',
      title: 'Sin señales negativas',
      detail: 'Todos los números están en rango razonable. Seguí observando a medida que aumenta el volumen.',
    });
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Top stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox icon={Users}   label="Registrados"        value={String(registered)}     accent="slate" />
        <StatBox
          icon={Rocket}
          label="Activation"
          value={fmtPct(activationRate)}
          hint={`${activated}/${registered} activados`}
          accent="cyan"
          tone={activationRate == null ? undefined : activationRate < 40 ? 'bad' : activationRate < 70 ? 'warn' : 'ok'}
        />
        <StatBox
          icon={Clock}
          label="Time to first value"
          value={fmtDays(ttfvAvg)}
          hint={ttfvMedian != null ? `mediana ${fmtDays(ttfvMedian)}` : 'sin datos'}
          accent="violet"
          tone={ttfvAvg == null ? undefined : ttfvAvg <= 3 ? 'ok' : ttfvAvg <= 7 ? 'warn' : 'bad'}
        />
        <StatBox
          icon={TrendingUp}
          label="En trial"
          value={String(inTrial)}
          hint={`${pastDue} past due · ${churned} churn`}
          accent="amber"
        />
      </div>

      {/* ── Retention D1 / D7 / D30 ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBox
          icon={Repeat}
          label="Retención D1"
          value={fmtPct(retentionAgg.d1Rate)}
          hint={`Cohortes últimas 8 sem. · n=${retentionAgg.totalSize}`}
          accent="cyan"
          tone={retentionAgg.d1Rate == null ? undefined : retentionAgg.d1Rate >= 50 ? 'ok' : retentionAgg.d1Rate >= 30 ? 'warn' : 'bad'}
        />
        <StatBox
          icon={Repeat}
          label="Retención D7"
          value={fmtPct(retentionAgg.d7Rate)}
          hint="Primer hábito inicial"
          accent="violet"
          tone={retentionAgg.d7Rate == null ? undefined : retentionAgg.d7Rate >= 40 ? 'ok' : retentionAgg.d7Rate >= 20 ? 'warn' : 'bad'}
        />
        <StatBox
          icon={Repeat}
          label="Retención D30"
          value={fmtPct(retentionAgg.d30Rate)}
          hint="Producto genuinamente útil"
          accent="green"
          tone={retentionAgg.d30Rate == null ? undefined : retentionAgg.d30Rate >= 30 ? 'ok' : retentionAgg.d30Rate >= 15 ? 'warn' : 'bad'}
        />
      </div>

      {/* ── Diagnósticos ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 text-center text-xs text-slate-400">
            Cargando métricas de actividad...
          </div>
        ) : (
          diagnoses.map((d, i) => <DiagCard key={i} {...d} />)
        )}
      </div>

      {/* ── Funnel chart (event-based) ───────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
            Funnel de activación
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnelChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12, color: '#fff' }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {funnelChart.map((f, i) => <Cell key={i} fill={f.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Drop-off breakdown */}
        {dropOff.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            {dropOff.map((s, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.from} → {s.to}</p>
                <p className={`text-base font-black mt-0.5 ${s.retained >= 70 ? 'text-green-500' : s.retained >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                  {s.retained}%
                </p>
                <p className="text-[10px] text-slate-500">{s.lost} gym{s.lost === 1 ? '' : 's'} perdido{s.lost === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Retention cohort chart ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Repeat size={14} className="text-violet-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
            Retención por cohorte semanal
          </h3>
        </div>
        {retentionChart.length === 0 || retentionAgg.totalSize === 0 ? (
          <p className="text-center py-8 text-xs text-slate-400">
            Sin cohortes con datos todavía. Los eventos de login se empiezan a registrar ahora.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={retentionChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12, color: '#fff' }}
                formatter={(v: any) => `${v}%`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="d1"  stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="D1" />
              <Line type="monotone" dataKey="d7"  stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="D7" />
              <Line type="monotone" dataKey="d30" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="D30" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Framework reference ──────────────────────────────────────── */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 text-slate-300 text-xs leading-relaxed border border-slate-800">
        <p className="font-black text-cyan-400 uppercase tracking-widest text-[10px] mb-3">Cómo leer estos números</p>
        <ul className="space-y-1.5 list-disc pl-4 marker:text-slate-600">
          <li><strong className="text-slate-100">Alto drop-off en un paso:</strong> ese paso es confuso, largo, o pide algo que el usuario no está listo para dar.</li>
          <li><strong className="text-slate-100">Activation baja pero D1 alta:</strong> el producto es bueno, el onboarding pierde gente. Arreglás el onboarding.</li>
          <li><strong className="text-slate-100">Activation alta pero D1 baja:</strong> el onboarding es claro pero la primera experiencia no engancha.</li>
          <li><strong className="text-slate-100">D1 alta pero D7 baja:</strong> enganche inicial sin hábito, falta razón para volver.</li>
          <li><strong className="text-slate-100">D7 alta pero D30 baja:</strong> entusiasma pero no termina de ser esencial, falta profundidad de valor.</li>
        </ul>
      </div>
    </div>
  );
}
