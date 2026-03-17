import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  History,
  Edit2,
  MessageSquare,
  Trash2,
  Smartphone,
  Bell,
  ShieldCheck,
  DollarSign as DollarIcon,
  Info,
  Save,
  X,
  Dumbbell,
  PlayCircle,
  HeartPulse,
} from 'lucide-react';
import { Card, StatusBadge, Button, BillingBadge, Input } from '../components/UI';
import { Student, Payment, Plan } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { WorkoutPlanService } from '../services/WorkoutPlanService';
import { ExerciseVideoModal } from '../components/ExerciseVideoModal';

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
  onUpdateStudent: (id: string, updates: any) => void;
  onDeleteStudent: (id: string) => void;
}

const gymId = '11111111-1111-1111-1111-111111111111';

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  student,
  payments,
  plans,
  onBack,
  onRegisterPayment,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [studentWorkoutExercises, setStudentWorkoutExercises] = useState<any[]>([]);
  const [selectedWorkoutPlanId, setSelectedWorkoutPlanId] = useState('');
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [isAssigningWorkout, setIsAssigningWorkout] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    videoUrl: string;
  }>({ isOpen: false, exerciseName: '', videoUrl: '' });

  const normalizedPlans = useMemo(() => {
    const safePlans = Array.isArray(plans) ? plans : [];
    return safePlans.map((plan: any) => ({
      ...plan,
      name: plan.name ?? plan.nombre ?? '',
      price: Number(plan.price ?? plan.precio ?? 0),
      durationDays: Number(plan.durationDays ?? plan.duracion_dias ?? 30),
      active: plan.active ?? plan.activo ?? true,
    }));
  }, [plans]);

  const normalizedStudentName =
    (student as any).name ??
    `${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim();

  const [editData, setEditData] = useState({
    nombre: (student as any).nombre ?? '',
    apellido: (student as any).apellido ?? '',
    telefono: (student as any).telefono ?? '',
    plan_id: (student as any).plan_id ?? (student as any).planId ?? '',
    status:
      (student as any).status === 'active'
        ? 'activo'
        : (student as any).status === 'inactive'
        ? 'baja'
        : (student as any).status ?? 'activo',
    observaciones: (student as any).observaciones ?? (student as any).observations ?? '',
    cobra_cuota: (student as any).cobra_cuota ?? true,
    recordatorio_automatico: (student as any).recordatorio_automatico ?? true,
    whatsapp_opt_in: (student as any).whatsapp_opt_in ?? false,
    tipo_beca:
      (student as any).tipo_beca === 'none'
        ? 'ninguna'
        : (student as any).tipo_beca === 'partial'
        ? 'parcial'
        : (student as any).tipo_beca === 'complete'
        ? 'completa'
        : (student as any).tipo_beca ?? 'ninguna',
    precio_personalizado: (student as any).precio_personalizado ?? '',
    observaciones_cobranza: (student as any).observaciones_cobranza ?? '',
    emergency_contact_name: (student as any).emergency_contact_name ?? '',
    emergency_contact_phone: (student as any).emergency_contact_phone ?? '',
  });

  const loadWorkoutData = async () => {
    try {
      setIsLoadingWorkout(true);

      const [plansData, exercisesData] = await Promise.all([
        WorkoutPlanService.getPlans(gymId),
        WorkoutPlanService.getStudentWorkout(student.id),
      ]);

      setWorkoutPlans(Array.isArray(plansData) ? plansData : []);
      setStudentWorkoutExercises(Array.isArray(exercisesData) ? exercisesData : []);
    } catch (error) {
      console.error('Error loading workout data:', error);
      setWorkoutPlans([]);
      setStudentWorkoutExercises([]);
    } finally {
      setIsLoadingWorkout(false);
    }
  };

  useEffect(() => {
    loadWorkoutData();
  }, [student.id]);

  const handleAssignWorkout = async () => {
    if (!selectedWorkoutPlanId) return;

    try {
      setIsAssigningWorkout(true);
      await WorkoutPlanService.assignPlanToStudent(gymId, student.id, selectedWorkoutPlanId);
      await loadWorkoutData();
      alert('Rutina asignada correctamente');
    } catch (error) {
      console.error('Error assigning workout:', error);
      alert('No se pudo asignar la rutina');
    } finally {
      setIsAssigningWorkout(false);
    }
  };

  const handleConfirmPayment = (paymentData: any) => {
    onRegisterPayment({
      studentId: student.id,
      ...paymentData,
    });
    setIsModalOpen(false);
  };

  const handleSave = () => {
    if (!editData.nombre.trim() || !editData.apellido.trim()) {
      alert('El nombre y apellido son obligatorios');
      return;
    }
    const precioNum = editData.precio_personalizado === '' ? null : Number(editData.precio_personalizado);
    if (precioNum !== null && precioNum < 0) {
      alert('El precio no puede ser negativo');
      return;
    }
    onUpdateStudent(student.id, {
      ...editData,
      nombre: editData.nombre.trim(),
      apellido: editData.apellido.trim(),
      precio_personalizado: precioNum,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    const confirmed = window.confirm('¿Seguro que querés eliminar este alumno?');
    if (!confirmed) return;
    onDeleteStudent(student.id);
  };

  if (isEditing) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}>
              <X size={18} />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleSave}>
              <Save size={18} />
            </Button>
          </div>
        </div>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Editar Alumno</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Nombre"
              value={editData.nombre}
              onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
            />
            <Input
              placeholder="Apellido"
              value={editData.apellido}
              onChange={(e) => setEditData({ ...editData, apellido: e.target.value })}
            />
          </div>

          <Input
            placeholder="Teléfono"
            value={editData.telefono}
            onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
          />

          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
            value={editData.plan_id}
            onChange={(e) => setEditData({ ...editData, plan_id: e.target.value })}
          >
            {normalizedPlans.map((plan: any) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - ${plan.price}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4">
            <select
              className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            >
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="baja">Baja</option>
            </select>

            <Input
              type="number"
              placeholder="Precio personalizado"
              value={editData.precio_personalizado}
              onChange={(e) =>
                setEditData({ ...editData, precio_personalizado: e.target.value })
              }
            />
          </div>

          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            rows={3}
            placeholder="Observaciones"
            value={editData.observaciones}
            onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
          />

          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            rows={3}
            placeholder="Observaciones de cobranza"
            value={editData.observaciones_cobranza}
            onChange={(e) =>
              setEditData({ ...editData, observaciones_cobranza: e.target.value })
            }
          />

          <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse size={14} className="text-rose-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Contacto de Emergencia
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nombre del contacto"
                value={editData.emergency_contact_name}
                onChange={(e) => setEditData({ ...editData, emergency_contact_name: e.target.value })}
              />
              <Input
                placeholder="Teléfono"
                value={editData.emergency_contact_phone}
                onChange={(e) => setEditData({ ...editData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium dark:text-white">Cobra cuota</span>
              <input
                type="checkbox"
                checked={editData.cobra_cuota}
                onChange={(e) =>
                  setEditData({ ...editData, cobra_cuota: e.target.checked })
                }
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium dark:text-white">Recordatorio automático</span>
              <input
                type="checkbox"
                checked={editData.recordatorio_automatico}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    recordatorio_automatico: e.target.checked,
                  })
                }
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium dark:text-white">Opt-in WhatsApp</span>
              <input
                type="checkbox"
                checked={editData.whatsapp_opt_in}
                onChange={(e) =>
                  setEditData({ ...editData, whatsapp_opt_in: e.target.checked })
                }
              />
            </label>
          </div>

          <div className="flex gap-2">
            {(['ninguna', 'parcial', 'completa'] as const).map((tipo) => (
              <Button
                key={tipo}
                variant={editData.tipo_beca === tipo ? 'primary' : 'outline'}
                fullWidth
                onClick={() => setEditData({ ...editData, tipo_beca: tipo })}
              >
                {tipo}
              </Button>
            ))}
          </div>

          <Button variant="secondary" fullWidth onClick={handleSave}>
            Guardar cambios
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
            <Edit2 size={18} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-rose-500 border-rose-100 hover:bg-rose-50"
            onClick={handleDelete}
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      <div className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-xl shadow-slate-200 dark:shadow-slate-900 italic">
          {normalizedStudentName?.charAt(0) || '?'}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{normalizedStudentName}</h2>
        <div className="mt-2">
          <StatusBadge status={(student as any).status} />
        </div>
      </div>

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

      <div className="grid gap-4">
        <Card className="p-4 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-700 pb-2">Información del Plan</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                <Calendar size={18} />
              </div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Plan Actual</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {(student as any).planName ?? (student as any).plan_nombre ?? 'Sin plan'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                <Calendar size={18} />
              </div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Vencimiento</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDate((student as any).nextDueDate ?? (student as any).next_due_date)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CreditCard size={18} />
              </div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Último Pago</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {(student as any).lastPaymentDate || (student as any).last_payment_date
                ? formatDate((student as any).lastPaymentDate ?? (student as any).last_payment_date)
                : '-'}
            </span>
          </div>
        </Card>

        {((student as any).emergency_contact_name || (student as any).emergency_contact_phone) && (
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-700 pb-2 flex items-center gap-2">
              <HeartPulse size={16} className="text-rose-400" />
              Contacto de Emergencia
            </h3>
            {(student as any).emergency_contact_name && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                    <HeartPulse size={16} className="text-rose-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Nombre</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {(student as any).emergency_contact_name}
                </span>
              </div>
            )}
            {(student as any).emergency_contact_phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                    <Phone size={16} className="text-rose-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Teléfono</span>
                </div>
                <a
                  href={`tel:${(student as any).emergency_contact_phone}`}
                  className="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  {(student as any).emergency_contact_phone}
                </a>
              </div>
            )}
          </Card>
        )}

        <Card className="p-4 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-700 pb-2">Rutina</h3>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
              <Dumbbell size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Rutina actual</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isLoadingWorkout
                  ? 'Cargando rutina...'
                  : studentWorkoutExercises.length > 0
                  ? `${studentWorkoutExercises.length} ejercicios cargados`
                  : 'Sin rutina asignada'}
              </p>
            </div>
          </div>

          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
            value={selectedWorkoutPlanId}
            onChange={(e) => setSelectedWorkoutPlanId(e.target.value)}
          >
            <option value="">Seleccionar rutina</option>
            {workoutPlans.map((plan: any) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            fullWidth
            onClick={handleAssignWorkout}
            disabled={!selectedWorkoutPlanId || isAssigningWorkout}
          >
            {isAssigningWorkout ? 'Asignando...' : 'Asignar / Cambiar rutina'}
          </Button>

          <div className="space-y-3">
            {studentWorkoutExercises.length > 0 ? (
              studentWorkoutExercises.map((exercise: any, index: number) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-700 last:border-0 gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {index + 1}. {exercise.exercise_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {exercise.sets || '-'} series · {exercise.reps || '-'} reps · {exercise.weight || '-'}
                    </p>
                  </div>

                  {exercise.video_url ? (
                    <button
                      type="button"
                      onClick={() =>
                        setVideoModal({
                          isOpen: true,
                          exerciseName: exercise.exercise_name,
                          videoUrl: exercise.video_url,
                        })
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-xs font-bold shrink-0"
                    >
                      <PlayCircle size={15} />
                      Ver video
                    </button>
                  ) : (
                    <Dumbbell size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                </div>
              ))
            ) : (
              !isLoadingWorkout && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                  Este alumno todavía no tiene rutina asignada.
                </p>
              )
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-700 pb-2">Configuración de Cobranza</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(student as any).cobra_cuota ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                <DollarIcon size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Cobra Cuota</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {(student as any).cobra_cuota ? 'Habilitado' : 'Exento'}
                </p>
              </div>
            </div>
            <BillingBadge
              cobra_cuota={(student as any).cobra_cuota}
              recordatorio_automatico={(student as any).recordatorio_automatico}
              tipo_beca={(student as any).tipo_beca}
              whatsapp_opt_in={(student as any).whatsapp_opt_in}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(student as any).recordatorio_automatico ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                <Bell size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Recordatorios</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {(student as any).recordatorio_automatico ? 'Automáticos' : 'Manuales'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(student as any).whatsapp_opt_in ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Opt-in WhatsApp</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {(student as any).whatsapp_opt_in
                    ? `Aceptado ${(student as any).whatsapp_opt_in_at ? `el ${formatDate((student as any).whatsapp_opt_in_at)}` : ''}`
                    : 'No aceptado'}
                </p>
              </div>
            </div>
          </div>

          {(student as any).tipo_beca && (student as any).tipo_beca !== 'ninguna' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Beca</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black">
                    {(student as any).tipo_beca}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(student as any).observaciones_cobranza && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl flex gap-3">
              <Info size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {(student as any).observaciones_cobranza}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Historial de Pagos</h3>
            <History size={18} className="text-slate-400 dark:text-slate-500" />
          </div>

          <div className="space-y-3">
            {payments.length > 0 ? (
              payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500">
                      {(payment.method ?? payment.metodo_pago) === 'mercadopago' ||
                      (payment.method ?? payment.metodo_pago) === 'mercado_pago' ? (
                        <Smartphone size={14} />
                      ) : (
                        <CreditCard size={14} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatDate((payment.date ?? payment.fecha_pago) as string)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                        {String(payment.method ?? payment.metodo_pago ?? '').replaceAll('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-emerald-600">
                    ${Number(payment.amount ?? payment.monto ?? 0)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No hay pagos registrados.</p>
            )}
          </div>
        </Card>
      </div>

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

      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, exerciseName: '', videoUrl: '' })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
};
