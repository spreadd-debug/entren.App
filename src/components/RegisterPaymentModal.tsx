import React, { useEffect, useMemo, useState } from 'react';
import { X, CreditCard, Calendar, DollarSign, Smartphone } from 'lucide-react';
import { Button, Input } from './UI';
import { Student, Plan } from '../../shared/types';
import { calculateNextDueDate, formatDate } from '../utils/dateUtils';

interface RegisterPaymentModalProps {
  student: Student;
  plans: Plan[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: {
    amount: number;
    method: 'cash' | 'transfer' | 'mercadopago';
    date: string;
    nextDueDate: string;
  }) => void;
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  student,
  plans,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const safePlans = Array.isArray(plans) ? plans : [];

  const normalizedPlans = useMemo(() => {
    return safePlans.map((plan: any) => ({
      ...plan,
      name: plan.name ?? plan.nombre ?? '',
      price: Number(plan.price ?? plan.precio ?? 0),
      durationDays: Number(plan.durationDays ?? plan.duracion_dias ?? 30),
      active: plan.active ?? plan.activo ?? true,
    }));
  }, [safePlans]);

  const studentPlanId = (student as any).plan_id ?? (student as any).planId;

  const selectedPlan = normalizedPlans.find((p: any) => p.id === studentPlanId) ?? normalizedPlans[0] ?? {
    price: 0,
    durationDays: 30,
  };

  const studentName =
    (student as any).name ??
    `${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim() ??
    'Alumno';

  const today = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState<number>(selectedPlan.price || 0);
  const [method, setMethod] = useState<'cash' | 'transfer' | 'mercadopago'>('cash');
  const [date, setDate] = useState<string>(today);
  const [nextDueDate, setNextDueDate] = useState<string>(
    calculateNextDueDate(today, selectedPlan.durationDays)
  );

  useEffect(() => {
    setAmount(Number(selectedPlan.price ?? 0));
    setNextDueDate(calculateNextDueDate(date, selectedPlan.durationDays));
  }, [selectedPlan.id]);

  useEffect(() => {
    setNextDueDate(calculateNextDueDate(date, selectedPlan.durationDays));
  }, [date, selectedPlan.durationDays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Pago</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{studentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Monto a Cobrar</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="pl-12 text-xl font-black italic"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Método de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  method === 'cash'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <DollarSign size={20} />
                <span className="text-[10px] font-black uppercase">Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  method === 'transfer'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <CreditCard size={20} />
                <span className="text-[10px] font-black uppercase">Transf.</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('mercadopago')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  method === 'mercadopago'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Smartphone size={20} />
                <span className="text-[10px] font-black uppercase">M. Pago</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Fecha Pago</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-11 text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Vencimiento</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" size={18} />
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="pl-11 text-sm font-bold text-rose-600"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-xs text-emerald-700 font-medium text-center">
              Al registrar el pago, el alumno quedará <strong>AL DÍA</strong> hasta el{' '}
              <strong>{formatDate(nextDueDate)}</strong>.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
          <Button
            fullWidth
            size="lg"
            onClick={() => onConfirm({ amount, method, date, nextDueDate })}
            className="shadow-xl shadow-slate-200 dark:shadow-slate-900"
          >
            Confirmar Pago
          </Button>
        </div>
      </div>
    </div>
  );
};
