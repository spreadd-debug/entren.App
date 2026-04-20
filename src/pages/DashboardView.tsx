import React from 'react';
import {
  Users,
  CreditCard,
  AlertCircle,
  UserPlus,
  DollarSign,
  Search,
  MessageSquare,
  ChevronRight,
  Clock,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Zap,
  Sparkles,
} from 'lucide-react';
import { Card, Button, BillingBadge } from '../components/UI';
import { Student, Payment, ShiftWithStudents } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  students: Student[];
  payments: Payment[];
  onSelectStudent: (student: Student) => void;
  canViewFinancials: boolean;
  shiftsEnabled?: boolean;
  todayShifts?: ShiftWithStudents[];
}

const isValidDate = (value: unknown) => {
  if (!value) return false;
  const date = new Date(String(value));
  return !isNaN(date.getTime());
};

const toNumber = (value: unknown) => Number(value ?? 0);

const currency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);

// Avatar color based on first letter
const AVATAR_PALETTES = [
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
];
const avatarColor = (name: string) =>
  AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  students,
  payments,
  onSelectStudent,
  canViewFinancials,
  shiftsEnabled = false,
  todayShifts = [],
}) => {
  const safeStudents = Array.isArray(students) ? students : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // ── Normalize ────────────────────────────────────────────────────────────
  const normalizedStudents = safeStudents.map((s: any) => {
    const nombre = s.nombre ?? s.name ?? '';
    const apellido = s.apellido ?? s.lastName ?? '';
    const fullName = `${nombre} ${apellido}`.trim() || 'Sin nombre';
    const nextDueDate = s.next_due_date ?? s.nextDueDate ?? null;

    let dueStatus: 'ok' | 'expiring' | 'expired' = 'ok';
    let diffDays = 9999;

    if (isValidDate(nextDueDate)) {
      const dueDate = new Date(String(nextDueDate));
      diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) dueStatus = 'expired';
      else if (diffDays <= 3) dueStatus = 'expiring';
    }

    return {
      ...s,
      displayName: fullName,
      firstLetter: (nombre || '?').charAt(0).toUpperCase(),
      nextDueDate,
      dueStatus,
      diffDays,
      planDisplay: s.planName ?? s.plan_nombre ?? 'Sin cuota asignada',
      debtDisplay: toNumber(s.debt ?? s.precio_personalizado ?? 0),
    };
  });

  const normalizedPayments = safePayments.map((p: any) => {
    const date = p.fecha_pago ?? p.date ?? null;
    const amount = toNumber(p.monto ?? p.amount);
    const studentName =
      p.studentName ?? p.student_name ?? p.nombre_completo ??
      (p.student ? `${p.student.nombre ?? ''} ${p.student.apellido ?? ''}`.trim() : 'Alumno');
    return {
      ...p,
      displayDate: date,
      displayAmount: amount,
      displayStudentName: studentName || 'Alumno',
    };
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const activeCount = normalizedStudents.filter((s: any) => s.status === 'activo').length;

  const expiredStudents = normalizedStudents
    .filter((s: any) => s.status === 'activo' && s.cobra_cuota && s.dueStatus === 'expired')
    .sort((a: any, b: any) => a.diffDays - b.diffDays);

  const expiringStudents = normalizedStudents
    .filter((s: any) => s.status === 'activo' && s.cobra_cuota && s.dueStatus === 'expiring')
    .sort((a: any, b: any) => a.diffDays - b.diffDays);

  const pendingStudents = [...expiredStudents, ...expiringStudents].slice(0, 4);

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

  const newThisMonth = normalizedStudents.filter((s: any) => {
    const raw = s.created_at ?? s.createdAt ?? null;
    if (!raw) return false;
    const d = new Date(String(raw));
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const recentPayments = normalizedPayments.slice(0, 5);
  const topDefaulters = expiredStudents.slice(0, 3);

  return (
    <div className="space-y-8 pb-10">

      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            ¡Hola, Profe!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-500 font-medium">
            {expiredStudents.length > 0 ? (
              <>
                <span className="text-rose-500 font-bold">{expiredStudents.length} vencidas</span>
                {expiringStudents.length > 0 && (
                  <> · <span className="text-amber-500 font-semibold">{expiringStudents.length} por vencer</span></>
                )}
              </>
            ) : (
              <span className="text-emerald-500 font-semibold">Todo al día ✓</span>
            )}
          </p>
        </div>
        {/* Mini status badge */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${expiredStudents.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            {activeCount} activos
          </span>
        </div>
      </div>

      {/* ── KPI Metrics ─────────────────────────────────────────────── */}
      <div data-tour="dashboard-kpis" className={`grid gap-3 ${canViewFinancials ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'}`}>

        {/* Activos — featured metric */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
              Activos
            </p>
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Users size={14} className="text-emerald-500" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
              {activeCount}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
              alumnos activos
            </p>
          </div>
        </div>

        {/* Deudores */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none transition-colors ${
          expiredStudents.length > 0
            ? 'border-rose-200 dark:border-rose-500/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
              Deudores
            </p>
            <div className="p-1.5 rounded-lg bg-rose-500/10">
              <AlertCircle size={14} className="text-rose-500" />
            </div>
          </div>
          <div>
            <p className={`text-4xl font-black tracking-tight leading-none tabular-nums ${
              expiredStudents.length > 0
                ? 'text-rose-500'
                : 'text-slate-900 dark:text-white'
            }`}>
              {expiredStudents.length}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
              cuotas vencidas
            </p>
          </div>
        </div>

        {canViewFinancials && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
                Hoy
              </p>
              <div className="p-1.5 rounded-lg bg-cyan-500/10">
                <Zap size={14} className="text-cyan-500" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                {currency(todayIncome)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
                cobrado hoy
              </p>
            </div>
          </div>
        )}

        {canViewFinancials && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
                Mes
              </p>
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <TrendingUp size={14} className="text-violet-500" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                {currency(monthlyIncome)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
                ingreso del mes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[
          {
            label: 'Buscar Alumno',
            description: 'Encontrá un alumno rápido',
            icon: Search,
            iconClass: 'bg-slate-800 dark:bg-slate-700 text-slate-100',
            hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-600',
            view: 'students',
          },
          {
            label: 'Registrar Pago',
            description: 'Cargá un pago al instante',
            icon: DollarSign,
            iconClass: 'bg-cyan-500 text-slate-950',
            hoverBorder: 'hover:border-cyan-400/60 dark:hover:border-cyan-500/40',
            view: 'payments',
          },
          {
            label: 'Ver Deudores',
            description: 'Listado de cuotas vencidas',
            icon: AlertCircle,
            iconClass: 'bg-rose-500 text-white',
            hoverBorder: 'hover:border-rose-400/60 dark:hover:border-rose-500/40',
            view: 'defaulters',
          },
          {
            label: 'Nuevo Alumno',
            description: 'Registrá un alumno nuevo',
            icon: UserPlus,
            iconClass: 'bg-emerald-500 text-white',
            hoverBorder: 'hover:border-emerald-400/60 dark:hover:border-emerald-500/40',
            view: 'new-student',
          },
        ].map(({ label, description, icon: Icon, iconClass, hoverBorder, view }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={`
              group flex items-center gap-4 px-4 py-3.5
              bg-white dark:bg-slate-900
              rounded-2xl border border-slate-200 dark:border-slate-800
              ${hoverBorder}
              shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-slate-950/60
              transition-all duration-150 active:scale-[0.98] text-left
            `}
          >
            <div className={`w-10 h-10 rounded-xl ${iconClass} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-150`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {label}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5 font-medium">
                {description}
              </p>
            </div>
            <ArrowUpRight
              size={16}
              className="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-500 transition-colors shrink-0"
            />
          </button>
        ))}
      </div>

      {/* ── Estadísticas del Gimnasio ───────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-0.5">
          <Sparkles size={13} className="text-cyan-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Estadísticas del Gimnasio</h3>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Alumnos Activos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
                Alumnos Activos
              </p>
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Users size={13} className="text-emerald-500" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                {activeCount}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
                en el gimnasio
              </p>
            </div>
          </div>

          {/* Nuevos este mes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
                Nuevos este Mes
              </p>
              <div className="p-1.5 rounded-lg bg-cyan-500/10">
                <UserPlus size={13} className="text-cyan-500" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                +{newThisMonth}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
                alumnos ingresados
              </p>
            </div>
          </div>

          {/* Ingresos del mes */}
          {canViewFinancials && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
                  Ingresos del Mes
                </p>
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                  <TrendingUp size={13} className="text-violet-500" />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
                  {currency(monthlyIncome)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
                  cobrado este mes
                </p>
              </div>
            </div>
          )}

          {/* Deudores */}
          <div className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex flex-col gap-3 shadow-sm dark:shadow-none transition-colors ${
            expiredStudents.length > 0
              ? 'border-rose-200 dark:border-rose-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
                Deudores
              </p>
              <div className="p-1.5 rounded-lg bg-rose-500/10">
                <AlertCircle size={13} className="text-rose-500" />
              </div>
            </div>
            <div>
              <p className={`text-3xl font-black tracking-tight leading-none tabular-nums ${
                expiredStudents.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
              }`}>
                {expiredStudents.length}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1.5 font-medium">
                cuotas vencidas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pendientes + Top Deudores ───────────────────────────────── */}
      <div className="grid xl:grid-cols-2 gap-6">

        {/* Pendientes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pendientes</h3>
            <button
              onClick={() => onNavigate('defaulters')}
              className="flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-2"
            >
              Ver todos <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingStudents.length > 0 ? (
              pendingStudents.map((student: any) => (
                <div
                  key={student.id}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-rose-500 px-4 py-3.5 hover:border-slate-300 dark:hover:border-slate-700 hover:border-l-rose-500 transition-all shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${avatarColor(student.displayName)}`}>
                      {student.firstLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {student.displayName}
                        </p>
                        <BillingBadge
                          cobra_cuota={student.cobra_cuota}
                          recordatorio_automatico={student.recordatorio_automatico}
                          tipo_beca={student.tipo_beca}
                          whatsapp_opt_in={student.whatsapp_opt_in}
                        />
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5 font-medium">
                        {student.dueStatus === 'expired'
                          ? `Venció hace ${Math.abs(student.diffDays)} días`
                          : `Vence el ${formatDate(String(student.nextDueDate))}`}
                      </p>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white shrink-0 tabular-nums">
                      ${student.debtDisplay || 0}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-slate-600 dark:text-slate-400">
                      <MessageSquare size={12} />
                      Recordar
                    </Button>
                    <Button size="sm" variant="primary" className="flex-1" onClick={() => onSelectStudent(student)}>
                      <CreditCard size={12} />
                      Cobrar
                    </Button>
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => onSelectStudent(student)}>
                      <ArrowUpRight size={15} />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2.5">
                  <Users size={16} className="text-emerald-500" />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">
                  Sin pendientes
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-700 mt-0.5">
                  Todos los alumnos al día
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Top Deudores */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Deudores</h3>
            <button
              onClick={() => onNavigate('defaulters')}
              className="flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-2"
            >
              Ver todos <ChevronRight size={13} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800">
            {topDefaulters.length > 0 ? (
              topDefaulters.map((student: any, i: number) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xs font-black text-slate-300 dark:text-slate-700 w-4 shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-black text-sm shrink-0">
                    {student.firstLetter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {student.displayName}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">
                      {Math.abs(student.diffDays)} días de atraso
                    </p>
                  </div>
                  <p className="font-black text-sm text-rose-500 tabular-nums shrink-0">
                    ${student.debtDisplay || 0}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">
                  Sin deudores
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Turnos de Hoy ───────────────────────────────────────────── */}
      {shiftsEnabled && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Turnos de Hoy</h3>
            <button
              onClick={() => onNavigate('shifts')}
              className="flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-2"
            >
              Ver todos <ChevronRight size={13} />
            </button>
          </div>

          {todayShifts.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar size={22} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-600 font-medium">
                Sin turnos para hoy
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {todayShifts.map((shift) => {
                const enrolled = shift.enrolledStudents.length;
                const isFull = enrolled >= shift.capacity;
                return (
                  <Card
                    key={shift.id}
                    className="p-4 cursor-pointer"
                    onClick={() => onNavigate('shifts')}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{shift.name}</p>
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mt-0.5">
                          <Clock size={11} />
                          <span className="text-xs font-medium">{shift.start_time} – {shift.end_time}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg tabular-nums ${
                        isFull ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {enrolled}/{shift.capacity}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => { e.stopPropagation(); onNavigate('shifts'); }}
                    >
                      <Calendar size={12} /> Ver turno
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Actividad Reciente ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white px-0.5">
          Actividad Reciente
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800">
          {recentPayments.length > 0 ? (
            recentPayments.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="p-2 bg-emerald-500/10 rounded-xl shrink-0">
                  <DollarSign size={13} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {payment.displayStudentName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">
                    {formatDate(String(payment.displayDate))}
                  </p>
                </div>
                <p className="font-black text-sm text-emerald-500 tabular-nums shrink-0">
                  {currency(payment.displayAmount)}
                </p>
              </div>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">
                Todavía no hay actividad
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
