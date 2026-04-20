import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Plus,
  ChevronRight,
  Search,
  X,
  ArrowLeft,
  ArrowUpRight,
  UserPlus,
} from 'lucide-react';
import { PTPaymentService } from '../services/pt/PTPaymentService';
import { ShiftService } from '../services/ShiftService';
import { supabase } from '../db/supabase';
import { PTShiftPayment, PaymentMethod, Shift } from '../../shared/types';
import { useToast } from '../context/ToastContext';

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

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function PTPaymentsView({ gymId }: PTPaymentsViewProps) {
  const toast = useToast();
  const [payments, setPayments] = useState<PTShiftPayment[]>([]);
  const [stats, setStats] = useState({ todayIncome: 0, monthIncome: 0, monthPaid: 0, monthUnpaid: 0 });
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const navigate = useNavigate();

  // ── Register modal state ────────────────────────────────────────────
  const [registerStep, setRegisterStep] = useState<'closed' | 'pick-student' | 'pick-shift' | 'payment'>('closed');
  const [allStudents, setAllStudents] = useState<Array<{ id: string; displayName: string; firstLetter: string }>>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; displayName: string } | null>(null);
  const [studentShifts, setStudentShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [regAmount, setRegAmount] = useState('');
  const [regMethod, setRegMethod] = useState<PaymentMethod>('cash');
  const [regSaving, setRegSaving] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'activo')
      .then(({ count }) => {
        if (!cancelled) setStudentCount(count ?? 0);
      });
    return () => { cancelled = true; };
  }, [gymId]);

  // ── Register modal helpers ──────────────────────────────────────────
  const openRegister = async () => {
    setStudentSearch('');
    setSelectedStudent(null);
    setSelectedShift(null);
    setRegAmount('');
    setRegMethod('cash');
    // Load active students
    const { data } = await supabase
      .from('students')
      .select('id, nombre, apellido')
      .eq('gym_id', gymId)
      .eq('status', 'activo')
      .order('nombre');
    setAllStudents((data ?? []).map((s: any) => ({
      id: s.id,
      displayName: `${s.nombre ?? ''} ${s.apellido ?? ''}`.trim() || 'Sin nombre',
      firstLetter: (s.nombre ?? '?').charAt(0).toUpperCase(),
    })));
    setRegisterStep('pick-student');
  };

  const handlePickStudent = async (student: { id: string; displayName: string }) => {
    setSelectedStudent(student);
    // Load shifts this student is enrolled in
    const shiftsWithStudents = await ShiftService.getShiftsWithStudents(gymId);
    const enrolled = shiftsWithStudents.filter(s =>
      s.enrolledStudents.some((e: any) => e.id === student.id),
    );
    setStudentShifts(enrolled);
    if (enrolled.length === 1) {
      // Auto-select if only one shift
      setSelectedShift(enrolled[0]);
      setRegisterStep('payment');
    } else if (enrolled.length === 0) {
      // No shifts — still allow picking any shift
      setStudentShifts(shiftsWithStudents);
      setRegisterStep('pick-shift');
    } else {
      setRegisterStep('pick-shift');
    }
  };

  const handlePickShift = (shift: Shift) => {
    setSelectedShift(shift);
    setRegisterStep('payment');
  };

  const handleConfirmPayment = async () => {
    if (!selectedStudent || !selectedShift) return;
    const numAmount = Number(regAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    setRegSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await PTPaymentService.markPaid({
        gymId,
        shiftId: selectedShift.id,
        studentId: selectedStudent.id,
        paymentDate: today,
        amount: numAmount,
        paymentMethod: regMethod,
      });
      toast.success('Cobro registrado');
      setRegisterStep('closed');
      load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al registrar cobro');
    }
    setRegSaving(false);
  };

  const filteredRegStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter(s => s.displayName.toLowerCase().includes(q));
  }, [allStudents, studentSearch]);

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

  // ── Onboarding empty state: sin clientes y sin cobros ───────────────────
  if (payments.length === 0 && studentCount === 0) {
    return (
      <div className="space-y-6 pb-10">
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-3xl p-8 text-white shadow-lg shadow-violet-500/20">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-5">
            <UserPlus size={28} strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-black tracking-tight mb-2">Sumá tu primer cliente para cobrar</h2>
          <p className="text-sm text-violet-50/90 font-medium leading-relaxed mb-6">
            Cuando lo des de alta vas a elegir cómo le cobrás: mensual, por sesión, paquete o libre.
            Desde ahí registrás cobros y llevás la caja.
          </p>
          <button
            onClick={() => navigate('/clients/new')}
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold text-sm px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            Crear primer cliente
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </button>
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

      {/* ── CTA Registrar Cobro ─────────────────────────────────── */}
      <button
        onClick={openRegister}
        className="w-full flex items-center gap-3 px-5 py-4 bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white rounded-2xl font-bold shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-[0.98]"
      >
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <span className="flex-1 text-left text-sm">Registrar Cobro</span>
        <ChevronRight size={18} className="opacity-60" />
      </button>

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

      {/* ── Register Payment Modal ──────────────────────────────── */}
      {registerStep !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={() => setRegisterStep('closed')}>
          <div
            className="bg-white dark:bg-slate-900 w-full md:max-w-sm md:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-3">
              {registerStep !== 'pick-student' && (
                <button
                  onClick={() => setRegisterStep(registerStep === 'payment' ? (studentShifts.length === 1 ? 'pick-student' : 'pick-shift') : 'pick-student')}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {registerStep === 'pick-student' && 'Elegí un alumno'}
                  {registerStep === 'pick-shift' && 'Elegí el turno'}
                  {registerStep === 'payment' && 'Registrar cobro'}
                </h3>
                {selectedStudent && registerStep !== 'pick-student' && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{selectedStudent.displayName}</p>
                )}
              </div>
              <button onClick={() => setRegisterStep('closed')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            {/* Step 1: Pick student */}
            {registerStep === 'pick-student' && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 pb-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar alumno..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="px-4 pb-4 space-y-1 max-h-80 overflow-y-auto">
                  {filteredRegStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handlePickStudent(s)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 font-black text-sm shrink-0">
                        {s.firstLetter}
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.displayName}</span>
                    </button>
                  ))}
                  {filteredRegStudents.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-6">Sin resultados</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Pick shift */}
            {registerStep === 'pick-shift' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {studentShifts.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">Este alumno no tiene turnos asignados</p>
                ) : (
                  studentShifts.map(shift => (
                    <button
                      key={shift.id}
                      onClick={() => handlePickShift(shift)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <DollarSign size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{shift.name}</p>
                        <p className="text-xs text-slate-400">{DAY_NAMES[shift.day_of_week]} · {shift.start_time}–{shift.end_time}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Step 3: Payment form */}
            {registerStep === 'payment' && (
              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                {selectedShift && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {selectedShift.name} · {DAY_NAMES[selectedShift.day_of_week]}
                    </p>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monto</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                    <input
                      type="number"
                      value={regAmount}
                      onChange={e => setRegAmount(e.target.value)}
                      placeholder="0"
                      autoFocus
                      className="w-full pl-8 pr-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Medio de pago</label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {([
                      { id: 'cash' as PaymentMethod, label: 'Efectivo', Icon: Wallet },
                      { id: 'transfer' as PaymentMethod, label: 'Transf.', Icon: CreditCard },
                      { id: 'mercadopago' as PaymentMethod, label: 'M.Pago', Icon: Smartphone },
                    ]).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRegMethod(id)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold text-xs transition-all ${
                          regMethod === id
                            ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="uppercase tracking-wide text-[10px]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Confirm button — sticky footer for payment step */}
            {registerStep === 'payment' && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                <button
                  onClick={handleConfirmPayment}
                  disabled={regSaving}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/25 disabled:opacity-50 active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {regSaving ? 'Guardando...' : 'Confirmar cobro'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
