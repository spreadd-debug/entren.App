import { supabase } from "../db/supabase";
import { WorkoutOption, WorkoutSession, WorkoutSessionExercise, WorkoutUpdateRequest } from "../../shared/types";

const todayDate = (): string => new Date().toLocaleDateString("sv-SE");

export const StudentPortalService = {

  // ─── Login con teléfono + código ──────────────────────────────────────────────

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

  // ─── Datos completos del portal (nueva versión) ───────────────────────────────

  /**
   * Carga todos los datos que necesita el portal del alumno en una sola llamada:
   *   - Datos del alumno
   *   - Todas las opciones de rutina disponibles (con info del plan)
   *   - Sesión de hoy + estado del checklist (si existe)
   *   - Solicitud de actualización pendiente (si existe)
   */
  async getFullPortalData(studentId: string): Promise<{
    student: any;
    options: WorkoutOption[];
    todaySession: { session: WorkoutSession; items: WorkoutSessionExercise[] } | null;
    pendingRequest: WorkoutUpdateRequest | null;
  }> {
    // 1. Alumno + gym_type del gimnasio
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*, gym:gyms(gym_type)")
      .eq("id", studentId)
      .single();

    if (studentError) throw studentError;

    // Flatten gym_type onto the student object
    if (student) {
      (student as any).gym_type = (student as any).gym?.gym_type ?? 'gym';
      delete (student as any).gym;
    }

    // 2. Todas las opciones activas con info del plan
    const { data: assignments, error: assignmentsError } = await supabase
      .from("student_workout_assignments")
      .select("*, workout_plans(id, name, description, updated_at)")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("assigned_at", { ascending: false });

    if (assignmentsError) {
      console.error("[getFullPortalData] assignments error:", assignmentsError);
    }

    const options: WorkoutOption[] = (assignments ?? []).map((row: any) => ({
      id: row.id,
      gym_id: row.gym_id,
      student_id: row.student_id,
      workout_plan_id: row.workout_plan_id,
      plan_name: row.workout_plans?.name ?? "Sin nombre",
      plan_description: row.workout_plans?.description ?? null,
      updated_at: row.assigned_at,
      created_at: row.assigned_at,
      days_of_week: row.days_of_week ?? null,
    }));

    // 3. Sesión de hoy
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("session_date", todayDate())
      .limit(1);

    const todaySessionRaw = sessions?.[0] ?? null;
    let todaySession: { session: WorkoutSession; items: WorkoutSessionExercise[] } | null = null;

    if (todaySessionRaw) {
      const { data: rawItems } = await supabase
        .from("workout_session_exercises")
        .select("*, workout_exercises(exercise_name, sets, reps, weight, rest_seconds, notes, video_url, exercise_order)")
        .eq("session_id", todaySessionRaw.id);

      const items: WorkoutSessionExercise[] = (rawItems ?? [])
        .map((item: any) => ({
          id: item.id,
          session_id: item.session_id,
          workout_exercise_id: item.workout_exercise_id,
          completed: item.completed,
          created_at: item.created_at,
          exercise_name: item.workout_exercises?.exercise_name ?? item.exercise_name_cache ?? "",
          sets: item.workout_exercises?.sets ?? item.sets_planned_cache ?? null,
          reps: item.workout_exercises?.reps ?? item.reps_planned_cache ?? null,
          weight: item.workout_exercises?.weight ?? item.weight_planned_cache ?? null,
          rest_seconds: item.workout_exercises?.rest_seconds ?? null,
          notes: item.workout_exercises?.notes ?? null,
          video_url: item.workout_exercises?.video_url ?? null,
          exercise_order: item.workout_exercises?.exercise_order ?? item.exercise_order_cache ?? 0,
          routine_exercise_id: item.routine_exercise_id ?? null,
        }))
        .sort((a: WorkoutSessionExercise, b: WorkoutSessionExercise) => a.exercise_order - b.exercise_order);

      todaySession = { session: todaySessionRaw as WorkoutSession, items };
    }

    // 4. Solicitud de actualización pendiente
    const { data: requests } = await supabase
      .from("workout_update_requests")
      .select("*")
      .eq("student_id", studentId)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false })
      .limit(1);

    const pendingRequest = (requests?.[0] ?? null) as WorkoutUpdateRequest | null;

    return { student, options, todaySession, pendingRequest };
  },

  // ─── Retrocompat: getPortalData (utilizado por versiones anteriores) ──────────

  async getPortalData(studentId: string) {
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentError) throw studentError;

    const { data: assignments } = await supabase
      .from("student_workout_assignments")
      .select("*")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const assignment = assignments?.[0] ?? null;
    if (!assignment) {
      return { student, workoutPlan: null, exercises: [] };
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

    return { student, workoutPlan: workoutPlan ?? null, exercises: exercises ?? [] };
  },
};