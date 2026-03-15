import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Users,
  Clock,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from '../components/UI';
import { ShiftService } from '../services/ShiftService';
import { Shift, ShiftWithStudents } from '../../shared/types';
import { Student } from '../../shared/types';

interface ShiftsViewProps {
  gymId: string;
  students: Student[];
}

const DAYS = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];

// ─── Shift Form Modal ─────────────────────────────────────────────────────────

interface ShiftFormModalProps {
  initial?: Shift | null;
  gymId: string;
  onSave: () => void;
  onClose: () => void;
}

const ShiftFormModal: React.FC<ShiftFormModalProps> = ({ initial, gymId, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    day_of_week: initial?.day_of_week ?? 1,
    start_time: initial?.start_time ?? '08:00',
    end_time: initial?.end_time ?? '09:00',
    capacity: initial?.capacity ?? 20,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (form.start_time >= form.end_time) { setError('La hora de inicio debe ser anterior a la de fin.'); return; }
    setSaving(true);
    try {
      if (initial?.id) {
        await ShiftService.updateShift(initial.id, gymId, form);
      } else {
        await ShiftService.createShift({ ...form, gym_id: gymId });
      }
      onSave();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full md:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {initial ? 'Editar Turno' : 'Nuevo Turno'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Nombre del turno</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Ej: Boxeo Beginners"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Día de la semana</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.day_of_week}
              onChange={e => setForm(f => ({ ...f, day_of_week: Number(e.target.value) }))}
            >
              {DAYS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Hora inicio</label>
              <input
                type="time"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Hora fin</label>
              <input
                type="time"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Capacidad máxima</label>
            <input
              type="number"
              min={1}
              max={200}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, Number(e.target.value)) }))}
            />
          </div>

          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Turno'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Add Student Modal ────────────────────────────────────────────────────────

