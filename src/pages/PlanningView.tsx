import React, { useEffect, useState } from 'react';
import { Loader2, ChevronRight, ClipboardList } from 'lucide-react';
import { Card } from '../components/UI';
import { SemaphoreBadge } from '../components/pt/SemaphoreBadge';
import { AlertsList } from '../components/pt/AlertsList';
import { AlertEngineService } from '../services/pt/AlertEngineService';
import type { Student, StudentSemaphore } from '../../shared/types';

interface PlanningViewProps {
  students: Student[];
  gymId: string;
  onPrepareSession: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({
  students,
  gymId,
  onPrepareSession,
  onSelectStudent,
}) => {
  const [semaphores, setSemaphores] = useState<Record<string, StudentSemaphore>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!students.length) {
      setLoading(false);
      return;
    }
    AlertEngineService.getSemaphoresForStudents(students, gymId)
      .then((map) => {
        const obj: Record<string, StudentSemaphore> = {};
        map.forEach((v, k) => { obj[k] = v; });
        setSemaphores(obj);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [students, gymId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Analizando clientes...</p>
      </div>
    );
  }

  // Sort by priority (red first)
  const sorted = [...students]
    .map((s) => ({
      student: s,
      semaphore: semaphores[s.id] ?? { color: 'green' as const, statusText: 'Sin datos', alerts: [], priorityScore: 0 },
    }))
    .sort((a, b) => b.semaphore.priorityScore - a.semaphore.priorityScore);

  const redCount = sorted.filter((s) => s.semaphore.color === 'red').length;
  const yellowCount = sorted.filter((s) => s.semaphore.color === 'yellow').length;
  const greenCount = sorted.filter((s) => s.semaphore.color === 'green').length;

  return (
    <div className="space-y-4">
      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-2xl font-black text-slate-900 dark:text-white">{redCount}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atencion</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-2xl font-black text-slate-900 dark:text-white">{yellowCount}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revisar</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-2xl font-black text-slate-900 dark:text-white">{greenCount}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bien</p>
        </Card>
      </div>

      {/* Student list */}
      <div className="space-y-3">
        {sorted.map(({ student, semaphore }) => {
          const rawName =
            (student as any).name ??
            (`${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim() || 'Sin nombre');
          const name = String(rawName || 'Sin nombre');
          const firstLetter = name.charAt(0).toUpperCase();
          const topAlerts = semaphore.alerts.filter((a) => a.severity === 'danger' || a.severity === 'warning').slice(0, 2);

          return (
            <Card key={student.id} className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-base">
                    {firstLetter}
                  </div>
                  <span className="absolute -top-0.5 -right-0.5">
                    <SemaphoreBadge color={semaphore.color} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className="font-bold text-slate-900 dark:text-white text-sm cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    onClick={() => onSelectStudent(student)}
                  >
                    {name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-1">
                    {String(semaphore.statusText || '')}
                  </p>
                </div>
                <button
                  onClick={() => onPrepareSession(student)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shrink-0"
                >
                  <ClipboardList size={14} />
                  <span className="hidden sm:inline">Preparar</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              {topAlerts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <AlertsList alerts={topAlerts} compact maxItems={2} />
                </div>
              )}
            </Card>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <p className="text-sm">No hay clientes registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningView;
