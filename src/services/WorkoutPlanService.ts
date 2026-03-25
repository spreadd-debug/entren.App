import { supabase } from "../db/supabase";

export interface LibraryExercise {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  muscle_group: string | null;
  created_at: string;
}

export const WorkoutPlanService = {
  // ─── Workout Plans ────────────────────────────────────────────────────────

  async getPlans(gymId: string) {
    const { data, error } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createPlan(gymId: string, name: string, description?: string) {
    const { data, error } = await supabase
      .from("workout_plans")
      .insert({
        gym_id: gymId,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlan(planId: string, updates: { name?: string; description?: string | null }) {
    const { data, error } = await supabase
      .from("workout_plans")
      .update({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePlan(planId: string) {
    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("id", planId);

    if (error) throw error;
  },

  // ─── Workout Exercises ────────────────────────────────────────────────────

  async addExercise(
    planId: string,
    exercise: {
      exerciseName: string;
      exerciseOrder: number;
      sets?: number | null;
      reps?: string | null;
      weight?: string | null;
      restSeconds?: number | null;
      notes?: string | null;
      videoUrl?: string | null;
      exerciseLibraryId?: string | null;
    }
  ) {
    const { error } = await supabase.from("workout_exercises").insert({
      workout_plan_id: planId,
      exercise_name: exercise.exerciseName,
      exercise_order: exercise.exerciseOrder,
      sets: exercise.sets ?? null,
      reps: exercise.reps ?? null,
      weight: exercise.weight ?? null,
      rest_seconds: exercise.restSeconds ?? null,
      notes: exercise.notes ?? null,
      video_url: exercise.videoUrl || null,
      exercise_library_id: exercise.exerciseLibraryId || null,
    });

    if (error) throw error;
  },

  async getExercises(planId: string) {
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_plan_id", planId)
      .order("exercise_order");

    if (error) throw error;
    return data || [];
  },

  async updateExercise(
    exerciseId: string,
    updates: {
      exerciseName?: string;
      sets?: number | null;
      reps?: string | null;
      weight?: string | null;
      videoUrl?: string | null;
      exerciseLibraryId?: string | null;
    }
  ) {
    const { data, error } = await supabase
      .from("workout_exercises")
      .update({
        ...(updates.exerciseName !== undefined ? { exercise_name: updates.exerciseName } : {}),
        ...(updates.sets !== undefined ? { sets: updates.sets } : {}),
        ...(updates.reps !== undefined ? { reps: updates.reps } : {}),
        ...(updates.weight !== undefined ? { weight: updates.weight } : {}),
        ...(updates.videoUrl !== undefined ? { video_url: updates.videoUrl } : {}),
        ...(updates.exerciseLibraryId !== undefined
          ? { exercise_library_id: updates.exerciseLibraryId }
          : {}),
      })
      .eq("id", exerciseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteExercise(exerciseId: string) {
    const { error } = await supabase
      .from("workout_exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) throw error;
  },

  // ─── Student Workout Assignments ──────────────────────────────────────────

  // ─── Asignación (comportamiento original: reemplaza la opción activa) ─────────

  async assignPlanToStudent(gymId: string, studentId: string, planId: string) {
    await supabase
      .from("student_workout_assignments")
      .update({ active: false })
      .eq("student_id", studentId);

    const { error } = await supabase
      .from("student_workout_assignments")
      .insert({
        gym_id: gymId,
        student_id: studentId,
        workout_plan_id: planId,
        active: true,
      });

    if (error) throw error;
  },

  // ─── Multi-opción: agregar rutina disponible sin quitar las otras ────────────

  /**
   * Agrega una rutina como opción disponible para el alumno.
   * No desactiva las otras opciones existentes (a diferencia de assignPlanToStudent).
   * Si la rutina ya está asignada y activa, no hace nada.
   */
  async addWorkoutOption(gymId: string, studentId: string, planId: string): Promise<void> {
    const { data: existing } = await supabase
      .from("student_workout_assignments")
      .select("id")
      .eq("student_id", studentId)
      .eq("workout_plan_id", planId)
      .eq("active", true)
      .limit(1);

    if (existing && existing.length > 0) return; // ya está asignada

    const { error } = await supabase
      .from("student_workout_assignments")
      .insert({ gym_id: gymId, student_id: studentId, workout_plan_id: planId, active: true });

    if (error) throw error;
  },

  /**
   * Quita una opción de rutina del alumno (desactiva la asignación por ID).
   */
  async removeWorkoutOption(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from("student_workout_assignments")
      .update({ active: false })
      .eq("id", assignmentId);

    if (error) throw error;
  },

  /**
   * Devuelve todas las opciones de rutina activas del alumno, con nombre y
   * descripción del plan, ordenadas de más reciente a más antigua.
   */
  async getStudentWorkoutOptions(studentId: string): Promise<any[]> {
    const { data } = await supabase
      .from("student_workout_assignments")
      .select("*, workout_plans(id, name, description, updated_at)")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    return (data ?? []).map((row: any) => ({
      id: row.id,
      gym_id: row.gym_id,
      student_id: row.student_id,
      workout_plan_id: row.workout_plan_id,
      plan_name: row.workout_plans?.name ?? "",
      plan_description: row.workout_plans?.description ?? null,
      updated_at: row.updated_at ?? row.created_at,
      created_at: row.created_at,
      days_of_week: row.days_of_week ?? null,
    }));
  },

  /**
   * Actualiza los días de la semana habilitados para una asignación.
   * Pasar null para quitar la restricción de días.
   */
  async updateWorkoutOptionDays(assignmentId: string, daysOfWeek: number[] | null): Promise<void> {
    const { error } = await supabase
      .from("student_workout_assignments")
      .update({ days_of_week: daysOfWeek })
      .eq("id", assignmentId);

    if (error) throw error;
  },

  // ─── Consulta compatibilidad: ejercicios de la rutina primaria ───────────────

  async getStudentWorkout(studentId: string) {
    // Usa limit(1) en lugar de .single() para soportar múltiples activas
    const { data: assignments } = await supabase
      .from("student_workout_assignments")
      .select("*")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const assignment = assignments?.[0] ?? null;
    if (!assignment) return null;

    const { data: exercises } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_plan_id", assignment.workout_plan_id)
      .order("exercise_order");

    return exercises || [];
  },

  // ─── Exercise Library ─────────────────────────────────────────────────────

  async getLibraryExercises(): Promise<LibraryExercise[]> {
    const { data, error } = await supabase
      .from("exercise_library")
      .select("*")
      .order("name");

    if (error) throw error;
    return (data as LibraryExercise[]) || [];
  },

  async createLibraryExercise(exercise: {
    name: string;
    description?: string | null;
    muscleGroup?: string | null;
    videoUrl?: string | null;
  }): Promise<LibraryExercise> {
    const { data, error } = await supabase
      .from("exercise_library")
      .insert({
        name: exercise.name,
        description: exercise.description || null,
        muscle_group: exercise.muscleGroup || null,
        video_url: exercise.videoUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as LibraryExercise;
  },

  async deleteLibraryExercise(id: string) {
    const { error } = await supabase
      .from("exercise_library")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
