import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, CalendarDays } from 'lucide-react';
import { safe } from '../../utils/safeRender';
import type { ExerciseHistory } from '../../services/pt/PreSessionService';
import type { PTSessionFull } from '../../services/pt/PTSessionService';

interface ExerciseHistoryTableProps {
  exerciseHistory: ExerciseHistory[];
  sessions?: PTSessionFull[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
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

type ViewMode = 'exercise' | 'session';

export const ExerciseHistoryTable: React.FC<ExerciseHistoryTableProps> = ({
  exerciseHistory,
  sessions = [],
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('session');
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set(exerciseHistory.slice(0, 3).map((e) => e.workoutExerciseId)),
  );
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(sessions.slice(0, 2).map((s) => s.session.id)),
  );

  const isEmpty =
    viewMode === 'exercise' ? exerciseHistory.length === 0 : sessions.length === 0;

  const toggleExercise = (id: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
        <button
          onClick={() => setViewMode('session')}
          className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
            viewMode === 'session'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CalendarDays size={13} />
          Por sesión
        </button>
        <button
          onClick={() => setViewMode('exercise')}
          className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
            viewMode === 'exercise'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Dumbbell size={13} />
          Por ejercicio
        </button>
      </div>

      {isEmpty ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
          Sin historial de {viewMode === 'session' ? 'sesiones' : 'ejercicios'}
        </div>
      ) : viewMode === 'session' ? (
        <SessionView
          sessions={sessions}
          expanded={expandedSessions}
          onToggle={toggleSession}
        />
      ) : (
        <ExerciseView
          exerciseHistory={exerciseHistory}
          expanded={expandedExercises}
          onToggle={toggleExercise}
        />
      )}
    </div>
  );
};

// ─── Session-centric view ──────────────────────────────────────────────────

const SessionView: React.FC<{
  sessions: PTSessionFull[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}> = ({ sessions, expanded, onToggle }) => (
  <div className="space-y-2">
    {sessions.map((s) => {
      const isExpanded = expanded.has(s.session.id);
      const exercisesWithSets = s.exercises.filter((ex) => ex.sets_data.length > 0);
      const totalSets = exercisesWithSets.reduce((sum, ex) => sum + ex.sets_data.length, 0);
      const totalVolume = exercisesWithSets.reduce(
        (sum, ex) =>
          sum +
          ex.sets_data.reduce(
            (v, set) => v + (Number(set.weight_kg) || 0) * (Number(set.reps_done) || 0),
            0,
          ),
        0,
      );
      const duration = s.session.duration_minutes;
      const isInProgress = s.session.status === 'in_progress';

      return (
        <div
          key={s.session.id}
          className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <button
            onClick={() => onToggle(s.session.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays size={14} className="text-slate-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize truncate">
                {formatFullDate(s.session.session_date)}
              </span>
              {isInProgress && (
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md shrink-0">
                  EN CURSO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {exercisesWithSets.length} ej · {totalSets} sets
              </span>
              {isExpanded ? (
                <ChevronUp size={14} className="text-slate-400" />
              ) : (
                <ChevronDown size={14} className="text-slate-400" />
              )}
            </div>
          </button>

          {isExpanded && (
            <div className="px-3 py-2 bg-white dark:bg-slate-900 space-y-2">
              {/* Session totals */}
              <div className="flex gap-3 text-[11px] text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>
                  Vol: <b className="text-slate-700 dark:text-slate-300">{Math.round(totalVolume).toLocaleString()}</b>
                </span>
                {duration != null && (
                  <span>
                    Duración: <b className="text-slate-700 dark:text-slate-300">{duration} min</b>
                  </span>
                )}
              </div>

              {/* Exercises list */}
              {exercisesWithSets.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">Sin sets registrados.</p>
              ) : (
                exercisesWithSets
                  .sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0))
                  .map((ex) => (
                    <div key={ex.id} className="text-xs">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <Dumbbell size={11} className="text-slate-400 shrink-0 translate-y-0.5" />
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {safe(ex.exercise_name, 'exercise_name')}
                        </span>
                      </div>
                      <div className="pl-4 text-slate-600 dark:text-slate-400">
                        {formatSets(ex.sets_data)}
                      </div>
                    </div>
                  ))
              )}

              {/* PT notes */}
              {s.session.pt_notes && (
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Notas
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    {s.session.pt_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ─── Exercise-centric view (legacy) ────────────────────────────────────────

const ExerciseView: React.FC<{
  exerciseHistory: ExerciseHistory[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}> = ({ exerciseHistory, expanded, onToggle }) => (
  <div className="space-y-2">
    {exerciseHistory.map((ex) => {
      const isExpanded = expanded.has(ex.workoutExerciseId);
      const latestWeight = ex.sessions[0]?.sets?.[0]?.weight_kg;

      return (
        <div
          key={ex.workoutExerciseId}
          className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <button
            onClick={() => onToggle(ex.workoutExerciseId)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Dumbbell size={14} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {safe(ex.exerciseName, 'exerciseName')}
              </span>
              {latestWeight != null && latestWeight > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ({latestWeight}kg)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {safe(ex.sessions.length, 'sessions.length')} sesiones
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
                    {safe(formatDate(session.date), 'session.date')}
                  </span>
                  <div className="flex-1">
                    <span className="text-slate-700 dark:text-slate-300">
                      {safe(formatSets(session.sets), 'formatSets')}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">
                      vol: {safe(Math.round(session.totalVolume).toLocaleString(), 'totalVolume')}
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
