import React from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Card, Input, Button } from '../components/UI';
import { Payment } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';

interface PaymentsViewProps {
  payments: Payment[];
  canViewFinancials: boolean;
}

const currency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);

export const PaymentsView: React.FC<PaymentsViewProps> = ({ payments, canViewFinancials }) => {
  const safePayments = Array.isArray(payments) ? payments : [];

  const normalizedPayments = safePayments.map((payment: any) => {
    const date = payment.fecha_pago ?? payment.date ?? null;
    const amount = Number(payment.monto ?? payment.amount ?? 0);
    const method = payment.metodo_pago ?? payment.method ?? 'otro';

    const studentName =
      payment.studentName ??
      payment.student_name ??
      payment.nombre_completo ??
      (payment.student
        ? `${payment.student.nombre ?? ''} ${payment.student.apellido ?? ''}`.trim()
        : 'Alumno');

    return {
      ...payment,
      displayDate: date,
      displayAmount: amount,
      displayMethod: method,
      displayStudentName: studentName || 'Alumno',
    };
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

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

  const getPaymentIcon = (method: string) => {
    const normalized = String(method).toLowerCase();

    if (normalized === 'efectivo' || normalized === 'cash') {
      return <Wallet size={20} />;
    }

    if (
      normalized === 'mercado_pago' ||
      normalized === 'mercadopago' ||
      normalized === 'transferencia' ||
      normalized === 'transfer'
    ) {
      return <Smartphone size={20} />;
    }

    return <CreditCard size={20} />;
  };

  return (
    <div className="space-y-6">
      {canViewFinancials && (
  <div className="grid grid-cols-2 gap-4">
    <Card className="p-4 bg-slate-900 text-black border-0">
      <div className="flex items-center gap-2 mb-2 opacity-80">
        <ArrowUpRight size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Cobrado Hoy</span>
      </div>
      <p className="text-2xl font-black italic">{currency(todayIncome)}</p>
    </Card>

    <Card className="p-4 bg-emerald-500 text-black border-0">
      <div className="flex items-center gap-2 mb-2 opacity-80">
        <CreditCard size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Cobrado Mes</span>
      </div>
      <p className="text-2xl font-black italic">{currency(monthlyIncome)}</p>
    </Card>
  </div>
)}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input placeholder="Buscar pago..." className="pl-12" />
        </div>
        <Button variant="outline" size="icon" className="shrink-0">
          <Filter size={20} />
        </Button>
      </div>

      <Button variant="primary" fullWidth className="gap-2 py-4">
        <Plus size={20} />
        Registrar Cobro
      </Button>

      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 px-1">Pagos Recientes</h3>

        {normalizedPayments.length > 0 ? (
          normalizedPayments.map((payment: any) => (
            <Card key={payment.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  {getPaymentIcon(payment.displayMethod)}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">{payment.displayStudentName}</p>
                  <p className="text-xs text-slate-500">
                    {payment.displayDate ? formatDate(String(payment.displayDate)) : 'Sin fecha'} •{' '}
                    {String(payment.displayMethod).replaceAll('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-black text-slate-900">${payment.displayAmount}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Completado</p>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">No hay pagos registrados.</p>
        )}
      </div>
    </div>
  );
};