import { supabase } from "../db/supabase";

export const StudentPortalService = {
  async login(phone: string, code: string) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("telefono", phone)
      .eq("access_code", code.toUpperCase())
      .single();

    if (error) throw error;
    return data;
  },

  async getPortalData(studentId: string) {
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentError) throw studentError;

    const { data: assignment } = await supabase
      .from("student_workout_assignments")
      .select("*")
      .eq("student_id", studentId)
      .eq("active", true)
      .single();

    if (!assignment) {
      return {
        student,
        workoutPlan: null,
        exercises: [],
      };
    }

    const { data: workoutPlan } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("id", assignment.workout_plan_id)
      .single();

    const { data: exercises, error: exercisesError } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_plan_id", assignment.workout_plan_id)
      .order("exercise_order");

    if (exercisesError) throw exercisesError;

    return {
      student,
      workoutPlan: workoutPlan ?? null,
      exercises: exercises ?? [],
    };
  },
};