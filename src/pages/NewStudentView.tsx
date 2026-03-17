import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  User,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  DollarSign,
  Bell,
  ShieldCheck,
  MessageSquare,
  HeartPulse,
} from 'lucide-react';
import { Card, Button, Input } from '../components/UI';
import { Plan, Student } from '../../shared/types';
import { calculateNextDueDate } from '../utils/dateUtils';

interface NewStudentViewProps {
  plans: Plan[];
  onBack: () => void;
  onCreateStudent: (student: Partial<Student>, registerPayment: boolean) => void;
}

type ScholarshipTypeUI = 'ninguna' | 'parcial' | 'completa';
type StudentStatusUI = 'activo' | 'baja';

export const NewStudentView: React.FC<NewStudentViewProps> = ({
  plans,
  onBack,
  onCreateStudent,
}) => {
  const safePlans = Array.isArray(plans) ? plans : [];

  const normalizedPlans = useMemo(() => {
    return safePlans.map((plan: any) => ({
      ...plan,
      name: plan.name ?? plan.nombre ?? '',
      price: Number(plan.price ?? plan.precio ?? 0),
      durationDays: Number(plan.durationDays ?? plan.duracion_dias ?? 30),
      classesPerWeek: plan.classesPerWeek ?? plan.clases_por_semana ?? undefined,
      active: plan.active ?? plan.activo ?? true,
    }));
  }, [safePlans]);

  const activePlans = normalizedPlans.filter((plan: any) => plan.active);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    planId: '',
    price: 0,
    startDate: new Date().toISOString().split('T')[0],
    status: 'activo' as StudentStatusUI,
    observaciones: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    cobra_cuota: true,
    recordatorio_automatico: true,
    whatsapp_opt_in: true,
    tipo_beca: 'ninguna' as ScholarshipTypeUI,
    observaciones_cobranza: '',
  });

  useEffect(() => {
    if (activePlans.length > 0 && !formData.planId) {
      setFormData((prev) => ({
        ...prev,
        planId: activePlans[0].id,
        price: activePlans[0].price,
      }));
    }
  }, [activePlans, formData.planId]);

  const handlePlanChange = (planId: string) => {
    const selectedPlan = activePlans.find((p: any) => p.id === planId);
    if (!selectedPlan) return;

    setFormData((prev) => ({
      ...prev,
      planId,
      price: selectedPlan.price,
    }));
  };

  const handleSubmit = (registerPayment: boolean) => {
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      alert('Por favor completá nombre y apellido');
      return;
    }

    const selectedPlan = activePlans.find((p: any) => p.id === formData.planId);
    if (!selectedPlan) {
      alert('Seleccioná un plan');
      return;
    }

    const nextDueDate = calculateNextDueDate(
      formData.startDate,
      selectedPlan.durationDays
    );

    const newStudent: Partial<Student> = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      telefono: formData.telefono,
      plan_id: formData.planId,
      status: formData.status,
      last_payment_date: registerPayment ? formData.startDate : null,
      next_due_date: nextDueDate,
      observaciones: formData.observaciones,
      emergency_contact_name: formData.emergency_contact_name || undefined,
      emergency_contact_phone: formData.emergency_contact_phone || undefined,
      cobra_cuota: formData.cobra_cuota,
      recordatorio_automatico: formData.recordatorio_automatico,
      precio_personalizado:
        formData.price !== selectedPlan.price ? formData.price : undefined,
      tipo_beca: formData.tipo_beca,
      whatsapp_opt_in: formData.whatsapp_opt_in,
      whatsapp_opt_in_at: formData.whatsapp_opt_in
        ? new Date().toISOString()
        : undefined,
      debt: registerPayment ? 0 : formData.cobra_cuota ? formData.price : 0,
    } as any;

    onCreateStudent(newStudent, registerPayment);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Alumno</h2>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            Datos Personales
          </h4>
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                  Nombre
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <Input
                    placeholder="Juan"
                    className="pl-9 h-12"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                  Apellido
                </label>
                <Input
                  placeholder="Pérez"
                  className="h-12"
                  value={formData.apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, apellido: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Teléfono
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  placeholder="11 2233-4455"
                  className="pl-9 h-12"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Contacto de emergencia */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <HeartPulse size={14} className="text-rose-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Contacto de Emergencia
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                    Nombre
                  </label>
                  <Input
                    placeholder="Ej: María Pérez"
                    className="h-12"
                    value={formData.emergency_contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, emergency_contact_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-300" size={14} />
                    <Input
                      placeholder="11 2233-4455"
                      className="pl-9 h-12"
                      value={formData.emergency_contact_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact_phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            Datos del Plan
          </h4>
          <Card className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Seleccionar Plan
              </label>
              <div className="relative">
                <CreditCard
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <select
                  className="w-full pl-9 pr-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-bold text-sm bg-white dark:bg-slate-700 appearance-none"
                  value={formData.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                >
                  {activePlans.length === 0 ? (
                    <option value="">No hay planes activos</option>
                  ) : (
                    activePlans.map((plan: any) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                  Precio Final ($)
                </label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <Input
                    type="number"
                    className="pl-9 h-12"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                  Fecha Inicio
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <Input
                    type="date"
                    className="pl-9 h-12"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            Cobranza
          </h4>
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-slate-900 dark:text-white">
                  Cobra Cuota
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  ¿Este alumno debe pagar mensualmente?
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    cobra_cuota: !formData.cobra_cuota,
                  })
                }
                className={`w-12 h-6 rounded-full transition-all relative ${
                  formData.cobra_cuota ? 'bg-indigo-500' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    formData.cobra_cuota ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-slate-900 dark:text-white">
                    Recordatorio Automático
                  </label>
                  <Bell size={12} className="text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Enviar mensajes de vencimiento
                </p>
              </div>
              <button
                type="button"
                disabled={!formData.cobra_cuota}
                onClick={() =>
                  setFormData({
                    ...formData,
                    recordatorio_automatico: !formData.recordatorio_automatico,
                  })
                }
                className={`w-12 h-6 rounded-full transition-all relative ${
                  formData.recordatorio_automatico && formData.cobra_cuota
                    ? 'bg-indigo-500'
                    : 'bg-slate-200'
                } ${!formData.cobra_cuota ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    formData.recordatorio_automatico && formData.cobra_cuota
                      ? 'right-1'
                      : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-slate-900 dark:text-white">
                    Opt-in WhatsApp
                  </label>
                  <MessageSquare size={12} className="text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  El alumno acepta recibir mensajes
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    whatsapp_opt_in: !formData.whatsapp_opt_in,
                  })
                }
                className={`w-12 h-6 rounded-full transition-all relative ${
                  formData.whatsapp_opt_in ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    formData.whatsapp_opt_in ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Tipo de Beca
                </label>
                <ShieldCheck size={12} className="text-slate-400" />
              </div>

              <div className="flex gap-2">
                {(['ninguna', 'parcial', 'completa'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const isComplete = type === 'completa';
                      setFormData({
                        ...formData,
                        tipo_beca: type,
                        cobra_cuota: isComplete ? false : formData.cobra_cuota,
                        recordatorio_automatico: isComplete
                          ? false
                          : formData.recordatorio_automatico,
                      });
                    }}
                    className={`flex-1 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all ${
                      formData.tipo_beca === type
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {type === 'ninguna'
                      ? 'Ninguna'
                      : type === 'parcial'
                      ? 'Parcial'
                      : 'Completa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Observaciones de Cobranza
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium text-sm min-h-[60px]"
                placeholder="Ej: Paga los 15 de cada mes..."
                value={formData.observaciones_cobranza}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observaciones_cobranza: e.target.value,
                  })
                }
              />
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            Otros
          </h4>
          <Card className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Estado Inicial
              </label>
              <div className="flex gap-2">
                {(['activo', 'baja'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${
                      formData.status === status
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                        : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {status === 'activo' ? 'Activo' : 'Baja'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Observaciones Generales
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-4 text-slate-400" size={16} />
                <textarea
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium text-sm min-h-[100px]"
                  placeholder="Ej: Tiene una lesión en el hombro..."
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                />
              </div>
            </div>
          </Card>
        </section>

        <div className="space-y-3 pt-4">
          <Button
            variant="primary"
            fullWidth
            className="py-4 h-auto flex-col gap-1"
            onClick={() => handleSubmit(true)}
          >
            <span className="text-base">Crear Alumno y Registrar Pago</span>
            <span className="text-[10px] opacity-80 font-medium uppercase tracking-widest">
              Recomendado para nuevos ingresos
            </span>
          </Button>

          <Button
            variant="outline"
            fullWidth
            className="py-4 h-auto"
            onClick={() => handleSubmit(false)}
          >
            Solo Crear Alumno
          </Button>

          <Button variant="ghost" fullWidth onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
