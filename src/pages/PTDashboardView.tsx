import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Target,
  Dumbbell,
  ChevronRight,
  ArrowUpRight,
  AlertTriangle,
  Activity,
  Clock,
} from 'lucide-react';
import { Card, Button } from '../components/UI';
import { Student } from '../../shared/types';
import { WorkoutSessionService } from '../services/WorkoutSessionService';
import { GoalsService } from '../services/pt/GoalsService';

interface PTDashboardViewProps {
  onNavigate: (view: string) => void;
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

const AVATAR_PALETTES = [
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
];
const avatarColor = (name: string) =>
  AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

export const PTDashboardView: React.FC<PTDashboardViewProps> = ({
  onNavigate,
  students,
  onSelectStudent,
}) => {
  const safeStudents = Array.isArray(students) ? students : [];

  const [inactiveClients, setInactiveClients] = useState<Array<{ student: any; daysSince: number }>>([]);
  const [upcomingGoals, setUpcomingGoals] = useState<Array<{ studentName: string; studentId: string; goalType: string; targetDate: string; targetValue: string | null }>>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const normalizedStudents = safeStudents.map((s: any) => {
    const nombre = s.nombre ?? s.name ?? '';
    const apellido = s.apellido ?? s.lastName ?? '';
    const fullName = `${nombre} ${apellido}`.trim() || 'Sin nombre';
    return {
      ...s,
      displayName: fullName,
      firstLetter: (nombre || '?').charAt(0).toUpperCase(),
    };
  });

  const activeStudents = normalizedStudents.filter((s: any) => s.status === 'activo');
  const activeCount = activeStudents.length;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const newThisMonth = normalizedStudents.filter((s: any) => {
    const raw = s.created_at ?? s.createdAt ?? null;
    if (!raw) return false;
    const d = new Date(String(raw));
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Load insights: inactive clients + upcoming goals
  useEffect(() => {
    const loadInsights = async () => {
      setLoadingInsights(true);

      // Find clients with no sessions in 7+ days
      const inactiveList: Array<{ student: any; daysSince: number }> = [];
      const goalsList: Array<{ studentName: string; studentId: string; goalType: string; targetDate: string; targetValue: string | null }> = [];

      const promises = activeStudents.map(async (student: any) => {
        try {
          const [adherence, goals] = await Promise.allSettled([
            WorkoutSessionService.getAdherenceStats(student.id, 7),
            GoalsService.getByStudent(student.id),
          ]);

          // Check inactivity
          if (adherence.status === 'fulfilled') {
            const stats = adherence.value;
            if (stats.totalSessions === 0 || stats.lastSessionDate == null) {
              inactiveList.push({ student, daysSince: 7 });
            } else {
              const lastDate = new Date(stats.lastSessionDate);
              const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff >= 7) {
                inactiveList.push({ student, daysSince: daysDiff });
              }
            }
          }

          // Check upcoming goals
          if (goals.status === 'fulfilled') {
            const activeGoals = goals.value.filter((g: any) => g.status === 'active' && g.target_date);
            activeGoals.forEach((g: any) => {
              const targetDate = new Date(g.target_date);
              const daysUntil = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntil <= 30 && daysUntil >= 0) {
                goalsList.push({
                  studentName: student.displayName,
                  studentId: student.id,
                  goalType: g.goal_type,
                  targetDate: g.target_date,
                  targetValue: g.target_value,
                });
              }
            });
          }
        } catch { /* ignore individual failures */ }
      });

      await Promise.allSettled(promises);

      inactiveList.sort((a, b) => b.daysSince - a.daysSince);
      goalsList.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

      setInactiveClients(inactiveList);
      setUpcomingGoals(goalsList);
      setLoadingInsights(false);
    };

    if (activeStudents.length > 0) {
      loadInsights();
    } else {
      setLoadingInsights(false);
    }
  }, [students]);

  const GOAL_LABELS: Record<string, string> = {
    lose_weight: 'Bajar de peso',
    gain_muscle: 'Ganar músculo',
    strength: 'Fuerza',
    endurance: 'Resistencia',
    flexibility: 'Flexibilidad',
    rehab: 'Rehabilitación',
    general_fitness: 'Fitness general',
    other: 'Otro',
  };

  return (
    <div className="space-y-8 pb-10">

      {/* ── Greeting ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            ¡Hola, Coach!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-500 font-medium">
            {inactiveClients.length > 0 && !loadingInsights ? (
              <span className="text-amber-500 font-bold">{inactiveClients.length} cliente{inactiveClients.length !== 1 ? 's' : ''} inactivo{inactiveClients.length !== 1 ? 's' : ''}</span>
            ) : loadingInsights ? (
              <span>Cargando...</span>
            ) : (
              <span className="text-emerald-500 font-semibold">Todos tus clientes activos</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${inactiveClients.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            {activeCount} cliente{activeCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── KPI Metrics ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">Clientes</p>
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Users size={14} className="text-violet-500" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">{activeCount}</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 font-medium">clientes activos</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">Nuevos</p>
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <UserPlus size={14} className="text-emerald-500" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">+{newThisMonth}</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 font-medium">este mes</p>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[
          { label: 'Buscar Cliente', description: 'Encontrá un cliente rápido', icon: Search, iconClass: 'bg-slate-800 dark:bg-slate-700 text-slate-100', hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-600', view: 'students' },
          { label: 'Nuevo Cliente', description: 'Registrá un cliente nuevo', icon: UserPlus, iconClass: 'bg-violet-500 text-white', hoverBorder: 'hover:border-violet-400/60 dark:hover:border-violet-500/40', view: 'new-student' },
          { label: 'Rutinas', description: 'Gestioná planes de entrenamiento', icon: Dumbbell, iconClass: 'bg-emerald-500 text-white', hoverBorder: 'hover:border-emerald-400/60 dark:hover:border-emerald-500/40', view: 'workouts' },
        ].map(({ label, description, icon: Icon, iconClass, hoverBorder, view }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={`group flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 ${hoverBorder} shadow-sm dark:shadow-none hover:shadow-md transition-all duration-150 active:scale-[0.98] text-left`}
          >
            <div className={`w-10 h-10 rounded-xl ${iconClass} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-150`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5 font-medium">{description}</p>
            </div>
            <ArrowUpRight size={16} className="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
          </button>
        ))}
      </div>

      {/* ── Clientes inactivos ───────────────────────────────────── */}
      {!loadingInsights && inactiveClients.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <AlertTriangle size={13} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clientes sin entrenar (7+ días)</h3>
          </div>

          <div className="space-y-2">
            {inactiveClients.slice(0, 5).map(({ student, daysSince }) => (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="w-full group flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 transition-all shadow-sm text-left"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${avatarColor(student.displayName)}`}>
                  {student.firstLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{student.displayName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={10} className="text-amber-500" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {daysSince}+ días sin entrenar
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Objetivos próximos ───────────────────────────────────── */}
      {!loadingInsights && upcomingGoals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <Target size={13} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Objetivos próximos (30 días)</h3>
          </div>

          <div className="space-y-2">
            {upcomingGoals.slice(0, 5).map((goal, i) => {
              const daysUntil = Math.floor((new Date(goal.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const matchingStudent = normalizedStudents.find((s: any) => s.id === goal.studentId);
              return (
                <button
                  key={`${goal.studentId}-${i}`}
                  onClick={() => matchingStudent && onSelectStudent(matchingStudent)}
                  className="w-full group flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/40 transition-all shadow-sm text-left"
                >
                  <div className="p-2 rounded-xl bg-violet-500/10 shrink-0">
                    <Target size={16} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{goal.studentName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {GOAL_LABELS[goal.goalType] ?? goal.goalType}
                      {goal.targetValue && <span className="text-violet-500 font-bold ml-1">· {goal.targetValue}</span>}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                    daysUntil <= 7
                      ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Todos los clientes ───────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tus Clientes</h3>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline underline-offset-2"
          >
            Ver todos <ChevronRight size={13} />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800">
          {activeStudents.length > 0 ? (
            activeStudents.slice(0, 6).map((student: any) => (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${avatarColor(student.displayName)}`}>
                  {student.firstLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{student.displayName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">
                    {(student as any).planName ?? (student as any).plan_nombre ?? 'Sin plan'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
              </button>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3 mx-auto">
                <Users size={18} className="text-violet-500" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-600 font-semibold">Sin clientes aún</p>
              <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">Registrá tu primer cliente para empezar</p>
              <Button variant="secondary" className="mt-4" onClick={() => onNavigate('new-student')}>
                <UserPlus size={14} className="inline mr-1" />
                Nuevo Cliente
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
