import { useState, useEffect } from 'react';
import { Dumbbell, Loader2, Check, ArrowLeft, Calendar } from 'lucide-react';
import { RoutineBuilderService } from '../../services/RoutineBuilderService';
import { useToast } from '../../context/ToastContext';
import type { RoutineV2, RoutineDay } from '../../../shared/types';

const WEEKDAYS = [
  { key: 'lunes', label: 'Lun', value: 1 },
  { key: 'martes', label: 'Mar', value: 2 },
  { key: 'miercoles', label: 'Mie', value: 3 },
  { key: 'jueves', label: 'Jue', value: 4 },
  { key: 'viernes', label: 'Vie', value: 5 },
  { key: 'sabado', label: 'Sab', value: 6 },
  { key: 'domingo', label: 'Dom', value: 0 },
];

interface RoutineAssignmentPickerProps {
  gymId: string;
  studentId: string;
  onAssigned: () => void;
  onCancel: () => void;
}

export function RoutineAssignmentPicker({
  gymId,
  studentId,
  onAssigned,
  onCancel,
}: RoutineAssignmentPickerProps) {
  const toast = useToast();
  const [routines, setRoutines] = useState<RoutineV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Day mapping step
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineV2 | null>(null);
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);
  const [dayMapping, setDayMapping] = useState<Record<string, string>>({});
  const [loadingDays, setLoadingDays] = useState(false);

  useEffect(() => {
    RoutineBuilderService.getRoutines(gymId)
      .then(setRoutines)
      .catch(() => toast.error('Error al cargar rutinas'))
      .finally(() => setLoading(false));
  }, [gymId]);

  const handleSelectRoutine = async (routine: RoutineV2) => {
    setSelectedRoutine(routine);
    setLoadingDays(true);
    try {
      const full = await RoutineBuilderService.loadFullRoutine(routine.id);
      setRoutineDays(full.days);
      setDayMapping({});
    } catch {
      toast.error('Error al cargar dias');
      setSelectedRoutine(null);
    } finally {
      setLoadingDays(false);
    }
  };

  const toggleDayMapping = (dayId: string, weekday: string) => {
    setDayMapping((prev) => {
      const copy = { ...prev };
      if (copy[dayId] === weekday) {
        delete copy[dayId];
      } else {
        // Remove weekday if already assigned to another day
        for (const [k, v] of Object.entries(copy)) {
          if (v === weekday) delete copy[k];
        }
        copy[dayId] = weekday;
      }
      return copy;
    });
  };

  const handleAssign = async () => {
    if (!selectedRoutine) return;
    setAssigning(true);
    try {
      await RoutineBuilderService.assignRoutine(selectedRoutine.id, studentId, dayMapping);
      toast.success('Rutina asignada');
      onAssigned();
    } catch {
      toast.error('Error al asignar rutina');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Step 2: Day mapping ───────────────────────────────────────────────────
  if (selectedRoutine) {
    if (loadingDays) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedRoutine(null); setRoutineDays([]); setDayMapping({}); }}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Asignar dias
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedRoutine.name}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Asigna cada dia de rutina a un dia de la semana
        </p>

        <div className="space-y-3">
          {routineDays.map((day) => {
            const mapped = dayMapping[day.id];
            return (
              <div key={day.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {day.label}
                  </span>
                  {mapped && (
                    <span className="text-xs text-indigo-500 font-semibold ml-auto">
                      {WEEKDAYS.find((w) => w.key === mapped)?.label}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((wd) => {
                    const isSelected = mapped === wd.key;
                    const isUsedByOther = !isSelected && Object.values(dayMapping).includes(wd.key);
                    return (
                      <button
                        key={wd.key}
                        type="button"
                        onClick={() => toggleDayMapping(day.id, wd.key)}
                        disabled={isUsedByOther}
                        className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : isUsedByOther
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-200 dark:text-slate-700 cursor-not-allowed'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {wd.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleAssign}
            disabled={assigning}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {Object.keys(dayMapping).length > 0 ? 'Asignar con dias' : 'Asignar sin dias'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Select routine ────────────────────────────────────────────────
  if (routines.length === 0) {
    return (
      <div className="text-center py-6">
        <Dumbbell size={28} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
        <p className="text-sm text-slate-400">No hay rutinas creadas</p>
        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
          Crea una rutina primero desde la seccion de Rutinas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Selecciona una rutina
        </p>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {routines.map((r) => (
        <button
          key={r.id}
          onClick={() => handleSelectRoutine(r)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors"
        >
          <div className="p-2 rounded-lg bg-cyan-500/10 shrink-0">
            <Dumbbell size={14} className="text-cyan-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {r.name}
            </p>
            {r.description && (
              <p className="text-xs text-slate-400 truncate">{r.description}</p>
            )}
          </div>
          <Check size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
        </button>
      ))}
    </div>
  );
}
