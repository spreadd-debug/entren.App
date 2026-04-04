import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, MessageSquare, CreditCard, ChevronRight, UserPlus, Users, ArrowUpDown } from 'lucide-react';
import { Card, Input, StatusBadge, Button, BillingBadge } from '../components/UI';
import { SemaphoreBadge } from '../components/pt/SemaphoreBadge';
import { AlertEngineService } from '../services/pt/AlertEngineService';
import { Student, StudentSemaphore } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';
import { safe } from '../utils/safeRender';

type SortMode = 'priority' | 'name';

interface StudentsViewProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onNavigate: (view: string) => void;
  gymType?: 'gym' | 'personal_trainer';
  gymId?: string;
}

const isValidDate = (value: unknown) => {
  if (!value) return false;
  const date = new Date(String(value));
  return !isNaN(date.getTime());
};

export const StudentsView: React.FC<StudentsViewProps> = ({ students, onSelectStudent, onNavigate, gymType = 'gym', gymId }) => {
  const isPT = gymType === 'personal_trainer';
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(isPT ? 'priority' : 'name');
  const [semaphores, setSemaphores] = useState<Record<string, StudentSemaphore>>({});

  useEffect(() => {
    if (!isPT || !gymId || !students.length) return;
    AlertEngineService.getSemaphoresForStudents(students, gymId)
      .then((map) => {
        const obj: Record<string, StudentSemaphore> = {};
        map.forEach((v, k) => { obj[k] = v; });
        setSemaphores(obj);
      })
      .catch(() => {});
  }, [isPT, gymId, students]);

  const safeStudents = Array.isArray(students) ? students : [];

  const normalizedStudents = useMemo(() => {
    const today = new Date();

    return safeStudents.map((student: any) => {
      const nombre = student.nombre ?? student.name ?? '';
      const apellido = student.apellido ?? student.lastName ?? '';
      const fullName = `${nombre} ${apellido}`.trim();

      const nextDueDate = student.next_due_date ?? student.nextDueDate ?? null;

      let dueStatus: 'expired' | 'expiring' | 'ok' = 'ok';

      if (isValidDate(nextDueDate)) {
        const dueDate = new Date(String(nextDueDate));
        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) dueStatus = 'expired';
        else if (diffDays <= 3) dueStatus = 'expiring';
      }

      return {
        ...student,
        displayName: fullName || 'Sin nombre',
        firstLetter: (nombre || '?').charAt(0).toUpperCase(),
        planDisplay: student.planName ?? student.plan_nombre ?? 'Sin plan',
        nextDueDisplay: nextDueDate,
        dueStatus,
      };
    });
  }, [safeStudents]);

  const hasSemaphores = Object.keys(semaphores).length > 0;

  const filteredStudents = normalizedStudents
    .filter((s: any) => s.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a: any, b: any) => {
      if (isPT && hasSemaphores && sortMode === 'priority') {
        const aPriority = semaphores[a.id]?.priorityScore ?? 0;
        const bPriority = semaphores[b.id]?.priorityScore ?? 0;
        if (bPriority !== aPriority) return bPriority - aPriority;
      }
      return a.displayName.localeCompare(b.displayName);
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input
            placeholder={isPT ? "Buscar cliente..." : "Buscar alumno..."}
            className="pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isPT && hasSemaphores && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setSortMode((m) => m === 'priority' ? 'name' : 'priority')}
            title={sortMode === 'priority' ? 'Ordenar por nombre' : 'Ordenar por prioridad'}
          >
            <ArrowUpDown size={20} />
          </Button>
        )}
        <Button variant="outline" size="icon" className="shrink-0">
          <Filter size={20} />
        </Button>
      </div>

      <Button
        variant="secondary"
        fullWidth
        className="md:hidden gap-2 py-4"
        onClick={() => onNavigate('new-student')}
      >
        <UserPlus size={20} />
        {isPT ? 'Nuevo Cliente' : 'Nuevo Alumno'}
      </Button>

      <div className="space-y-3">
        {filteredStudents.map((student: any) => (
          <Card
            key={student.id}
            className="p-4"
            onClick={() => onSelectStudent(student)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-lg">
                    {student.firstLetter}
                  </div>
                  {isPT && semaphores[student.id] && (
                    <span className="absolute -top-0.5 -right-0.5">
                      <SemaphoreBadge color={semaphores[student.id].color} />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{student.displayName}</h4>
                    {!isPT && (
                      <BillingBadge
                        cobra_cuota={student.cobra_cuota}
                        recordatorio_automatico={student.recordatorio_automatico}
                        tipo_beca={student.tipo_beca}
                        whatsapp_opt_in={student.whatsapp_opt_in}
                      />
                    )}
                  </div>
                  {isPT && semaphores[student.id] ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug line-clamp-1">
                      {safe(semaphores[student.id].statusText, 'semaphore.statusText')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{student.planDisplay}</p>
                  )}
                </div>
              </div>

              <StatusBadge status={student.status} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
              {!isPT ? (
                <div className="text-xs">
                  <p className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-0.5">Vencimiento</p>
                  <p
                    className={`font-bold ${
                      student.dueStatus === 'expired'
                        ? 'text-rose-600'
                        : student.dueStatus === 'expiring'
                        ? 'text-amber-600'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {student.nextDueDisplay ? formatDate(String(student.nextDueDisplay)) : 'Sin fecha'}
                  </p>
                </div>
              ) : (
                <div className="text-xs">
                  <p className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-0.5">Plan</p>
                  <p className="font-bold text-slate-900 dark:text-white">{student.planDisplay}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!isPT && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageSquare size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(student);
                      }}
                      className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      <CreditCard size={18} />
                    </button>
                  </>
                )}
                <div className="p-2.5 text-slate-300 dark:text-slate-600">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredStudents.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
              <Users size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isPT ? 'No se encontraron clientes' : 'No se encontraron alumnos'}</h3>
            <p className="text-slate-500 dark:text-slate-400">Probá con otro nombre o agregá uno nuevo.</p>
          </div>
        )}
      </div>
    </div>
  );
};
