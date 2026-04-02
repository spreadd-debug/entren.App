import React, { useEffect, useState, useMemo } from 'react';
import {
  DollarSign,
  CreditCard,
  Smartphone,
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { PTPaymentService } from '../services/pt/PTPaymentService';
import { PTShiftPayment } from '../../shared/types';

interface PTPaymentsViewProps {
  gymId: string;
}

const currency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Wallet size={16} />,
  transfer: <CreditCard size={16} />,
  mercadopago: <Smartphone size={16} />,
};

export default function PTPaymentsView({ gymId }: PTPaymentsViewProps) {
  const [payments, setPayments] = useState<PTShiftPayment[]>([]);
  const [stats, setStats] = useState({ todayIncome: 0, monthIncome: 0, monthPaid: 0, monthUnpaid: 0 });
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = async () => {
    setLoading(true);
    try {
      const from = filterMonth + '-01';
      const lastDay = new Date(Number(filterMonth.split('-')[0]), Number(filterMonth.split('-')[1]), 0).getDate();
      const to = filterMonth + '-' + String(lastDay).padStart(2, '0');

      const [paymentsData, statsData] = await Promise.all([
        PTPaymentService.getAll(gymId, { from, to }),
        PTPaymentService.getStats(gymId),
      ]);
      setPayments(paymentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading payments:', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [gymId, filterMonth]);

  // Group payments by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PTShiftPayment[]> = {};
    for (const p of payments) {
      if (!groups[p.payment_date]) groups[p.payment_date] = [];
      groups[p.payment_date].push(p);
    }
    return groups;
  }, [payments]);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Method breakdown for current month
  const methodBreakdown: Record<string, { count: number; total: number }> = useMemo(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      if (p.status !== 'paid') continue;
      if (!breakdown[p.payment_method]) breakdown[p.payment_method] = { count: 0, total: 0 };
      breakdown[p.payment_method].count++;
      breakdown[p.payment_method].total += Number(p.amount) || 0;
    }
    return breakdown;
  }, [payments]);

  const getStudentName = (p: PTShiftPayment) => {
    if (p.student) return `${p.student.nombre} ${p.student.apellido}`.trim();
    return 'Alumno';
  };

  const getShiftName = (p: PTShiftPayment) => {
    if (p.shift) return p.shift.name;
    return 'Turno';
  };

  // Month selector options (last 6 months)
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opts;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando cobros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-slate-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">
              Cobrado Hoy
            </p>
          </div>
          <p className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
            {currency(stats.todayIncome)}
          </p>
        </div>
        <div className="bg-emerald-500 rounded-2xl p-5 flex flex-col gap-2 shadow-md shadow-emerald-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-900/50" />
            <p className="text-[10px] font-black text-emerald-900/70 uppercase tracking-[0.12em]">
              Cobrado Mes
            </p>
          </div>
          <p className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
            {currency(stats.monthIncome)}
          </p>
        </div>
      </div>

      {/* ── Paid / Unpaid summary ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{stats.monthPaid}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pagados</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <XCircle size={20} className="text-rose-500" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{stats.monthUnpaid}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Impagos</p>
          </div>
        </div>
      </div>

      {/* ── Method breakdown ─────────────────────────────────────── */}
      {Object.keys(methodBreakdown).length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Por medio de pago</p>
          <div className="space-y-2">
            {Object.entries(methodBreakdown).map(([method, data]) => (
              <div key={method} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  {METHOD_ICONS[method] ?? <DollarSign size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{METHOD_LABELS[method] ?? method}</p>
                  <p className="text-[10px] text-slate-400">{data.count} cobro{data.count !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{currency(data.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Month filter ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Historial de cobros</h3>
        <div className="relative">
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 pr-7 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Payment list grouped by date ─────────────────────────── */}
      {sortedDates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center py-14">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <DollarSign size={18} className="text-slate-400 dark:text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">
            Sin cobros este mes
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
            Marcá pagos desde la agenda
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(date => {
            const dayPayments = groupedByDate[date];
            const dayTotal = dayPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  {dayTotal > 0 && (
                    <p className="text-[10px] font-black text-emerald-500">{currency(dayTotal)}</p>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {dayPayments.map(payment => (
                    <div key={payment.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        payment.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {payment.status === 'paid'
                          ? (METHOD_ICONS[payment.payment_method] ?? <DollarSign size={16} />)
                          : <AlertCircle size={16} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {getStudentName(payment)}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {getShiftName(payment)}
                          {payment.status === 'paid' && ` · ${METHOD_LABELS[payment.payment_method] ?? payment.payment_method}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {payment.status === 'paid' ? (
                          <>
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              {currency(Number(payment.amount))}
                            </p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">Pagado</p>
                          </>
                        ) : (
                          <p className="text-[10px] font-bold text-rose-500 uppercase">No pagó</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
