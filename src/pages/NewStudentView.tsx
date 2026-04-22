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
  Repeat,
  Layers,
  Zap,
  Gift,
  Wifi,
} from 'lucide-react';
import { Card, Button, Input } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Plan, Student, PricingModel, PaymentMethod } from '../../shared/types';
import { calculateNextDueDate } from '../utils/dateUtils';
import { PTRateSettingsService, PackageTemplate } from '../services/PTRateSettingsService';

export interface PackageInit {
  sessionsTotal: number;
  pricePaid: number;
  paymentMethod: PaymentMethod;
}

interface NewStudentViewProps {
  plans: Plan[];
  onBack: () => void;
  onCreateStudent: (
    student: Partial<Student>,
    registerPayment: boolean,
    packageInit?: PackageInit,
  ) => void;
  gymType?: 'gym' | 'personal_trainer';
  /** PT mode: used to read rate defaults + package templates from settings */
  gymId?: string;
}

type ScholarshipTypeUI = 'ninguna' | 'parcial' | 'completa';
type StudentStatusUI = 'activo' | 'baja';

export const NewStudentView: React.FC<NewStudentViewProps> = ({
  plans,
  onBack,
  onCreateStudent,
  gymType = 'gym',
  gymId,
}) => {
  const isPT = gymType === 'personal_trainer';
  const toast = useToast();
  const safePlans = Array.isArray(plans) ? plans : [];

  const rateSettings = useMemo(() => {
    if (!isPT || !gymId) return { defaultSessionRate: 0, packageTemplates: [] as PackageTemplate[] };
    return PTRateSettingsService.get(gymId);
  }, [isPT, gymId]);

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
    birth_date: '',
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
    pricing_model: 'mensual' as PricingModel,
    session_rate: 0,
    package_sessions: 10,
    package_price: 0,
    package_method: 'cash' as PaymentMethod,
    is_online: false,
  });

  // Pre-fill session_rate from PT settings on mount (only if user hasn't typed anything yet)
  useEffect(() => {
    if (!isPT) return;
    if (rateSettings.defaultSessionRate > 0 && formData.session_rate === 0) {
      setFormData((prev) => ({ ...prev, session_rate: rateSettings.defaultSessionRate }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateSettings.defaultSessionRate, isPT]);

  const applyPackageTemplate = (tpl: PackageTemplate) => {
    setFormData((prev) => ({
      ...prev,
      package_sessions: tpl.sessionsTotal,
      package_price: tpl.pricePaid,
    }));
  };

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
      toast.error('Por favor completá nombre y apellido');
      return;
    }

    const model = formData.pricing_model;

    // Validations per model
    if (model === 'mensual') {
      const selectedPlan = activePlans.find((p: any) => p.id === formData.planId);
      if (!selectedPlan) {
        toast.error('Seleccioná un plan');
        return;
      }
    }
    if (model === 'por_sesion' && formData.session_rate <= 0) {
      toast.error('Ingresá la tarifa por sesión');
      return;
    }
    if (model === 'paquete') {
      if (formData.package_sessions <= 0) {
        toast.error('Ingresá cantidad de sesiones del paquete');
        return;
      }
      if (formData.package_price <= 0) {
        toast.error('Ingresá el precio del paquete');
        return;
      }
    }

    const selectedPlan = activePlans.find((p: any) => p.id === formData.planId);
    const nextDueDate =
      model === 'mensual' && selectedPlan
        ? calculateNextDueDate(formData.startDate, selectedPlan.durationDays)
        : null;

    // cobra_cuota derived from pricing_model: libre = false, otros = true
    const cobraCuota = model === 'libre' ? false : formData.cobra_cuota;

    const newStudent: Partial<Student> = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      telefono: formData.telefono,
      birth_date: formData.birth_date || null,
      plan_id: model === 'mensual' ? formData.planId : null,
      status: formData.status,
      last_payment_date: registerPayment && model === 'mensual' ? formData.startDate : null,
      next_due_date: nextDueDate,
      observaciones: formData.observaciones,
      emergency_contact_name: formData.emergency_contact_name || undefined,
      emergency_contact_phone: formData.emergency_contact_phone || undefined,
      cobra_cuota: cobraCuota,
      recordatorio_automatico: cobraCuota ? formData.recordatorio_automatico : false,
      precio_personalizado:
        model === 'mensual' && selectedPlan && formData.price !== selectedPlan.price
          ? formData.price
          : undefined,
      tipo_beca: formData.tipo_beca,
      whatsapp_opt_in: formData.whatsapp_opt_in,
      whatsapp_opt_in_at: formData.whatsapp_opt_in
        ? new Date().toISOString()
        : undefined,
      pricing_model: model,
      session_rate: model === 'por_sesion' ? formData.session_rate : undefined,
      debt:
        registerPayment || model === 'paquete' || model === 'libre'
          ? 0
          : model === 'mensual' && cobraCuota
            ? formData.price
            : 0,
      is_online: isPT ? formData.is_online : false,
    } as any;

    const packageInit: PackageInit | undefined =
      model === 'paquete'
        ? {
            sessionsTotal: formData.package_sessions,
            pricePaid: formData.package_price,
            paymentMethod: formData.package_method,
          }
        : undefined;

    // For packages, the package creation IS the initial payment — don't also register a monthly one.
    const shouldRegisterPayment = registerPayment && model === 'mensual';

    onCreateStudent(newStudent, shouldRegisterPayment, packageInit);
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isPT ? 'Nuevo Cliente' : 'Nuevo Alumno'}</h2>
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Fecha de nacimiento <span className="text-slate-300 normal-case font-normal tracking-normal">(opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-12 flex-1"
                  max={new Date().toISOString().slice(0, 10)}
                  value={formData.birth_date}
                  onChange={(e) =>
                    setFormData({ ...formData, birth_date: e.target.value })
                  }
                />
                {formData.birth_date && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {(() => {
                      const b = new Date(`${formData.birth_date}T00:00:00`);
                      const t = new Date();
                      let a = t.getFullYear() - b.getFullYear();
                      const m = t.getMonth() - b.getMonth();
                      if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a -= 1;
                      return a >= 0 && a < 130 ? `${a} años` : '';
                    })()}
                  </span>
                )}
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
            {isPT ? '¿Cómo le cobrás?' : 'Datos del Plan'}
          </h4>
          <Card className="p-5 space-y-4">
            {isPT && (
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'mensual', label: 'Mensual', desc: 'Cuota recurrente', icon: Repeat },
                  { id: 'por_sesion', label: 'Por sesión', desc: 'Cobra cada clase', icon: Zap },
                  { id: 'paquete', label: 'Paquete', desc: 'N sesiones prepagas', icon: Layers },
                  { id: 'libre', label: 'Libre / beca', desc: 'Sin cobro', icon: Gift },
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  const active = formData.pricing_model === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, pricing_model: opt.id as PricingModel })
                      }
                      className={`text-left p-3 rounded-2xl border-2 transition-all ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-sm'
                          : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={active ? 'text-indigo-500' : 'text-slate-400'}
                      />
                      <p
                        className={`mt-1.5 text-sm font-bold ${
                          active ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {formData.pricing_model === 'mensual' && (
              <>
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
              </>
            )}

            {formData.pricing_model === 'por_sesion' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                  Tarifa por sesión ($)
                </label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <Input
                    type="number"
                    className="pl-9 h-12"
                    placeholder="Ej: 5000"
                    value={formData.session_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, session_rate: Number(e.target.value) })
                    }
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                  Se va a cobrar cada vez que el cliente asista a un turno.
                </p>
              </div>
            )}

            {formData.pricing_model === 'paquete' && (
              <div className="space-y-4">
                {rateSettings.packageTemplates.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                      Plantillas guardadas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {rateSettings.packageTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyPackageTemplate(tpl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-all"
                        >
                          <Layers size={12} />
                          {tpl.label ?? `${tpl.sessionsTotal} ses`}
                          <span className="text-violet-400 dark:text-violet-500 font-medium">
                            · ${tpl.pricePaid.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                      Cantidad de sesiones
                    </label>
                    <div className="relative">
                      <Layers
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <Input
                        type="number"
                        className="pl-9 h-12"
                        placeholder="Ej: 10"
                        value={formData.package_sessions || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, package_sessions: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                      Precio total ($)
                    </label>
                    <div className="relative">
                      <DollarSign
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <Input
                        type="number"
                        className="pl-9 h-12"
                        placeholder="Ej: 50000"
                        value={formData.package_price || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, package_price: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                    Método de pago del paquete
                  </label>
                  <div className="flex gap-2">
                    {(['cash', 'transfer', 'mercadopago'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData({ ...formData, package_method: m })}
                        className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          formData.package_method === m
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-400'
                        }`}
                      >
                        {m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transferencia' : 'MP'}
                      </button>
                    ))}
                  </div>
                </div>
                {formData.package_sessions > 0 && formData.package_price > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    ≈ ${Math.round(formData.package_price / formData.package_sessions)} por sesión
                  </p>
                )}
              </div>
            )}

            {formData.pricing_model === 'libre' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
                Este cliente no paga. Útil para becados, familia o pruebas.
              </p>
            )}
          </Card>
        </section>

        {isPT && (
        <section className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            Modalidad
          </h4>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-2">
                  <Wifi size={14} className="text-indigo-400" />
                  <label className="text-sm font-bold text-slate-900 dark:text-white">
                    Alumno online
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Entrena a distancia: desde su portal puede ver la rutina con fotos y cargar peso y repeticiones de cada set.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, is_online: !formData.is_online })
                }
                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${
                  formData.is_online ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    formData.is_online ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </Card>
        </section>
        )}

        {!isPT && (
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
        )}

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
          {isPT ? (
            <Button
              variant="primary"
              fullWidth
              className="py-4 h-auto"
              onClick={() => handleSubmit(false)}
            >
              Crear Cliente
            </Button>
          ) : (
            <>
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
            </>
          )}

          <Button variant="ghost" fullWidth onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
