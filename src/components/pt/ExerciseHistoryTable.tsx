import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import type { ExerciseHistory } from '../../services/pt/PreSessionService';

interface ExerciseHistoryTableProps {
  exerciseHistory: ExerciseHistory[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatSets(sets: Array<{ weight_kg: number | null; reps_done: number | null }>): string {
  return sets
    .filter((s) => s.reps_done != null && s.reps_done > 0)
    .map((s) => {
      const w = s.weight_kg ?? 0;
      const r = s.reps_done ?? 0;
      return `${w}kg x ${r}`;
    })
    .join(', ');
}

export const ExerciseHistoryTable: React.FC<ExerciseHistoryTableProps> = ({ exerciseHistory }) => {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    // Auto-expand first 3
    new Set(exerciseHistory.slice(0, 3).map((e) => e.workoutExerciseId)),
  );

  if (exerciseHistory.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
        Sin historial de ejercicios
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {exerciseHistory.map((ex) => {
        const isExpanded = expandedExercises.has(ex.workoutExerciseId);
        const latestWeight = ex.sessions[0]?.sets?.[0]?.weight_kg;

        return (
          <div
            key={ex.workoutExerciseId}
            className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(ex.workoutExerciseId)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Dumbbell size={14} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {ex.exerciseName}
                </span>
                {latestWeight != null && latestWeight > 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    ({latestWeight}kg)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {ex.sessions.length} sesiones
                </span>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 py-2 space-y-1.5 bg-white dark:bg-slate-900">
                {ex.sessions.map((session) => (
                  <div
                    key={session.date}
                    className="flex items-start gap-3 text-xs"
                  >
                    <span className="w-14 shrink-0 text-slate-400 dark:text-slate-500 font-medium pt-0.5">
                      {formatDate(session.date)}
                    </span>
                    <div className="flex-1">
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatSets(session.sets)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 ml-2">
                        vol: {Math.round(session.totalVolume).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
