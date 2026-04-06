import { useState, useEffect } from 'react';
import { Dumbbell, Loader2, Check } from 'lucide-react';
import { RoutineBuilderService } from '../../services/RoutineBuilderService';
import { useToast } from '../../context/ToastContext';
import type { RoutineV2 } from '../../../shared/types';

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
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    RoutineBuilderService.getRoutines(gymId)
      .then(setRoutines)
      .catch(() => toast.error('Error al cargar rutinas'))
      .finally(() => setLoading(false));
  }, [gymId]);

  const handleAssign = async (routineId: string) => {
    setAssigning(routineId);
    try {
      await RoutineBuilderService.assignRoutine(routineId, studentId);
      toast.success('Rutina asignada');
      onAssigned();
    } catch {
      toast.error('Error al asignar rutina');
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

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
          onClick={() => handleAssign(r.id)}
          disabled={assigning !== null}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors disabled:opacity-50"
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
          {assigning === r.id ? (
            <Loader2 size={16} className="animate-spin text-cyan-500 shrink-0" />
          ) : (
            <Check size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
