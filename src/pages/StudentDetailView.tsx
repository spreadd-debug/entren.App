import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Phone,
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
  ChevronDown,
  ChevronLeft,
  ClipboardList,
} from 'lucide-react';
import { Card, StatusBadge, Button, BillingBadge, Input } from '../components/UI';
import { Student, Payment, Plan } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { WorkoutPlanService } from '../services/WorkoutPlanService';
import { ExerciseVideoModal } from '../components/ExerciseVideoModal';
import { CheckInService } from '../services/CheckInService';

interface StudentDetailViewProps {
  student: Student;
  payments: Payment[];
  plans: Plan[];
  gymId: string;
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

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  student,
  payments,
  plans,
  gymId,
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

  const [checkIns, setCheckIns] = useState<Array<{ id: string; checked_in_at: string }>>([]);
  const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(true);
  const [showAttendance, setShowAttendance] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  // Set of attended date strings "YYYY-MM-DD"
  const attendedDates = useMemo(() => {
    const s = new Set<string>();
    checkIns.forEach(ci => {
      s.add(new Date(ci.checked_in_at).toLocaleDateString('sv-SE')); // "YYYY-MM-DD"
    });
    return s;
  }, [checkIns]);

  // Check-ins indexed by date for quick lookup
  const checkInsByDate = useMemo(() => {
    const map = new Map<string, Array<{ id: string; checked_in_at: string }>>();
    checkIns.forEach(ci => {
      const key = new Date(ci.checked_in_at).toLocaleDateString('sv-SE');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ci);
    });
    return map;
  }, [checkIns]);

  // Calendar grid helpers
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { year, month, firstWeekday, daysInMonth };
  }, [calendarMonth]);

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

  useEffect(() => {
    setIsLoadingCheckIns(true);
    CheckInService.getStudentCheckIns(gymId, student.id)
      .then(setCheckIns)
      .catch(() => setCheckIns([]))
      .finally(() => setIsLoadingCheckIns(false));
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
        <a
          href={`tel:${(student as any).telefono ?? ''}`}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Phone size={20} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Llamar</span>
        </a>
        <a
          href={`https://wa.me/${((student as any).telefono ?? '').replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <MessageSquare size={20} className="text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">WhatsApp</span>
        </a>
        <Button
          variant={showAttendance ? 'secondary' : 'outline'}
          className="flex-col gap-2 py-4 h-auto"
          onClick={() => { setShowAttendance(v => !v); setSelectedDay(null); }}
        >
          <ClipboardList size={20} className={showAttendance ? 'text-white' : 'text-violet-500'} />
          <span className="text-xs font-bold">Asistencia</span>
        </Button>
      </div>

      {/* ── Calendar de asistencia ────────────────────────────── */}
      {showAttendance && (
        <Card className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
                setSelectedDay(null);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-slate-900 dark:text-white capitalize">
                {calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </p>
              {!isLoadingCheckIns && (
                <p className="text-[10px] text-violet-500 font-bold">
                  {checkIns.length} visita{checkIns.length !== 1 ? 's' : ''} en total
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                if (next <= new Date()) {
                  setCalendarMonth(next);
                  setSelectedDay(null);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors disabled:opacity-30"
            >
              <ChevronDown size={16} className="rotate-[-90deg]" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['L','M','X','J','V','S','D'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          {isLoadingCheckIns ? (
            <div className="flex items-center justify-center py-6">
              <span className="w-5 h-5 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-y-1">
              {/* Empty cells before first day */}
              {Array.from({ length: calendarGrid.firstWeekday }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {/* Day cells */}
              {Array.from({ length: calendarGrid.daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${calendarGrid.year}-${String(calendarGrid.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const attended = attendedDates.has(dateStr);
                const isSelected = selectedDay === dateStr;
                const isToday = dateStr === new Date().toLocaleDateString('sv-SE');
                const cis = checkInsByDate.get(dateStr) ?? [];

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!attended}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`
                      relative flex flex-col items-center justify-center aspect-square rounded-xl text-xs font-bold transition-all
                      ${isSelected
                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40'
                        : attended
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 cursor-pointer'
                        : isToday
                        ? 'text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-600'
                        : 'text-slate-400 dark:text-slate-600 cursor-default'
                      }
                    `}
                  >
                    {day}
                    {attended && cis.length > 1 && (
                      <span className={`text-[8px] font-black leading-none ${isSelected ? 'text-violet-200' : 'text-violet-400'}`}>
                        ×{cis.length}
                      </span>
                    )}
                    {attended && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected day exercises */}
          {selectedDay && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell size={13} className="text-violet-400" />
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}
                  {(checkInsByDate.get(selectedDay) ?? []).map(ci =>
                    new Date(ci.checked_in_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                  ).join(', ')}
                </p>
              </div>
              {studentWorkoutExercises.length > 0 ? (
                <div className="space-y-2">
                  {studentWorkoutExercises.map((ex: any, i: number) => (
                    <div key={ex.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 w-4 shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ex.exercise_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {ex.sets || '-'} series · {ex.reps || '-'} reps{ex.weight ? ` · ${ex.weight}` : ''}
                        </p>
                      </div>
                      {ex.video_url && (
                        <button
                          type="button"
                          onClick={() => setVideoModal({ isOpen: true, exerciseName: ex.exercise_name, videoUrl: ex.video_url })}
                          className="shrink-0 p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <PlayCircle size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : isLoadingWorkout ? (
                <p className="text-xs text-slate-400 text-center py-2">Cargando rutina...</p>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Sin rutina asignada</p>
              )}
            </div>
          )}
        </Card>
      )}

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
