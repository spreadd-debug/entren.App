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
  Info,
  Clock3,
  TrendingUp,
} from 'lucide-react';
import { KPICard, Card, Button, BillingBadge } from '../components/UI';
import { Student, Payment } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  students: Student[];
  payments: Payment[];
  onSelectStudent: (student: Student) => void;
  canViewFinancials: boolean;
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  students,
  payments,
  onSelectStudent,
  canViewFinancials,
}) => {
  const safeStudents = Array.isArray(students) ? students : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const normalizedStudents = safeStudents.map((s: any) => {
    const nombre = s.nombre ?? s.name ?? '';
    const apellido = s.apellido ?? s.lastName ?? '';
    const fullName = `${nombre} ${apellido}`.trim() || 'Sin nombre';
    const nextDueDate = s.next_due_date ?? s.nextDueDate ?? null;

    let dueStatus: 'ok' | 'expiring' | 'expired' = 'ok';
    let diffDays = 9999;

    if (isValidDate(nextDueDate)) {
      const dueDate = new Date(String(nextDueDate));
      diffDays = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

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
      planDisplay: s.planName ?? s.plan_nombre ?? 'Sin plan',
      debtDisplay: toNumber(
        s.debt ?? s.precio_personalizado ?? 0
      ),
    };
  });

  const normalizedPayments = safePayments.map((p: any) => {
    const date = p.fecha_pago ?? p.date ?? null;
    const amount = toNumber(p.monto ?? p.amount);
    const method = p.metodo_pago ?? p.method ?? 'otro';
    const studentName =
      p.studentName ??
      p.student_name ??
      p.nombre_completo ??
      (p.student
        ? `${p.student.nombre ?? ''} ${p.student.apellido ?? ''}`.trim()
        : 'Alumno');

    return {
      ...p,
      displayDate: date,
      displayAmount: amount,
      displayMethod: method,
      displayStudentName: studentName || 'Alumno',
    };
  });

  const activeCount = normalizedStudents.filter(
    (s: any) => s.status === 'activo'
  ).length;

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
      const pDate = new Date(String(p.displayDate));
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, p: any) => sum + p.displayAmount, 0);

  const recentPayments = normalizedPayments.slice(0, 5);
  const topDefaulters = expiredStudents.slice(0, 3);

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tight">
          ¡Hola Profe! 👋
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Hoy tenés{' '}
          <span className="text-rose-600 font-bold">{expiredStudents.length} cuotas vencidas</span>{' '}
          y {expiringStudents.length} por vencer.
        </p>
      </div>

      <div className={`grid gap-4 ${canViewFinancials ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'}`}>
        <KPICard
          label="Alumnos Activos"
          value={activeCount}
          icon={<Users className="text-emerald-600" size={20} />}
          color="bg-emerald-50"
        />
        <KPICard
          label="Deudores"
          value={expiredStudents.length}
          icon={<AlertCircle className="text-rose-600" size={20} />}
          color="bg-rose-50"
        />
        {canViewFinancials && (
          <KPICard
            label="Cobrado Hoy"
            value={currency(todayIncome)}
            icon={<DollarSign className="text-indigo-600" size={20} />}
            color="bg-indigo-50"
          />
        )}
        {canViewFinancials && (
          <KPICard
            label="Cobrado Mes"
            value={currency(monthlyIncome)}
            icon={<TrendingUp className="text-amber-600" size={20} />}
            color="bg-amber-50"
          />
        )}
      </div>

      <Card className="p-4 bg-indigo-600 text-black border-0 shadow-xl shadow-indigo-100 relative overflow-hidden group">
        <div className="relative z-10 flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Info size={20} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm">Resumen del día</p>
            <p className="text-xs text-indigo-500 leading-relaxed">
              {expiredStudents.length > 0
                ? `Tenés ${expiredStudents.length} alumnos vencidos. La mejor acción ahora es cobrar o recordar.`
                : `No hay vencidos ahora. Podés revisar pagos recientes o cargar nuevos alumnos.`}
            </p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      </Card>

      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('students')}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <Search size={28} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Buscar Alumno</span>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <DollarSign size={28} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Registrar Pago</span>
          </button>

          <button
            onClick={() => onNavigate('defaulters')}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <AlertCircle size={28} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Ver Deudores</span>
          </button>

          <button
            onClick={() => onNavigate('new-student')}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <UserPlus size={28} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Nuevo Alumno</span>
          </button>
        </div>
      </section>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pendientes de Hoy</h3>
            <button
              onClick={() => onNavigate('defaulters')}
              className="text-sm font-bold text-indigo-600 flex items-center gap-1"
            >
              Ver todos <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {pendingStudents.length > 0 ? (
              pendingStudents.map((student: any) => (
                <Card key={student.id} className="p-4 border-l-4 border-l-rose-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                        {student.firstLetter}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white">{student.displayName}</p>
                          <BillingBadge
                            cobra_cuota={student.cobra_cuota}
                            recordatorio_automatico={student.recordatorio_automatico}
                            tipo_beca={student.tipo_beca}
                            whatsapp_opt_in={student.whatsapp_opt_in}
                          />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {student.dueStatus === 'expired'
                            ? `Venció hace ${Math.abs(student.diffDays)} días`
                            : `Vence el ${formatDate(String(student.nextDueDate))}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ${student.debtDisplay || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                    >
                      <MessageSquare size={14} />
                      Recordar
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1 gap-1"
                      onClick={() => onSelectStudent(student)}
                    >
                      <DollarSign size={14} />
                      Cobrar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => onSelectStudent(student)}
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600">
                <p className="text-slate-400 dark:text-slate-500 font-medium">No hay pendientes para hoy ✨</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Deudores</h3>
            <button
              onClick={() => onNavigate('defaulters')}
              className="text-sm font-bold text-indigo-600 flex items-center gap-1"
            >
              Ver todos <ChevronRight size={16} />
            </button>
          </div>

          <Card className="p-4">
            <div className="space-y-3">
              {topDefaulters.length > 0 ? (
                topDefaulters.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        {student.firstLetter}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{student.displayName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {Math.abs(student.diffDays)} días de atraso
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">${student.debtDisplay || 0}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                  No hay deudores ahora.
                </p>
              )}
            </div>
          </Card>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Actividad Reciente</h3>
        </div>

        <Card className="p-4">
          <div className="space-y-3">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <Clock3 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {payment.displayStudentName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pago registrado el {formatDate(String(payment.displayDate))}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-emerald-600">
                    {currency(payment.displayAmount)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                Todavía no hay actividad reciente.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
};
