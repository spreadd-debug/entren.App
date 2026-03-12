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

  async getStudentWorkout(studentId: string) {
    const { data: assignment } = await supabase
      .from("student_workout_assignments")
      .select("*")
      .eq("student_id", studentId)
      .eq("active", true)
      .single();

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