interface AddStudentModalProps {
  shift: ShiftWithStudents;
  allStudents: Student[];
  onAssign: (studentId: string) => Promise<void>;
  onClose: () => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ shift, allStudents, onAssign, onClose }) => {
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  const enrolledIds = new Set(shift.enrolledStudents.map(s => s.id));

  const available = useMemo(() => {
    const q = search.toLowerCase();
    return allStudents.filter((s: any) => {
      const name = `${s.nombre ?? s.name ?? ''} ${s.apellido ?? s.lastName ?? ''}`.toLowerCase();
      return !enrolledIds.has(s.id) && name.includes(q);
    });
  }, [allStudents, search, enrolledIds]);

  const handleAssign = async (studentId: string) => {
    setAssigning(studentId);
    try {
      await onAssign(studentId);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full md:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
      >
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Agregar alumno</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{shift.name}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Buscar alumno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {available.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
              {search ? 'Sin resultados' : 'Todos los alumnos ya están asignados'}
            </p>
          ) : (
            available.map((student: any) => {
              const name = `${student.nombre ?? student.name ?? ''} ${student.apellido ?? student.lastName ?? ''}`.trim();
              return (
                <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {(name[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{name || 'Sin nombre'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{student.planName ?? student.plan_nombre ?? 'Sin plan'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(student.id)}
                    disabled={assigning === student.id}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {assigning === student.id ? '...' : 'Agregar'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Shift Card (Manage tab) ──────────────────────────────────────────────────

interface ShiftCardManageProps {
  shift: ShiftWithStudents;
  allStudents: Student[];
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const ShiftCardManage: React.FC<ShiftCardManageProps> = ({ shift, allStudents, onEdit, onDelete, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const dayLabel = DAYS.find(d => d.value === shift.day_of_week)?.label ?? '';
  const enrolled = shift.enrolledStudents.length;
  const isFull = enrolled >= shift.capacity;

  const handleRemove = async (studentId: string) => {
    setRemoving(studentId);
    try {
      await ShiftService.removeStudent(shift.id, studentId);
      onRefresh();
    } finally {
      setRemoving(null);
    }
  };

  const handleAssign = async (studentId: string) => {
    await ShiftService.assignStudent(shift.id, studentId);
    onRefresh();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-900 dark:text-white truncate">{shift.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{dayLabel} · {shift.start_time} – {shift.end_time}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isFull
                      ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Users size={11} />
                    {enrolled}/{shift.capacity}
                  </span>
                  {isFull && <span className="text-xs font-bold text-rose-500">LLENO</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(shift)}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDelete(shift.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setExpanded(v => !v)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-slate-50 dark:border-slate-700 pt-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Alumnos inscritos</p>
                  {!isFull && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      <Plus size={13} /> Agregar
                    </button>
                  )}
                </div>

                {shift.enrolledStudents.length === 0 ? (
                  <div className="text-center py-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-400 dark:text-slate-500">Sin alumnos asignados</p>
                    {!isFull && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-2 text-sm font-bold text-indigo-600 hover:underline"
                      >
                        Agregar el primero
                      </button>
                    )}
                  </div>
                ) : (
                  shift.enrolledStudents.map(student => {
                    const isActive = student.status === 'activo' || student.status === 'active';
                    const phone = student.phone?.replace(/\D/g, '') ?? '';
                    return (
                      <div key={student.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">
                            {(student.displayName[0] ?? '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{student.displayName}</p>
                            <div className="flex items-center gap-1">
                              {isActive ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                                  <CheckCircle size={9} /> Al día
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
                                  <AlertCircle size={9} /> Vencido
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {phone && (
                            <a
                              href={`https://wa.me/54${phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            >
                              <MessageSquare size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => handleRemove(student.id)}
                            disabled={removing === student.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <AnimatePresence>
        {showAddModal && (
          <AddStudentModal
            shift={shift}
            allStudents={allStudents}
            onAssign={handleAssign}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Weekly Calendar ──────────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  shifts: ShiftWithStudents[];
  onNavigate: (shiftId: string) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ shifts, onNavigate }) => {
  const todayDow = new Date().getDay(); // 0=Sun, 1=Mon...

  const shiftsByDay: Record<number, ShiftWithStudents[]> = {};
  for (const day of DAYS) shiftsByDay[day.value] = [];
  for (const shift of shifts) {
    if (shiftsByDay[shift.day_of_week] !== undefined) {
      shiftsByDay[shift.day_of_week].push(shift);
    }
  }

  const activeDays = DAYS.filter(d => shiftsByDay[d.value].length > 0);

  if (activeDays.length === 0) {
    return (
      <div className="text-center py-16 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="font-bold text-slate-500 dark:text-slate-400">No hay turnos creados aún</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Creá turnos desde la pestaña Gestión</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {DAYS.map(day => {
        const dayShifts = shiftsByDay[day.value];
        if (dayShifts.length === 0) return null;
        const isToday = day.value === todayDow;

        return (
          <div key={day.value}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className={`font-black text-sm uppercase tracking-widest ${
                isToday ? 'text-indigo-600' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {day.label}
              </h3>
              {isToday && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Hoy
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayShifts.map(shift => {
                const enrolled = shift.enrolledStudents.length;
                const pct = Math.round((enrolled / shift.capacity) * 100);
                const isFull = enrolled >= shift.capacity;

                return (
                  <motion.div
                    key={shift.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`rounded-2xl border p-4 cursor-pointer transition-shadow hover:shadow-md ${
                      isToday
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                    }`}
                    onClick={() => onNavigate(shift.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white leading-tight">{shift.name}</p>
                        <div className="flex items-center gap-1 mt-1 text-slate-500 dark:text-slate-400">
                          <Clock size={12} />
                          <span className="text-xs font-medium">{shift.start_time} – {shift.end_time}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-black px-2 py-1 rounded-xl ${
                        isFull
                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                      }`}>
                        {enrolled}/{shift.capacity}
                      </span>
                    </div>

                    {/* Capacity bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* Student avatars */}
                    {shift.enrolledStudents.length > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {shift.enrolledStudents.slice(0, 4).map((s, i) => (
                            <div
                              key={s.id}
                              title={s.displayName}
                              className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black text-indigo-700 dark:text-indigo-300"
                              style={{ zIndex: 4 - i }}
                            >
                              {s.displayName[0]?.toUpperCase()}
                            </div>
                          ))}
                        </div>
                        {shift.enrolledStudents.length > 4 && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-1">
                            +{shift.enrolledStudents.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export const ShiftsView: React.FC<ShiftsViewProps> = ({ gymId, students }) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'manage'>('calendar');
  const [shifts, setShifts] = useState<ShiftWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [highlightShiftId, setHighlightShiftId] = useState<string | null>(null);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const data = await ShiftService.getShiftsWithStudents(gymId);
      setShifts(data);
    } catch (err) {
      console.error('Error loading shifts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [gymId]);

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este turno? Se perderán todas las asignaciones.')) return;
    try {
      await ShiftService.deleteShift(id, gymId);
      await loadShifts();
    } catch (err) {
      console.error('Error deleting shift:', err);
    }
  };

  const handleSaved = async () => {
    setShowFormModal(false);
    setEditingShift(null);
    await loadShifts();
  };

  const handleCalendarNavigate = (shiftId: string) => {
    setActiveTab('manage');
    setHighlightShiftId(shiftId);
    setTimeout(() => setHighlightShiftId(null), 2000);
  };

  const totalStudentsToday = useMemo(() => {
    const todayDow = new Date().getDay();
    return shifts
      .filter(s => s.day_of_week === todayDow)
      .reduce((sum, s) => sum + s.enrolledStudents.length, 0);
  }, [shifts]);

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [shifts]);

  return (
    <div className="space-y-6 pb-10">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-slate-900 dark:text-white">{shifts.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Turnos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-indigo-600">{totalStudentsToday}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Hoy</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">
            {shifts.reduce((s, sh) => s + sh.enrolledStudents.length, 0)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Inscriptos</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        {([['calendar', 'Calendario'], ['manage', 'Gestión']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'calendar' ? (
              <WeeklyCalendar shifts={sortedShifts} onNavigate={handleCalendarNavigate} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {sortedShifts.length} turno{sortedShifts.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { setEditingShift(null); setShowFormModal(true); }}
                  >
                    <Plus size={16} /> Nuevo turno
                  </Button>
                </div>

                {sortedShifts.length === 0 ? (
                  <div className="text-center py-16 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-bold text-slate-500 dark:text-slate-400">Sin turnos creados</p>
                    <button
                      onClick={() => { setEditingShift(null); setShowFormModal(true); }}
                      className="mt-3 text-sm font-bold text-indigo-600 hover:underline"
                    >
                      Crear primer turno
                    </button>
                  </div>
                ) : (
                  sortedShifts.map(shift => (
                    <motion.div
                      key={shift.id}
                      animate={highlightShiftId === shift.id ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <ShiftCardManage
                        shift={shift}
                        allStudents={students}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRefresh={loadShifts}
                      />
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* FAB for mobile */}
      {activeTab === 'manage' && (
        <button
          onClick={() => { setEditingShift(null); setShowFormModal(true); }}
          className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 flex items-center justify-center z-20 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showFormModal && (
          <ShiftFormModal
            key="shift-form"
            initial={editingShift}
            gymId={gymId}
            onSave={handleSaved}
            onClose={() => { setShowFormModal(false); setEditingShift(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShiftsView;
