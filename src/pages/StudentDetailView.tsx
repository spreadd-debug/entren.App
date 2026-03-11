
import React, { useState } from 'react';
import { ArrowLeft, Phone, Mail, Calendar, CreditCard, History, Edit2, MessageSquare, Trash2, Smartphone } from 'lucide-react';
import { Card, StatusBadge, Button, BillingBadge } from '../components/UI';
import { Student, Payment, Plan } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { Bell, ShieldCheck, DollarSign as DollarIcon, Info } from 'lucide-react';

interface StudentDetailViewProps {
  student: Student;
  payments: Payment[];
  plans: Plan[];
  onBack: () => void;
  onRegisterPayment: (data: {
    studentId: string;
    amount: number;
    method: 'cash' | 'transfer' | 'mercadopago';
    date: string;
    nextDueDate: string;
  }) => void;
}

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({ 
  student, 
  payments, 
  plans,
  onBack, 
  onRegisterPayment 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirmPayment = (paymentData: any) => {
    onRegisterPayment({
      studentId: student.id,
      ...paymentData
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Edit2 size={18} />
          </Button>
          <Button variant="outline" size="icon" className="text-rose-500 border-rose-100 hover:bg-rose-50">
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-xl shadow-slate-200 italic">
          {student.name.charAt(0)}
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
        <div className="mt-2">
          <StatusBadge status={student.status} />
        </div>
      </div>

      {/* Quick Contact Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" className="flex-col gap-2 py-4 h-auto">
          <Phone size={20} className="text-indigo-600" />
          <span className="text-xs font-bold">Llamar</span>
        </Button>
        <Button variant="outline" className="flex-col gap-2 py-4 h-auto">
          <MessageSquare size={20} className="text-emerald-600" />
          <span className="text-xs font-bold">WhatsApp</span>
        </Button>
        <Button variant="outline" className="flex-col gap-2 py-4 h-auto">
          <Mail size={20} className="text-amber-600" />
          <span className="text-xs font-bold">Email</span>
        </Button>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4">
        <Card className="p-4 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-2">Información del Plan</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Calendar size={18} />
              </div>
              <span className="text-sm font-medium text-slate-500">Plan Actual</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{student.planName}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${student.status === 'expired' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                <Calendar size={18} />
              </div>
              <span className="text-sm font-medium text-slate-500">Vencimiento</span>
            </div>
            <span className={`text-sm font-bold ${student.status === 'expired' ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatDate(student.nextDueDate)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CreditCard size={18} />
              </div>
              <span className="text-sm font-medium text-slate-500">Último Pago</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{formatDate(student.lastPaymentDate)}</span>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-2">Configuración de Cobranza</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${student.cobra_cuota ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <DollarIcon size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Cobra Cuota</p>
                <p className="text-[10px] text-slate-500">{student.cobra_cuota ? 'Habilitado' : 'Exento'}</p>
              </div>
            </div>
            <BillingBadge 
              cobra_cuota={student.cobra_cuota} 
              recordatorio_automatico={student.recordatorio_automatico} 
              tipo_beca={student.tipo_beca} 
              whatsapp_opt_in={student.whatsapp_opt_in}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${student.recordatorio_automatico ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                <Bell size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Recordatorios</p>
                <p className="text-[10px] text-slate-500">{student.recordatorio_automatico ? 'Automáticos' : 'Manuales'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${student.whatsapp_opt_in ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Opt-in WhatsApp</p>
                <p className="text-[10px] text-slate-500">
                  {student.whatsapp_opt_in ? `Aceptado ${student.whatsapp_opt_in_at ? `el ${formatDate(student.whatsapp_opt_in_at)}` : ''}` : 'No aceptado'}
                </p>
              </div>
            </div>
          </div>

          {student.tipo_beca !== 'none' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Beca</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{student.tipo_beca === 'complete' ? 'Completa' : 'Parcial'}</p>
                </div>
              </div>
            </div>
          )}

          {student.observaciones_cobranza && (
            <div className="p-3 bg-slate-50 rounded-xl flex gap-3">
              <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">{student.observaciones_cobranza}</p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Historial de Pagos</h3>
            <History size={18} className="text-slate-400" />
          </div>
          
          <div className="space-y-3">
            {payments.length > 0 ? payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    {payment.method === 'mercadopago' ? <Smartphone size={14} /> : <CreditCard size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatDate(payment.date)}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{payment.method}</p>
                  </div>
                </div>
                <p className="font-bold text-emerald-600">${payment.amount}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-400 text-center py-4">No hay pagos registrados.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Main Action Button */}
      <Button 
        variant="secondary" 
        fullWidth 
        size="lg" 
        className="shadow-xl shadow-emerald-100"
        onClick={() => setIsModalOpen(true)}
      >
        Registrar Nuevo Pago
      </Button>

      <RegisterPaymentModal 
        student={student}
        plans={plans}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
};
