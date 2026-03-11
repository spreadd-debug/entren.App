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
} from 'lucide-react';
import { KPICard, Card, Button, BillingBadge } from '../components/UI';
import { Student, Payment } from '../../shared/types';
import { getDaysLate, formatDate } from '../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  students: Student[];
  payments: Payment[];
  onSelectStudent: (student: Student) => void;
}

const isValidDate = (value: unknown) => {
  if (!value) return false;
  const date = new Date(String(value));
  return !isNaN(date.getTime());
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  students,
  payments,
  onSelectStudent,
}) => {
  const safeStudents = Array.isArray(students) ? students : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const today = new Date();

  const activeCount = safeStudents.filter((s) => s.status === 'activo').length;

  const pendingStudents = safeStudents
    .filter((s) => {
      if (s.status !== 'activo') return false;
      if (!s.cobra_cuota) return false;
      if (!s.next_due_date) return false;
      return isValidDate(s.next_due_date);
    })
    .map((s) => {
      const dueDate = new Date(String(s.next_due_date));
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        ...s,
        dueStatus: diffDays < 0 ? 'expired' : diffDays <= 3 ? 'expiring' : 'ok',
        diffDays,
      };
    })
    .filter((s) => s.dueStatus === 'expired' || s.dueStatus === 'expiring')
    .sort((a, b) => {
      if (a.dueStatus === 'expired' && b.dueStatus !== 'expired') return -1;
      if (a.dueStatus !== 'expired' && b.dueStatus === 'expired') return 1;
      return new Date(String(a.next_due_date)).getTime() - new Date(String(b.next_due_date)).getTime();
    })
    .slice(0, 4);

  const expiredCount = pendingStudents.filter((s) => s.dueStatus === 'expired').length;
  const expiringCount = pendingStudents.filter((s) => s.dueStatus === 'expiring').length;

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const monthlyIncome = safePayments
    .filter((p: any) => {
      const rawDate = p.fecha_pago ?? p.date;
      if (!rawDate) return false;
      const pDate = new Date(String(rawDate));
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, p: any) => sum + Number(p.monto ?? p.amount ?? 0), 0);

  const formattedIncome = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monthlyIncome);

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-slate-900 italic tracking-tight">
          ¡Hola Profe! 👋
        </h2>
        <p className="text-slate-500 font-medium">
          Hoy tenés <span className="text-rose-600 font-bold">{expiredCount} cuotas vencidas</span> y {expiringCount} por vencer.
        </p>
      </div>

      <Card className="p-4 bg-indigo-600 text-white border-0 shadow-xl shadow-indigo-100 relative overflow-hidden group">
        <div className="relative z-10 flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Info size={20} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm">Sugerencia del día</p>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Te recomendamos empezar revisando los alumnos con cuotas vencidas para mantener el gimnasio al día.
            </p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      </Card>

      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('students')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <Search size={28} />
            </div>
            <span className="font-bold text-slate-900">Buscar Alumno</span>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <DollarSign size={28} />
            </div>
            <span className="font-bold text-slate-900">Registrar Pago</span>
          </button>

          <button
            onClick={() => onNavigate('defaulters')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <AlertCircle size={28} />
            </div>
            <span className="font-bold text-slate-900">Ver Morosos</span>
          </button>

          <button
            onClick={() => onNavigate('new-student')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <UserPlus size={28} />
            </div>
            <span className="font-bold text-slate-900">Nuevo Alumno</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-900">Pendientes de Hoy</h3>
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
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                      {(student.nombre ?? '?').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">
                          {student.nombre} {student.apellido}
                        </p>
                        <BillingBadge
                          cobra_cuota={student.cobra_cuota}
                          recordatorio_automatico={student.recordatorio_automatico}
                          tipo_beca={student.tipo_beca}
                          whatsapp_opt_in={student.whatsapp_opt_in}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {student.dueStatus === 'expired'
                          ? `Venció hace ${Math.abs(student.diffDays)} días`
                          : `Vence el ${formatDate(String(student.next_due_date))}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">
                      ${Number(student.precio_personalizado ?? 0)}
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
            <div className="text-center py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No hay pendientes para hoy ✨</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 px-1">Resumen Mensual</h3>
        <div className="grid grid-cols-2 gap-4">
          <KPICard
            label="Alumnos Activos"
            value={activeCount}
            icon={<Users className="text-emerald-600" size={20} />}
            color="bg-emerald-50"
          />
          <KPICard
            label="Recaudación"
            value={formattedIncome}
            icon={<CreditCard className="text-indigo-600" size={20} />}
            color="bg-indigo-50"
          />
        </div>
      </section>
    </div>
  );
};
