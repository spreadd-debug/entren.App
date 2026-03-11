import React, { useMemo, useState } from 'react';
import { AlertCircle, MessageSquare, DollarSign, Clock, Search } from 'lucide-react';
import { Card, Button, Input, BillingBadge } from '../components/UI';
import { Student, Plan } from '../../shared/types';
import { getDaysLate } from '../utils/dateUtils';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';

interface DefaultersViewProps {
  students: Student[];
  plans: Plan[];
  onRegisterPayment: (data: any) => void;
}

const isValidDate = (value: unknown) => {
  if (!value) return false;
  const date = new Date(String(value));
  return !isNaN(date.getTime());
};

export const DefaultersView: React.FC<DefaultersViewProps> = ({
  students,
  plans,
  onRegisterPayment,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const safeStudents = Array.isArray(students) ? students : [];
  const safePlans = Array.isArray(plans) ? plans : [];

  const defaulters = useMemo(() => {
    const today = new Date();

    return safeStudents
      .filter((s: any) => {
        if (s.status !== 'activo') return false;
        if (!s.cobra_cuota) return false;
        if (!s.next_due_date && !s.nextDueDate) return false;

        const dueDateRaw = s.next_due_date ?? s.nextDueDate;
        if (!isValidDate(dueDateRaw)) return false;

        const dueDate = new Date(String(dueDateRaw));
        return dueDate.getTime() < today.getTime();
      })
      .map((student: any) => {
        const nombre = student.nombre ?? student.name ?? '';
        const apellido = student.apellido ?? student.lastName ?? '';
        const nextDueDate = student.next_due_date ?? student.nextDueDate ?? null;

        const matchingPlan = safePlans.find((p: any) => p.id === student.plan_id || p.id === student.planId);

        const debt = Number(
          student.debt ??
            student.precio_personalizado ??
            matchingPlan?.precio ??
            student.plan_precio ??
            0
        );

        return {
          ...student,
          displayName: `${nombre} ${apellido}`.trim() || 'Sin nombre',
          firstLetter: (nombre || '?').charAt(0).toUpperCase(),
          planDisplay:
            student.planName ??
            student.plan_nombre ??
            matchingPlan?.nombre ??
            'Sin plan',
          dueDateDisplay: nextDueDate,
          debtDisplay: debt,
        };
      })
      .filter((student: any) =>
        student.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: any, b: any) => {
        const aDate = new Date(String(a.dueDateDisplay)).getTime();
        const bDate = new Date(String(b.dueDateDisplay)).getTime();
        return aDate - bDate;
      });
  }, [safeStudents, safePlans, searchTerm]);

  const totalDebt = defaulters.reduce((sum: number, s: any) => sum + s.debtDisplay, 0);

  const formattedDebt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(totalDebt);

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-rose-50 border-rose-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-900">Total Deuda Estimada</p>
            <p className="text-2xl font-black text-rose-600 italic">{formattedDebt}</p>
          </div>
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <Input
          placeholder="Buscar moroso..."
          className="pl-12"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {defaulters.map((student: any) => (
          <Card key={student.id} className="p-4 border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  {student.firstLetter}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{student.displayName}</h4>
                    <BillingBadge
                      cobra_cuota={student.cobra_cuota}
                      recordatorio_automatico={student.recordatorio_automatico}
                      tipo_beca={student.tipo_beca}
                      whatsapp_opt_in={student.whatsapp_opt_in}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{student.planDisplay}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1 justify-end">
                  <Clock size={12} />
                  {student.dueDateDisplay ? getDaysLate(String(student.dueDateDisplay)) : 0} días
                </p>
                <p className="font-black text-slate-900">${student.debtDisplay}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
              >
                <MessageSquare size={16} />
                Recordar
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={() => setSelectedStudent(student)}
              >
                <DollarSign size={16} />
                Cobrar
              </Button>
            </div>
          </Card>
        ))}

        {defaulters.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¡Todo al día!</h3>
            <p className="text-slate-500">No hay alumnos con cuotas vencidas.</p>
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
        />
      )}
    </div>
  );
};