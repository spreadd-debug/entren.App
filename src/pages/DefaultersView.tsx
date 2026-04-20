import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, MessageSquare, DollarSign, Clock, Search, Bell, Layers } from 'lucide-react';
import { Card, Button, Input, BillingBadge } from '../components/UI';
import { Student, Plan, StudentPackage, PricingModel } from '../../shared/types';
import { getDaysLate, formatDate } from '../utils/dateUtils';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { StudentPackageService } from '../services/StudentPackageService';
import { useToast } from '../context/ToastContext';

const EXPIRING_DAYS = 7;
const PACKAGE_LOW_THRESHOLD = 2; // sesiones restantes que disparan "por vencer"

interface DefaultersViewProps {
  students: Student[];
  plans: Plan[];
  onRegisterPayment: (data: any) => void;
  /** Optional. When provided, also detects paquete defaulters. */
  gymId?: string;
}

const isValidDate = (value: unknown) => {
  if (!value) return false;
  const date = new Date(String(value));
  return !isNaN(date.getTime());
};

/** Format an Argentine phone number for wa.me (e.g. 54 9 11 1234-5678 → 5491112345678) */
function formatWAPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) return '54' + digits.slice(1);
  return '54' + digits;
}

function buildWALink(phone: string, message: string): string {
  const formatted = formatWAPhone(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

function buildMensualMessage(name: string, dueDate: string, isExpired: boolean): string {
  const dateStr = isValidDate(dueDate) ? formatDate(dueDate) : dueDate;
  if (isExpired) {
    return `Hola ${name}, te recordamos que tu cuota venció el ${dateStr}. ¡Pasate cuando puedas para regularizarla!`;
  }
  return `Hola ${name}, te avisamos que tu cuota vence el ${dateStr}. ¡Te esperamos!`;
}

function buildPackageMessage(name: string, remaining: number): string {
  if (remaining <= 0) {
    return `Hola ${name}, se te terminó el paquete de sesiones. ¿Renovamos?`;
  }
  return `Hola ${name}, te quedan ${remaining} sesión${remaining === 1 ? '' : 'es'} del paquete. ¡Avisame cuando quieras renovar!`;
}

export const DefaultersView: React.FC<DefaultersViewProps> = ({
  students,
  plans,
  onRegisterPayment,
  gymId,
}) => {
  const toast = useToast();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [packagesByStudent, setPackagesByStudent] = useState<Record<string, StudentPackage>>({});

  const safeStudents = Array.isArray(students) ? students : [];
  const safePlans = Array.isArray(plans) ? plans : [];

  const hasPackageStudents = useMemo(
    () => safeStudents.some((s: any) => s.pricing_model === 'paquete'),
    [safeStudents],
  );

  useEffect(() => {
    if (!gymId || !hasPackageStudents) {
      setPackagesByStudent({});
      return;
    }
    let cancelled = false;
    StudentPackageService.getActiveByGym(gymId)
      .then((pkgs) => {
        if (cancelled) return;
        const map: Record<string, StudentPackage> = {};
        for (const p of pkgs) map[p.student_id] = p;
        setPackagesByStudent(map);
      })
      .catch((err) => console.error('DefaultersView: failed to load packages', err));
    return () => { cancelled = true; };
  }, [gymId, hasPackageStudents, safeStudents.length]);

  const { expired, expiring } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired: any[] = [];
    const expiring: any[] = [];

    for (const s of safeStudents as any[]) {
      if (s.status !== 'activo') continue;

      const pricingModel: PricingModel = s.pricing_model ?? (s.cobra_cuota === false ? 'libre' : 'mensual');
      if (pricingModel === 'libre') continue;
      if (pricingModel === 'por_sesion') continue; // fuera de scope: requiere cruzar shift_students

      const nombre = s.nombre ?? s.name ?? '';
      const apellido = s.apellido ?? s.lastName ?? '';
      const displayName = `${nombre} ${apellido}`.trim() || 'Sin nombre';
      if (!displayName.toLowerCase().includes(searchTerm.toLowerCase())) continue;
      const phone = s.telefono ?? s.phone ?? '';
      const firstLetter = (nombre || '?').charAt(0).toUpperCase();

      if (pricingModel === 'mensual') {
        if (!s.cobra_cuota) continue;
        const dueDateRaw = s.next_due_date ?? s.nextDueDate;
        if (!isValidDate(dueDateRaw)) continue;
        const dueDate = new Date(String(dueDateRaw));
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= EXPIRING_DAYS) continue;

        const matchingPlan = safePlans.find((p: any) => p.id === s.plan_id || p.id === s.planId);
        const debt = Number(
          s.debt ?? s.precio_personalizado ?? (matchingPlan as any)?.precio ?? s.plan_precio ?? 0,
        );
        const isExpired = diffDays < 0;
        const entry = {
          ...s,
          displayName,
          firstLetter,
          mode: 'mensual' as const,
          planDisplay: s.planName ?? s.plan_nombre ?? (matchingPlan as any)?.nombre ?? 'Sin cuota asignada',
          dueDateDisplay: dueDateRaw,
          debtDisplay: debt,
          diffDays,
          phone,
          isExpired,
          waLink: phone
            ? buildWALink(phone, buildMensualMessage(nombre || displayName, dueDateRaw ?? '', isExpired))
            : null,
        };
        (isExpired ? expired : expiring).push(entry);
        continue;
      }

      if (pricingModel === 'paquete') {
        const pkg = packagesByStudent[s.id];
        const remaining = pkg ? Math.max(0, pkg.sessions_total - pkg.sessions_used) : 0;
        const exhausted = !pkg || remaining <= 0;
        const low = !exhausted && remaining <= PACKAGE_LOW_THRESHOLD;
        if (!exhausted && !low) continue;

        const debt = Number(pkg?.price_paid ?? s.precio_personalizado ?? 0);
        const entry = {
          ...s,
          displayName,
          firstLetter,
          mode: 'paquete' as const,
          planDisplay: pkg
            ? `Paquete ${pkg.sessions_used}/${pkg.sessions_total}`
            : 'Sin paquete activo',
          dueDateDisplay: pkg?.purchased_at ?? null,
          debtDisplay: debt,
          remaining,
          totalSessions: pkg?.sessions_total ?? 0,
          phone,
          isExpired: exhausted,
          waLink: phone
            ? buildWALink(phone, buildPackageMessage(nombre || displayName, remaining))
            : null,
        };
        (exhausted ? expired : expiring).push(entry);
        continue;
      }
    }

    expired.sort((a, b) => (a.diffDays ?? 0) - (b.diffDays ?? 0));
    expiring.sort((a, b) => (a.remaining ?? a.diffDays ?? 0) - (b.remaining ?? b.diffDays ?? 0));
    return { expired, expiring };
  }, [safeStudents, safePlans, searchTerm, packagesByStudent]);

  const allStudents = [...expired, ...expiring];

  const totalDebt = expired.reduce((sum: number, s: any) => sum + s.debtDisplay, 0);
  const formattedDebt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(totalDebt);

  return (
    <div className="space-y-5">

      {/* ── Header counters ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-500/20 p-4 flex flex-col gap-1 shadow-sm dark:shadow-none">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.12em]">Vencidas</p>
          <p className="text-3xl font-black text-rose-500 leading-none tabular-nums">{expired.length}</p>
          {expired.length > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-600 font-medium">{formattedDebt} estimado</p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-4 flex flex-col gap-1 shadow-sm dark:shadow-none">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.12em]">Por vencer</p>
          <p className="text-3xl font-black text-amber-500 leading-none tabular-nums">{expiring.length}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-600 font-medium">cuotas + paquetes bajos</p>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Buscar alumno..."
          className="pl-12"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── List ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {allStudents.map((student: any) => (
          <Card
            key={student.id}
            className={`p-4 border-l-4 ${student.isExpired ? 'border-l-rose-500' : 'border-l-amber-400'}`}
          >
            {/* Student info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                  student.isExpired
                    ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {student.firstLetter}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{student.displayName}</h4>
                    <BillingBadge
                      cobra_cuota={student.cobra_cuota}
                      recordatorio_automatico={student.recordatorio_automatico}
                      tipo_beca={student.tipo_beca}
                      whatsapp_opt_in={student.whatsapp_opt_in}
                    />
                    {student.mode === 'paquete' && (
                      <span className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                        <Layers size={10} />
                        Paquete
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{student.planDisplay}</p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                {student.mode === 'paquete' ? (
                  student.isExpired ? (
                    <>
                      <p className="text-xs font-bold text-rose-500 uppercase">Agotado</p>
                      {student.debtDisplay > 0 && (
                        <p className="font-black text-slate-900 dark:text-white text-sm">
                          ${student.debtDisplay.toLocaleString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                        <Layers size={10} />
                        {student.remaining} restante{student.remaining === 1 ? '' : 's'}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        de {student.totalSessions}
                      </p>
                    </>
                  )
                ) : student.isExpired ? (
                  <>
                    <p className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1 justify-end">
                      <Clock size={11} />
                      {getDaysLate(String(student.dueDateDisplay))} días
                    </p>
                    <p className="font-black text-slate-900 dark:text-white text-sm">${student.debtDisplay}</p>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                      <Bell size={10} />
                      {student.diffDays === 0 ? 'Hoy' : `${student.diffDays}d`}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {student.dueDateDisplay ? formatDate(String(student.dueDateDisplay)) : '-'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              {student.waLink ? (
                <a
                  href={student.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageSquare size={15} />
                  Recordar
                </a>
              ) : (
                <Button variant="outline" size="sm" className="gap-2 text-slate-400" disabled>
                  <MessageSquare size={15} />
                  Sin teléfono
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={() => setSelectedStudent(student)}
              >
                {student.mode === 'paquete' ? <Layers size={15} /> : <DollarSign size={15} />}
                {student.mode === 'paquete' ? 'Renovar' : 'Cobrar'}
              </Button>
            </div>
          </Card>
        ))}

        {allStudents.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={36} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">¡Todo al día!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              No hay cuotas vencidas, paquetes agotados ni vencimientos en los próximos {EXPIRING_DAYS} días.
            </p>
          </div>
        )}
      </div>

      {selectedStudent && (
        <RegisterPaymentModal
          student={selectedStudent}
          plans={safePlans}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onConfirm={(data) => {
            onRegisterPayment({ studentId: selectedStudent.id, ...data });
            setSelectedStudent(null);
          }}
          onConfirmPackage={async (pkg) => {
            try {
              const gid = gymId ?? (selectedStudent as any).gym_id ?? (selectedStudent as any).gymId;
              if (!gid) throw new Error('Falta gymId para crear el paquete');
              const created = await StudentPackageService.create({
                studentId: selectedStudent.id,
                gymId: gid,
                sessionsTotal: pkg.sessionsTotal,
                pricePaid: pkg.pricePaid,
                paymentMethod: pkg.method,
                purchasedAt: pkg.date,
              });
              setPackagesByStudent((prev) => ({ ...prev, [selectedStudent.id]: created }));
              toast.success(`Paquete de ${pkg.sessionsTotal} sesiones creado`);
              setSelectedStudent(null);
            } catch (err: any) {
              toast.error(err?.message ?? 'No se pudo crear el paquete');
            }
          }}
        />
      )}
    </div>
  );
};
