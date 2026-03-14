import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  ArrowUpRight,
  Smartphone,
  Wallet,
  X,
  DollarSign,
  Calendar,
  ChevronRight,
  Users,
} from 'lucide-react';
import { Card, Input, Button } from '../components/UI';
import { Payment, Student, Plan } from '../../shared/types';
import { formatDate, calculateNextDueDate } from '../utils/dateUtils';

interface PaymentsViewProps {
  payments: Payment[];
  canViewFinancials: boolean;
  students?: Student[];
  plans?: Plan[];
  onRegisterPayment?: (data: {
    studentId: string;
    amount: number;
    method: 'cash' | 'transfer' | 'mercadopago';
    date: string;
    nextDueDate: string;
  }) => Promise<void>;
}

const currency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  canViewFinancials,
  students = [],
  plans = [],
  onRegisterPayment,
}) => {
  // ── Modal state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<'closed' | 'pick-student' | 'payment'>('closed');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment form state
  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<'cash' | 'transfer' | 'mercadopago'>('cash');
  const [date, setDate] = useState(today);
  const [nextDueDate, setNextDueDate] = useState('');

  // ── Payments normalization ───────────────────────────────────────────────
  const safePayments = Array.isArray(payments) ? payments : [];

  const normalizedPayments = safePayments.map((payment: any) => {
    const pDate = payment.fecha_pago ?? payment.date ?? null;
    const amount = Number(payment.monto ?? payment.amount ?? 0);
    const method = payment.metodo_pago ?? payment.method ?? 'otro';
    const studentName =
      payment.studentName ??
      payment.student_name ??
      payment.nombre_completo ??
      (payment.student
        ? `${payment.student.nombre ?? ''} ${payment.student.apellido ?? ''}`.trim()
        : 'Alumno');
    return { ...payment, displayDate: pDate, displayAmount: amount, displayMethod: method, displayStudentName: studentName || 'Alumno' };
  });

  const todayStr = today;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const todayIncome = normalizedPayments
    .filter((p: any) => p.displayDate === todayStr)
    .reduce((sum: number, p: any) => sum + p.displayAmount, 0);

  const monthlyIncome = normalizedPayments
    .filter((p: any) => {
      if (!p.displayDate) return false;
      const d = new Date(String(p.displayDate));
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum: number, p: any) => sum + p.displayAmount, 0);

  // ── Students normalization ───────────────────────────────────────────────
  const normalizedStudents = useMemo(() =>
    (Array.isArray(students) ? students : []).map((s: any) => {
      const nombre = s.nombre ?? s.name ?? '';
      const apellido = s.apellido ?? s.lastName ?? '';
      const fullName = `${nombre} ${apellido}`.trim() || 'Sin nombre';
      return { ...s, displayName: fullName, firstLetter: (nombre || '?').charAt(0).toUpperCase() };
    }),
    [students]
  );

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return normalizedStudents.filter((s: any) => s.status === 'activo');
    const q = studentSearch.toLowerCase();
    return normalizedStudents.filter((s: any) =>
      s.displayName.toLowerCase().includes(q)
    );
  }, [normalizedStudents, studentSearch]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getPaymentIcon = (method: string) => {
    const n = String(method).toLowerCase();
    if (n === 'efectivo' || n === 'cash') return <Wallet size={18} />;
    if (n === 'mercado_pago' || n === 'mercadopago') return <Smartphone size={18} />;
    return <CreditCard size={18} />;
  };

  const openModal = () => {
    setStudentSearch('');
    setSelectedStudent(null);
    setStep('pick-student');
  };

  const selectStudent = (student: any) => {
    setSelectedStudent(student);
    // Pre-fill amount from student's plan
    const safePlans = Array.isArray(plans) ? plans : [];
    const plan: any = safePlans.find((p: any) => p.id === (student.plan_id ?? student.planId));
    const planPrice = Number(plan?.precio ?? plan?.price ?? 0);
    const planDays = Number(plan?.duracion_dias ?? plan?.durationDays ?? 30);
    setAmount(planPrice);
    setDate(today);
    setNextDueDate(calculateNextDueDate(today, planDays));
    setMethod('cash');
    setStep('payment');
  };

  const handleConfirm = async () => {
    if (!selectedStudent || !onRegisterPayment) return;
    setIsSubmitting(true);
    try {
      await onRegisterPayment({
        studentId: selectedStudent.id,
        amount,
        method,
        date,
        nextDueDate,
      });
      setStep('closed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setStep('closed');
    setSelectedStudent(null);
    setStudentSearch('');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* ── KPI cards ─────────────────────────────────────────── */}
      {canViewFinancials && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">
              Cobrado Hoy
            </p>
            <p className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
              {currency(todayIncome)}
            </p>
          </div>
          <div className="bg-emerald-500 rounded-2xl p-5 flex flex-col gap-3 shadow-md shadow-emerald-500/20">
            <p className="text-[10px] font-black text-emerald-900/70 uppercase tracking-[0.12em]">
              Cobrado Mes
            </p>
            <p className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
              {currency(monthlyIncome)}
            </p>
          </div>
        </div>
      )}

      {/* ── CTA ───────────────────────────────────────────────── */}
      <button
        onClick={openModal}
        className="w-full flex items-center gap-3 px-5 py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 rounded-2xl font-bold shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-[0.98]"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <span className="flex-1 text-left text-sm">Registrar Cobro</span>
        <ChevronRight size={18} className="opacity-60" />
      </button>

      {/* ── Payment list ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white px-0.5">
          Pagos Recientes
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {normalizedPayments.length > 0 ? (
            normalizedPayments.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  {getPaymentIcon(payment.displayMethod)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {payment.displayStudentName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">
                    {payment.displayDate ? formatDate(String(payment.displayDate)) : 'Sin fecha'}
                    {' · '}
                    {String(payment.displayMethod).replaceAll('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                    {currency(payment.displayAmount)}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                    Completado
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <CreditCard size={18} className="text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">
                No hay pagos registrados
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          STEP 1 — Student picker modal
      ════════════════════════════════════════════════════════════ */}
      {step === 'pick-student' && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 md:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Seleccioná el alumno
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                  Buscá por nombre
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar alumno..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                />
              </div>
            </div>

            {/* Student list */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => (
                  <button
                    key={student.id}
                    onClick={() => selectStudent(student)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm shrink-0">
                      {student.firstLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {student.displayName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-600">
                        {student.planName ?? student.plan_nombre ?? 'Sin plan asignado'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users size={24} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">
                    No se encontraron alumnos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          STEP 2 — Payment form modal
      ════════════════════════════════════════════════════════════ */}
      {step === 'payment' && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 md:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Registrar Cobro
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                  {selectedStudent.displayName}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStep('pick-student')}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-xs font-semibold"
                >
                  Cambiar
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-0.5">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-2xl font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all tabular-nums"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Method */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-0.5">
                  Método
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'cash', label: 'Efectivo', Icon: DollarSign },
                    { id: 'transfer', label: 'Transf.', Icon: CreditCard },
                    { id: 'mercadopago', label: 'M.Pago', Icon: Smartphone },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 font-bold text-xs transition-all ${
                        method === id
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="uppercase tracking-wide text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-0.5">
                    Fecha Pago
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        const safePlans = Array.isArray(plans) ? plans : [];
                        const plan: any = safePlans.find((p: any) => p.id === (selectedStudent.plan_id ?? selectedStudent.planId));
                        const days = Number(plan?.duracion_dias ?? plan?.durationDays ?? 30);
                        setNextDueDate(calculateNextDueDate(e.target.value, days));
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-0.5">
                    Vencimiento
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              {nextDueDate && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold text-center">
                    El alumno quedará al día hasta el{' '}
                    <span className="font-black">{formatDate(nextDueDate)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || !amount || !nextDueDate}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 rounded-xl font-bold text-sm shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-[0.98]"
              >
                <ArrowUpRight size={17} strokeWidth={2.5} />
                {isSubmitting ? 'Registrando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
