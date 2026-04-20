import { supabase } from '../../db/supabase';
import { WorkoutSession, WorkoutSessionExercise, SessionSet } from '../../../shared/types';
import type { RoutineExercise, RoutineSet } from '../../../shared/types';

export interface PTSessionExercise extends WorkoutSessionExercise {
  sets_data: SessionSet[];
}

export interface PTSessionFull {
  session: WorkoutSession;
  exercises: PTSessionExercise[];
}

/** Último registro de un ejercicio (para pre-llenar peso/reps) */
export interface LastPerformance {
  exercise_name: string;
  workout_exercise_id: string;
  sets: SessionSet[];
}

const todayDate = (): string => new Date().toLocaleDateString('sv-SE');

export const PTSessionService = {

  // ─── Find existing in-progress session for today ────────────────────────

  async findInProgressSession(studentId: string): Promise<WorkoutSession | null> {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_date', todayDate())
      .eq('status', 'in_progress')
      .limit(1);
    return data?.[0] ?? null;
  },

  // ─── Start / Resume Session ──────────────────────────────────────────────

  async startSession(
    gymId: string,
    studentId: string,
    planId: string,
    exercises: Array<{ id: string }>,
  ): Promise<PTSessionFull> {
    // Sweep stale in_progress sessions from previous days so they count in history
    await this.completeStaleSessions(studentId).catch((err) =>
      console.error('Error sweeping stale sessions:', err),
    );

    // Check for existing in-progress session today
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_date', todayDate())
      .eq('status', 'in_progress')
      .limit(1);

    if (existing?.[0]) {
      return this.loadFullSession(existing[0]);
    }

    // Create new session
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        gym_id: gymId,
        student_id: studentId,
        workout_plan_id: planId,
        session_date: todayDate(),
        started_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) throw error;

    // Create exercise entries
    if (exercises.length > 0) {
      const items = exercises.map((ex) => ({
        session_id: session.id,
        workout_exercise_id: ex.id,
        completed: false,
      }));
      await supabase.from('workout_session_exercises').insert(items);
    }

    return this.loadFullSession(session);
  },

  // ─── Start Session from V2 Routine ──────────────────────────────────────

  async startSessionV2(
    gymId: string,
    studentId: string,
    routineId: string,
    routineDayId: string,
    exercises: Array<{
      routine_exercise_id: string;
      exercise_name: string;
      order: number;
      sets: RoutineSet[];
    }>,
  ): Promise<PTSessionFull> {
    // Helper to build exercise insert items
    const buildExerciseItems = (sessionId: string) =>
      exercises.map((ex) => {
        const plannedSets = ex.sets.length;
        const repsInfo = ex.sets[0]?.reps
          ? String(ex.sets[0].reps) + (ex.sets[0].reps_max ? `-${ex.sets[0].reps_max}` : '')
          : null;
        const weightInfo = ex.sets[0]?.weight_kg ? `${ex.sets[0].weight_kg}kg` : null;

        return {
          session_id: sessionId,
          workout_exercise_id: null,
          routine_exercise_id: ex.routine_exercise_id,
          exercise_name_cache: ex.exercise_name,
          sets_planned_cache: plannedSets,
          reps_planned_cache: repsInfo,
          weight_planned_cache: weightInfo,
          exercise_order_cache: ex.order,
          completed: false,
        };
      });

    // Sweep stale in_progress sessions from previous days so they count in history
    await this.completeStaleSessions(studentId).catch((err) =>
      console.error('Error sweeping stale sessions:', err),
    );

    // Check for existing in-progress session today
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_date', todayDate())
      .eq('status', 'in_progress')
      .limit(1);

    if (existing?.[0]) {
      // Check if the existing session actually has exercises — if not, re-insert them
      const { count } = await supabase
        .from('workout_session_exercises')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', existing[0].id);

      if ((count ?? 0) === 0 && exercises.length > 0) {
        const items = buildExerciseItems(existing[0].id);
        const { error: insErr } = await supabase
          .from('workout_session_exercises')
          .insert(items);
        if (insErr) console.error('Error re-inserting exercises into existing session:', insErr);
      }

      return this.loadFullSession(existing[0]);
    }

    // Create new session (workout_plan_id = null for v2)
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        gym_id: gymId,
        student_id: studentId,
        workout_plan_id: null,
        routine_id: routineId,
        routine_day_id: routineDayId,
        session_date: todayDate(),
        started_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) throw error;

    // Create exercise entries with cached metadata
    if (exercises.length > 0) {
      const items = buildExerciseItems(session.id);
      const { error: exError } = await supabase
        .from('workout_session_exercises')
        .insert(items);

      if (exError) {
        console.error('Error inserting V2 exercises:', exError);
        // Session was created but exercises failed — clean up and throw
        await supabase.from('workout_sessions').delete().eq('id', session.id);
        throw new Error('No se pudieron crear los ejercicios de la sesión. Verificá que la migración v2_session_support esté aplicada.');
      }
    }

    return this.loadFullSession(session);
  },

  // ─── Save Set ────────────────────────────────────────────────────────────

  async saveSet(
    sessionExerciseId: string,
    setNumber: number,
    data: {
      weight_kg?: number | null;
      reps_done?: number | null;
      rpe?: number | null;
      rir?: number | null;
      notes?: string | null;
    },
    loggedBy: 'pt' | 'student' = 'pt',
  ): Promise<SessionSet> {
    const { data: result, error } = await supabase
      .from('session_sets')
      .upsert(
        {
          session_exercise_id: sessionExerciseId,
          set_number: setNumber,
          weight_kg: data.weight_kg ?? null,
          reps_done: data.reps_done ?? null,
          rpe: data.rpe ?? null,
          rir: data.rir ?? null,
          notes: data.notes ?? null,
          completed: true,
          logged_by: loggedBy,
        },
        { onConflict: 'session_exercise_id,set_number' },
      )
      .select()
      .single();

    if (error) throw error;
    return result as SessionSet;
  },

  // ─── Cancel Session ──────────────────────────────────────────────────────

  async cancelSession(sessionId: string): Promise<void> {
    // Delete all sets for this session's exercises
    const { data: exercises } = await supabase
      .from('workout_session_exercises')
      .select('id')
      .eq('session_id', sessionId);

    if (exercises?.length) {
      const exerciseIds = exercises.map((e: any) => e.id);
      await supabase
        .from('session_sets')
        .delete()
        .in('session_exercise_id', exerciseIds);
    }

    // Delete exercises
    await supabase
      .from('workout_session_exercises')
      .delete()
      .eq('session_id', sessionId);

    // Delete the session itself
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  },

  // ─── Delete Set ──────────────────────────────────────────────────────────

  async deleteSet(setId: string): Promise<void> {
    const { error } = await supabase
      .from('session_sets')
      .delete()
      .eq('id', setId);
    if (error) throw error;
  },

  // ─── Mark Exercise Done ──────────────────────────────────────────────────

  async markExerciseDone(sessionExerciseId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('workout_session_exercises')
      .update({ completed })
      .eq('id', sessionExerciseId);
    if (error) throw error;
  },

  // ─── Complete Session ────────────────────────────────────────────────────

  async completeSession(
    sessionId: string,
    ptNotes?: string,
  ): Promise<WorkoutSession> {
    // Calculate total volume from all sets
    const { data: exercises } = await supabase
      .from('workout_session_exercises')
      .select('id')
      .eq('session_id', sessionId);

    let totalVolume = 0;
    if (exercises?.length) {
      const exerciseIds = exercises.map((e: any) => e.id);
      const { data: sets } = await supabase
        .from('session_sets')
        .select('weight_kg, reps_done')
        .in('session_exercise_id', exerciseIds);

      totalVolume = (sets ?? []).reduce((sum: number, s: any) => {
        const w = Number(s.weight_kg) || 0;
        const r = Number(s.reps_done) || 0;
        return sum + w * r;
      }, 0);
    }

    // Calculate duration
    const { data: sess } = await supabase
      .from('workout_sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    const now = new Date();
    const startedAt = sess?.started_at ? new Date(sess.started_at) : now;
    const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

    // Mark all exercises with sets as completed
    if (exercises?.length) {
      const exerciseIds = exercises.map((e: any) => e.id);
      const { data: setsPerExercise } = await supabase
        .from('session_sets')
        .select('session_exercise_id')
        .in('session_exercise_id', exerciseIds);

      const exercisesWithSets = new Set(
        (setsPerExercise ?? []).map((s: any) => s.session_exercise_id),
      );

      for (const exId of exercisesWithSets) {
        await supabase
          .from('workout_session_exercises')
          .update({ completed: true })
          .eq('id', exId);
      }
    }

    const { data: updated, error } = await supabase
      .from('workout_sessions')
      .update({
        completed_at: now.toISOString(),
        finished_at: now.toISOString(),
        duration_minutes: durationMinutes,
        total_volume: totalVolume,
        pt_notes: ptNotes || null,
        status: 'completed',
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return updated as WorkoutSession;
  },

  // ─── Load Full Session (with sets) ───────────────────────────────────────

  async loadFullSession(session: WorkoutSession): Promise<PTSessionFull> {
    const isV2 = !!session.routine_id;

    // V2 sessions use cached columns — no need to join workout_exercises
    // Legacy sessions need the join for exercise metadata
    let rawExercises: any[] | null;
    if (isV2) {
      const { data, error } = await supabase
        .from('workout_session_exercises')
        .select('*')
        .eq('session_id', session.id);
      if (error) console.error('Error loading V2 session exercises:', error);
      rawExercises = data;
    } else {
      const { data, error } = await supabase
        .from('workout_session_exercises')
        .select('*, workout_exercises(exercise_name, sets, reps, weight, rest_seconds, notes, video_url, exercise_order)')
        .eq('session_id', session.id);
      if (error) console.error('Error loading legacy session exercises:', error);
      rawExercises = data;
    }

    const exerciseIds = (rawExercises ?? []).map((e: any) => e.id);

    let allSets: any[] = [];
    if (exerciseIds.length > 0) {
      const { data } = await supabase
        .from('session_sets')
        .select('*')
        .in('session_exercise_id', exerciseIds)
        .order('set_number', { ascending: true });
      allSets = data ?? [];
    }

    const setsByExercise = new Map<string, SessionSet[]>();
    for (const s of allSets) {
      const arr = setsByExercise.get(s.session_exercise_id) ?? [];
      arr.push(s as SessionSet);
      setsByExercise.set(s.session_exercise_id, arr);
    }

    const exercises: PTSessionExercise[] = (rawExercises ?? [])
      .map((item: any) => {
        // V2 routine exercises use cached metadata; legacy uses joined workout_exercises
        const name = isV2
          ? (item.exercise_name_cache ?? '')
          : (item.workout_exercises?.exercise_name ?? '');
        const sets = isV2
          ? (item.sets_planned_cache ?? null)
          : (item.workout_exercises?.sets ?? null);
        const reps = isV2
          ? (item.reps_planned_cache ?? null)
          : (item.workout_exercises?.reps ?? null);
        const weight = isV2
          ? (item.weight_planned_cache ?? null)
          : (item.workout_exercises?.weight ?? null);
        const order = isV2
          ? (item.exercise_order_cache ?? 0)
          : (item.workout_exercises?.exercise_order ?? 0);

        return {
          id: item.id,
          session_id: item.session_id,
          workout_exercise_id: item.workout_exercise_id ?? item.routine_exercise_id ?? '',
          completed: item.completed,
          created_at: item.created_at,
          exercise_name: name,
          sets,
          reps,
          weight,
          rest_seconds: isV2 ? null : (item.workout_exercises?.rest_seconds ?? null),
          notes: isV2 ? null : (item.workout_exercises?.notes ?? null),
          video_url: isV2 ? null : (item.workout_exercises?.video_url ?? null),
          exercise_order: order,
          routine_exercise_id: item.routine_exercise_id ?? null,
          sets_data: setsByExercise.get(item.id) ?? [],
        };
      })
      .sort((a: PTSessionExercise, b: PTSessionExercise) =>
        a.exercise_order - b.exercise_order,
      );

    return { session, exercises };
  },

  // ─── Get Last Performance (for pre-filling) ─────────────────────────────

  async getLastPerformance(
    studentId: string,
    workoutExerciseIds: string[],
  ): Promise<Map<string, SessionSet[]>> {
    if (!workoutExerciseIds.length) return new Map();

    // Find the most recent completed session for this student
    const { data: recentSessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      .limit(5);

    if (!recentSessions?.length) return new Map();

    const sessionIds = recentSessions.map((s: any) => s.id);

    // Find exercises from those sessions that match our workout_exercise_ids
    const { data: prevExercises } = await supabase
      .from('workout_session_exercises')
      .select('id, workout_exercise_id, session_id')
      .in('session_id', sessionIds)
      .in('workout_exercise_id', workoutExerciseIds);

    if (!prevExercises?.length) return new Map();

    // Get sets for those exercises
    const prevExIds = prevExercises.map((e: any) => e.id);
    const { data: prevSets } = await supabase
      .from('session_sets')
      .select('*')
      .in('session_exercise_id', prevExIds)
      .order('set_number', { ascending: true });

    // Map by workout_exercise_id (take the most recent one per exercise)
    const result = new Map<string, SessionSet[]>();
    const exerciseToSession = new Map<string, { sessionIdx: number; exerciseId: string }>();

    for (const ex of prevExercises) {
      const sessionIdx = sessionIds.indexOf(ex.session_id);
      const existing = exerciseToSession.get(ex.workout_exercise_id);
      if (!existing || sessionIdx < existing.sessionIdx) {
        exerciseToSession.set(ex.workout_exercise_id, {
          sessionIdx,
          exerciseId: ex.id,
        });
      }
    }

    for (const [weId, { exerciseId }] of exerciseToSession) {
      const sets = (prevSets ?? []).filter(
        (s: any) => s.session_exercise_id === exerciseId,
      ) as SessionSet[];
      if (sets.length > 0) {
        result.set(weId, sets);
      }
    }

    return result;
  },

  // ─── Get Session History with Set Details ────────────────────────────────

  async getSessionsWithSets(
    studentId: string,
    limit = 10,
  ): Promise<PTSessionFull[]> {
    // Include in_progress sessions so today's unfinished session still counts
    // (as long as it has at least one saved set)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['completed', 'in_progress'])
      .order('session_date', { ascending: false })
      .limit(limit * 2);

    if (!sessions?.length) return [];

    const results: PTSessionFull[] = [];
    for (const session of sessions as any[]) {
      const full = await this.loadFullSession(session as WorkoutSession);
      const hasSets = full.exercises.some((ex) => ex.sets_data.length > 0);
      if (session.status === 'completed' || hasSets) {
        results.push(full);
        if (results.length >= limit) break;
      }
    }

    return results;
  },

  // ─── Complete Stale In-Progress Sessions ─────────────────────────────────
  // Marks in_progress sessions from previous days as completed if they have
  // saved sets. Deletes empty shells. Today's sessions are left untouched.

  async completeStaleSessions(studentId: string): Promise<number> {
    const today = todayDate();

    const { data: stale } = await supabase
      .from('workout_sessions')
      .select('id, started_at, session_date')
      .eq('student_id', studentId)
      .eq('status', 'in_progress')
      .lt('session_date', today);

    if (!stale?.length) return 0;

    const sessionIds = (stale as any[]).map((s) => s.id);

    const { data: exerciseRows } = await supabase
      .from('workout_session_exercises')
      .select('id, session_id')
      .in('session_id', sessionIds);

    const exercisesBySession = new Map<string, string[]>();
    for (const ex of (exerciseRows ?? []) as any[]) {
      const arr = exercisesBySession.get(ex.session_id) ?? [];
      arr.push(ex.id);
      exercisesBySession.set(ex.session_id, arr);
    }

    const allExerciseIds = (exerciseRows ?? []).map((e: any) => e.id);
    const setsByExercise = new Map<string, any[]>();
    if (allExerciseIds.length > 0) {
      const { data: sets } = await supabase
        .from('session_sets')
        .select('session_exercise_id, weight_kg, reps_done, created_at')
        .in('session_exercise_id', allExerciseIds);

      for (const s of (sets ?? []) as any[]) {
        const arr = setsByExercise.get(s.session_exercise_id) ?? [];
        arr.push(s);
        setsByExercise.set(s.session_exercise_id, arr);
      }
    }

    let completedCount = 0;
    const emptySessions: string[] = [];

    for (const session of stale as any[]) {
      const sessionExIds = exercisesBySession.get(session.id) ?? [];
      const exercisesWithSets: string[] = [];
      const sessionSets: any[] = [];

      for (const exId of sessionExIds) {
        const exSets = setsByExercise.get(exId) ?? [];
        if (exSets.length > 0) {
          exercisesWithSets.push(exId);
          sessionSets.push(...exSets);
        }
      }

      if (sessionSets.length === 0) {
        emptySessions.push(session.id);
        continue;
      }

      const totalVolume = sessionSets.reduce((sum, s) => {
        const w = Number(s.weight_kg) || 0;
        const r = Number(s.reps_done) || 0;
        return sum + w * r;
      }, 0);

      const lastSetTime = sessionSets
        .map((s) => s.created_at)
        .filter(Boolean)
        .sort()
        .reverse()[0];
      const completedAt =
        lastSetTime || new Date(session.session_date + 'T23:59:59').toISOString();
      const startedAt = session.started_at
        ? new Date(session.started_at)
        : new Date(completedAt);
      const durationMinutes = Math.max(
        1,
        Math.round((new Date(completedAt).getTime() - startedAt.getTime()) / 60000),
      );

      if (exercisesWithSets.length > 0) {
        await supabase
          .from('workout_session_exercises')
          .update({ completed: true })
          .in('id', exercisesWithSets);
      }

      await supabase
        .from('workout_sessions')
        .update({
          completed_at: completedAt,
          finished_at: completedAt,
          duration_minutes: durationMinutes,
          total_volume: totalVolume,
          status: 'completed',
        })
        .eq('id', session.id);

      completedCount++;
    }

    if (emptySessions.length > 0) {
      await supabase
        .from('workout_session_exercises')
        .delete()
        .in('session_id', emptySessions);
      await supabase
        .from('workout_sessions')
        .delete()
        .in('id', emptySessions);
    }

    return completedCount;
  },
};
