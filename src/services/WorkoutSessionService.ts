import { supabase } from '../db/supabase';
import { WorkoutSession, WorkoutSessionExercise } from '../../shared/types';

/** Devuelve la fecha de hoy en formato YYYY-MM-DD (sin zona horaria) */
const todayDate = (): string => new Date().toLocaleDateString('sv-SE');

export const WorkoutSessionService = {

  // ─── Consulta sesión de hoy ──────────────────────────────────────────────────

  async getTodaySession(studentId: string): Promise<{
    session: WorkoutSession;
    items: WorkoutSessionExercise[];
  } | null> {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_date', todayDate())
      .limit(1);

    const session = sessions?.[0] ?? null;
    if (!session) return null;

    return this._loadSessionItems(session);
  },

  // ─── Iniciar sesión del día ──────────────────────────────────────────────────

  /**
   * Crea una sesión para hoy con los ejercicios de la rutina elegida.
   * Si ya existe una sesión para hoy, la devuelve sin crear una nueva.
   */
  async startSession(
    gymId: string,
    studentId: string,
    planId: string,
    exercises: any[],
  ): Promise<{ session: WorkoutSession; items: WorkoutSessionExercise[] }> {
    // Si ya hay sesión hoy, devolverla
    const existing = await this.getTodaySession(studentId);
    if (existing) return existing;

    // Crear sesión
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        gym_id: gymId,
        student_id: studentId,
        workout_plan_id: planId,
        session_date: todayDate(),
      })
      .select()
      .single();

    if (error) throw error;

    // Crear ítems del checklist (uno por ejercicio)
    if (exercises.length > 0) {
      const items = exercises.map((ex: any) => ({
        session_id: session.id,
        workout_exercise_id: ex.id,
        completed: false,
      }));
      await supabase.from('workout_session_exercises').insert(items);
    }

    return (await this._loadSessionItems(session)) ?? { session, items: [] };
  },

  // ─── Marcar ejercicio como hecho / no hecho ──────────────────────────────────

  async toggleExercise(sessionExerciseId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('workout_session_exercises')
      .update({ completed })
      .eq('id', sessionExerciseId);

    if (error) throw error;
  },

  // ─── Completar sesión ────────────────────────────────────────────────────────

  async completeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('workout_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  },

  // ─── Historial reciente ──────────────────────────────────────────────────────

  async getRecentSessions(studentId: string, limit = 10): Promise<WorkoutSession[]> {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(limit);

    return (data ?? []) as WorkoutSession[];
  },

  // ─── Interno: cargar ítems de una sesión ────────────────────────────────────

  async _loadSessionItems(session: WorkoutSession): Promise<{
    session: WorkoutSession;
    items: WorkoutSessionExercise[];
  }> {
    const { data: rawItems } = await supabase
      .from('workout_session_exercises')
      .select('*, workout_exercises(exercise_name, sets, reps, weight, rest_seconds, notes, video_url, exercise_order)')
      .eq('session_id', session.id);

    const items: WorkoutSessionExercise[] = (rawItems ?? [])
      .map((item: any) => ({
        id: item.id,
        session_id: item.session_id,
        workout_exercise_id: item.workout_exercise_id,
        completed: item.completed,
        created_at: item.created_at,
        exercise_name: item.workout_exercises?.exercise_name ?? '',
        sets: item.workout_exercises?.sets ?? null,
        reps: item.workout_exercises?.reps ?? null,
        weight: item.workout_exercises?.weight ?? null,
        rest_seconds: item.workout_exercises?.rest_seconds ?? null,
        notes: item.workout_exercises?.notes ?? null,
        video_url: item.workout_exercises?.video_url ?? null,
        exercise_order: item.workout_exercises?.exercise_order ?? 0,
      }))
      .sort((a: WorkoutSessionExercise, b: WorkoutSessionExercise) =>
        a.exercise_order - b.exercise_order,
      );

    return { session, items };
  },
};
