import React, { useEffect, useState } from 'react';
import { ShiftService } from '../services/ShiftService';
import { Student, ShiftWithStudents } from '../../shared/types';
import { useToast } from '../context/ToastContext';
import {
  CalendarDays,
  Clock,
  Plus,
  X,
  User,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ── Constantes ──────────────────────────────────────────────────────────────

const DAYS = [
  { value: 1, label: 'Lunes', short: 'Lun', letter: 'L' },
  { value: 2, label: 'Martes', short: 'Mar', letter: 'M' },
  { value: 3, label: 'Miércoles', short: 'Mié', letter: 'X' },
  { value: 4, label: 'Jueves', short: 'Jue', letter: 'J' },
  { value: 5, label: 'Viernes', short: 'Vie', letter: 'V' },
  { value: 6, label: 'Sábado', short: 'Sáb', letter: 'S' },
  { value: 0, label: 'Domingo', short: 'Dom', letter: 'D' },
];

const PALETTES = [
  'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
];

const DOT_COLORS = [
  'bg-violet-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-blue-500', 'bg-pink-500', 'bg-orange-500',
];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function formatTime(time: string) {
  return time.slice(0, 5); // "HH:MM"
}

// ── Component ───────────────────────────────────────────────────────────────

interface PTCalendarViewProps {
  gymId: string;
  students: Student[];
}

export default function PTCalendarView({ gymId, students }: PTCalendarViewProps) {
  const toast = useToast();
  const [shifts, setShifts] = useState<ShiftWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mobile: selected day
  const todayDow = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayDow);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDay, setAddModalDay] = useState<number | null>(null);
  const [showClientModal, setShowClientModal] = useState<string | null>(null); // shift id
  const [editingShift, setEditingShift] = useState<ShiftWithStudents | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadShifts = async () => {
    try {
      const data = await ShiftService.getShiftsWithStudents(gymId);
      setShifts(data);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar la agenda');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadShifts(); }, [gymId]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const shiftsByDay: Record<number, ShiftWithStudents[]> = {};
  for (const s of shifts) {
    if (!shiftsByDay[s.day_of_week]) shiftsByDay[s.day_of_week] = [];
    shiftsByDay[s.day_of_week].push(s);
  }

  const todayShifts = shiftsByDay[todayDow] ?? [];
  const totalClients = new Set(shifts.flatMap(s => s.enrolledStudents.map(e => e.id))).size;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDeleteShift = async (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    try {
      await ShiftService.deleteShift(id, gymId);
      setShifts(prev => prev.filter(s => s.id !== id));
      toast.success('Turno eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    }
    setDeletingId(null);
  };

  const handleRemoveClient = async (shiftId: string, studentId: string) => {
    try {
      await ShiftService.removeStudent(shiftId, studentId);
      setShifts(prev => prev.map(s =>
        s.id === shiftId
          ? { ...s, enrolledStudents: s.enrolledStudents.filter(e => e.id !== studentId) }
          : s
      ));
    } catch {
      toast.error('No se pudo quitar el cliente');
    }
  };

  const handleAssignClient = async (shiftId: string, studentId: string) => {
    try {
      await ShiftService.assignStudent(shiftId, studentId);
      await loadShifts();
      setShowClientModal(null);
      toast.success('Cliente asignado');
    } catch {
      toast.error('No se pudo asignar');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8">

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-2xl font-black text-slate-900 dark:text-white">{shifts.length}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Turnos</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-2xl font-black text-violet-500">{todayShifts.length}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Hoy</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalClients}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Clientes</p>
        </div>
      </div>

      {/* ── Mobile day selector ────────────────────────────────────────── */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              const idx = DAYS.findIndex(d => d.value === selectedDay);
              setSelectedDay(DAYS[(idx - 1 + DAYS.length) % DAYS.length].value);
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {DAYS.find(d => d.value === selectedDay)?.label}
            {selectedDay === todayDow && (
              <span className="ml-2 px-2 py-0.5 bg-violet-500/15 text-violet-500 rounded-full text-[10px] font-bold">Hoy</span>
            )}
          </span>
          <button
            onClick={() => {
              const idx = DAYS.findIndex(d => d.value === selectedDay);
              setSelectedDay(DAYS[(idx + 1) % DAYS.length].value);
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day pills */}
        <div className="flex gap-1.5 justify-center mb-4">
          {DAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => setSelectedDay(day.value)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                selectedDay === day.value
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : day.value === todayDow
                  ? 'bg-violet-500/10 text-violet-500 border border-violet-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {day.letter}
            </button>
          ))}
        </div>

        {/* Mobile day content */}
        <DayColumn
          day={DAYS.find(d => d.value === selectedDay)!}
          shifts={shiftsByDay[selectedDay] ?? []}
          isToday={selectedDay === todayDow}
          onAddClick={() => { setAddModalDay(selectedDay); setShowAddModal(true); }}
          onDeleteShift={handleDeleteShift}
          deletingId={deletingId}
          onRemoveClient={handleRemoveClient}
          onAddClient={(shiftId) => setShowClientModal(shiftId)}
          onEditShift={setEditingShift}
        />
      </div>

      {/* ── Desktop weekly grid ────────────────────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-7 gap-2">
        {DAYS.map((day) => (
          <DayColumn
            key={day.value}
            day={day}
            shifts={shiftsByDay[day.value] ?? []}
            isToday={day.value === todayDow}
            onAddClick={() => { setAddModalDay(day.value); setShowAddModal(true); }}
            onDeleteShift={handleDeleteShift}
            deletingId={deletingId}
            onRemoveClient={handleRemoveClient}
            onAddClient={(shiftId) => setShowClientModal(shiftId)}
            onEditShift={setEditingShift}
          />
        ))}
      </div>

      {/* ── Add/Edit Shift Modal ───────────────────────────────────────── */}
      {(showAddModal || editingShift) && (
        <ShiftFormModal
          gymId={gymId}
          defaultDay={addModalDay}
          editing={editingShift}
          students={students}
          onClose={() => { setShowAddModal(false); setAddModalDay(null); setEditingShift(null); }}
          onSaved={() => { setShowAddModal(false); setAddModalDay(null); setEditingShift(null); loadShifts(); }}
        />
      )}

      {/* ── Add Client Modal ───────────────────────────────────────────── */}
      {showClientModal && (
        <AddClientModal
          shiftId={showClientModal}
          shifts={shifts}
          students={students}
          onAssign={handleAssignClient}
          onClose={() => setShowClientModal(null)}
        />
      )}
    </div>
  );
}

// ── DayColumn ───────────────────────────────────────────────────────────────

function DayColumn({ day, shifts, isToday, onAddClick, onDeleteShift, deletingId, onRemoveClient, onAddClient, onEditShift }: {
  day: typeof DAYS[0];
  shifts: ShiftWithStudents[];
  isToday: boolean;
  onAddClick: () => void;
  onDeleteShift: (id: string) => any;
  deletingId: string | null;
  onRemoveClient: (shiftId: string, studentId: string) => any;
  onAddClient: (shiftId: string) => void;
  onEditShift: (shift: ShiftWithStudents | null) => void;
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isToday
        ? 'bg-violet-500/5 dark:bg-violet-500/5 border-violet-500/30'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`}>
      {/* Day header */}
      <div className={`px-3 py-2.5 flex items-center justify-between border-b ${
        isToday
          ? 'border-violet-500/20 bg-violet-500/10'
          : 'border-slate-100 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black uppercase tracking-wider ${
            isToday ? 'text-violet-500' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {day.short}
          </span>
          {isToday && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          )}
        </div>
        <button
          onClick={onAddClick}
          className={`p-1 rounded-lg transition-colors ${
            isToday
              ? 'text-violet-500 hover:bg-violet-500/20'
              : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500'
          }`}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Appointments */}
      <div className="p-2 space-y-2 min-h-[80px]">
        {shifts.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-[10px] text-slate-300 dark:text-slate-700 font-medium">Sin turnos</p>
          </div>
        ) : (
          shifts.map((shift, idx) => (
            <div
              key={shift.id}
              className={`p-2.5 rounded-xl border transition-all group ${PALETTES[idx % PALETTES.length]}`}
            >
              {/* Time + name */}
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-black truncate leading-tight">{shift.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={9} className="opacity-60" />
                    <span className="text-[10px] font-medium opacity-70">
                      {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onEditShift(shift)}
                    className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-current"
                    title="Editar"
                  >
                    <CalendarDays size={10} />
                  </button>
                  <button
                    onClick={() => onDeleteShift(shift.id)}
                    className={`p-1 rounded-md transition-colors ${
                      deletingId === shift.id
                        ? 'bg-rose-500 text-white'
                        : 'hover:bg-black/10 dark:hover:bg-white/10 text-current'
                    }`}
                    title={deletingId === shift.id ? 'Confirmar' : 'Eliminar'}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {/* Enrolled clients */}
              {shift.enrolledStudents.length > 0 ? (
                <div className="space-y-1">
                  {shift.enrolledStudents.map((client) => (
                    <div key={client.id} className="flex items-center gap-1.5 group/client">
                      <div className={`w-5 h-5 rounded-full ${DOT_COLORS[idx % DOT_COLORS.length]} flex items-center justify-center shrink-0`}>
                        <span className="text-[7px] font-bold text-white">{getInitials(client.displayName)}</span>
                      </div>
                      <span className="text-[10px] font-medium truncate flex-1">{client.displayName}</span>
                      <button
                        onClick={() => onRemoveClient(shift.id, client.id)}
                        className="opacity-0 group-hover/client:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
                        title="Quitar"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => onAddClient(shift.id)}
                  className="w-full text-[10px] font-medium opacity-50 hover:opacity-80 transition-opacity py-1"
                >
                  + Asignar cliente
                </button>
              )}

              {/* Add client to existing shift */}
              {shift.enrolledStudents.length > 0 && shift.enrolledStudents.length < shift.capacity && (
                <button
                  onClick={() => onAddClient(shift.id)}
                  className="w-full mt-1 text-[9px] font-bold opacity-40 hover:opacity-80 transition-opacity"
                >
                  + Agregar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── ShiftFormModal ───────────────────────────────────────────────────────────

function ShiftFormModal({ gymId, defaultDay, editing, students, onClose, onSaved }: {
  gymId: string;
  defaultDay: number | null;
  editing: ShiftWithStudents | null;
  students: Student[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [isGroup, setIsGroup] = useState(editing ? editing.capacity > 1 : false);
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    day_of_week: editing?.day_of_week ?? defaultDay ?? 1,
    start_time: editing?.start_time?.slice(0, 5) ?? '09:00',
    end_time: editing?.end_time?.slice(0, 5) ?? '10:00',
    capacity: editing?.capacity ?? 1,
    studentId: editing?.enrolledStudents?.[0]?.id ?? '',
  });

  const getStudentName = (id: string) => {
    const s = students.find(st => st.id === id);
    if (!s) return '';
    return `${(s as any).nombre ?? ''} ${(s as any).apellido ?? ''}`.trim();
  };

  // Auto-generate name when student is selected (only for new shifts)
  const selectStudent = (id: string) => {
    const name = getStudentName(id);
    setForm(f => ({
      ...f,
      studentId: id,
      name: !editing && name ? `Sesión con ${name}` : f.name,
    }));
    setStudentSearch('');
  };

  const filteredStudents = students.filter(s => {
    if (!studentSearch.trim()) return true;
    const name = `${(s as any).nombre ?? ''} ${(s as any).apellido ?? ''}`.toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = form.name.trim() || (form.studentId ? `Sesión con ${getStudentName(form.studentId)}` : '');
    if (!finalName) {
      toast.error('Seleccioná un alumno o escribí un nombre');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await ShiftService.updateShift(editing.id, gymId, {
          name: finalName,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          capacity: isGroup ? form.capacity : 1,
        });
        toast.success('Turno actualizado');
      } else {
        const newShift = await ShiftService.createShift({
          gym_id: gymId,
          name: finalName,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          capacity: isGroup ? form.capacity : 1,
        });
        // Auto-assign selected student
        if (form.studentId) {
          await ShiftService.assignStudent(newShift.id, form.studentId);
        }
        toast.success('Turno creado');
      }
      onSaved();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const selectedStudentName = form.studentId ? getStudentName(form.studentId) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full md:max-w-sm md:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {editing ? 'Editar turno' : 'Nuevo turno'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Student selector (only for new shifts) */}
          {!editing && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alumno</label>
              {form.studentId ? (
                <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-violet-500">{getInitials(selectedStudentName)}</span>
                  </div>
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400 flex-1 truncate">{selectedStudentName}</span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, studentId: '', name: '' }))}
                    className="p-1 rounded-lg text-violet-400 hover:bg-violet-500/20"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar alumno..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      autoFocus
                    />
                  </div>
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">Sin resultados</p>
                    ) : (
                      filteredStudents.map(s => {
                        const name = `${(s as any).nombre ?? ''} ${(s as any).apellido ?? ''}`.trim() || 'Sin nombre';
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectStudent(s.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-violet-500">{getInitials(name)}</span>
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Name (auto-filled from student, but editable) */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre del turno</label>
            <input
              type="text"
              placeholder={form.studentId ? `Sesión con ${selectedStudentName}` : 'Ej: Sesión con Juan'}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
            />
          </div>

          {/* Day */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Día</label>
            <div className="flex gap-1.5 mt-1">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, day_of_week: d.value }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    form.day_of_week === d.value
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {d.letter}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inicio</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fin</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* Group toggle + Capacity */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={e => {
                  setIsGroup(e.target.checked);
                  if (!e.target.checked) setForm(f => ({ ...f, capacity: 1 }));
                }}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-violet-500 focus:ring-violet-500/30"
              />
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sesión grupal</span>
            </label>
            {isGroup && (
              <input
                type="number"
                min={2}
                max={50}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: Math.max(2, Number(e.target.value)) }))}
                placeholder="Capacidad"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={saving || (!form.name.trim() && !form.studentId)}
            className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 active:scale-[0.97]"
          >
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear turno'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── AddClientModal ──────────────────────────────────────────────────────────

function AddClientModal({ shiftId, shifts, students, onAssign, onClose }: {
  shiftId: string;
  shifts: ShiftWithStudents[];
  students: Student[];
  onAssign: (shiftId: string, studentId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  const shift = shifts.find(s => s.id === shiftId);
  const enrolledIds = new Set(shift?.enrolledStudents.map(e => e.id) ?? []);

  const available = students.filter(s => {
    if (enrolledIds.has(s.id)) return false;
    if (!search.trim()) return true;
    const name = `${(s as any).nombre ?? ''} ${(s as any).apellido ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleAssign = async (studentId: string) => {
    setAssigning(studentId);
    await onAssign(shiftId, studentId);
    setAssigning(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full md:max-w-sm md:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Asignar cliente</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <User size={24} className="text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {students.length === 0 ? 'No tenés clientes registrados' : 'No se encontraron clientes'}
              </p>
            </div>
          ) : (
            available.map((student) => {
              const name = `${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim() || 'Sin nombre';
              return (
                <button
                  key={student.id}
                  onClick={() => handleAssign(student.id)}
                  disabled={assigning === student.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-violet-500">{getInitials(name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{(student as any).telefono ?? ''}</p>
                  </div>
                  <span className="text-xs font-bold text-violet-500 shrink-0">
                    {assigning === student.id ? '...' : 'Agregar'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
