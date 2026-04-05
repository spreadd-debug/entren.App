import Groq from 'groq-sdk';
import { supabase } from '../db/supabase';

const MAX_ANALYSES_PER_WEEK = 3;

const SYSTEM_PROMPT = `Sos un asistente de planificación para un Personal Trainer profesional.
Tu trabajo es analizar los datos de un alumno y darle al PT un resumen útil con sugerencias accionables.

Reglas:
- Hablale al PT como un colega, directo y sin vueltas.
- Sé específico: nombrá ejercicios, pesos, números. No seas genérico.
- Priorizá lo accionable: "subile 2.5kg al press banca" > "considerá aumentar la carga".
- Si hay algo preocupante (dolor, mal sueño, alejándose del objetivo), mencionalo primero.
- Si hay algo para felicitar (PR, constancia, cerca del objetivo), mencionalo.
- Máximo 4-6 oraciones. Rápido de leer.
- No des disclaimers médicos. El PT es el profesional, vos sos su asistente de datos.
- Correlacioná datos: "rindió menos hoy, puede ser por las 5hs de sueño".
- Sugerí variantes de ejercicios concretas cuando haya estancamiento.
- Sugerí ajustes de peso específicos (ej: "subir a 52.5kg", "bajar a 70kg y meter más reps").
- Respondé siempre en español.`;

interface AnalysisContext {
  student_name: string;
  objective?: string;
  target_weight?: number;
  measurements?: Array<{ date: string; weight?: number; fat_pct?: number; muscle_kg?: number }>;
  current_session?: {
    date: string;
    routine_name?: string;
    exercises: Array<{
      name: string;
      sets: Array<{ weight: number; reps: number; completed: boolean }>;
    }>;
    total_volume: number;
    pt_notes?: string;
  };
  recent_sessions?: Array<{
    date: string;
    routine?: string;
    volume: number;
    exercises?: Array<{ name: string; max_weight: number; completed_all_reps: boolean }>;
  }>;
  recent_checkins?: Array<{
    date: string;
    energy: number;
    sleep: number;
    mood: number;
    soreness: number;
  }>;
  personal_records?: Array<{ exercise: string; weight: number; date: string }>;
  nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  active_alerts?: string[];
}

export const AIAnalysisServerService = {

  async countThisWeek(studentId: string): Promise<number> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('ai_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', monday.toISOString());

    if (error) throw error;
    return count ?? 0;
  },

  async gatherContext(
    gymId: string,
    studentId: string,
    sessionId?: string,
  ): Promise<AnalysisContext> {
    // Fetch all data in parallel
    const [
      studentRes,
      goalsRes,
      anthroRes,
      sessionsRes,
      wellnessRes,
      nutritionRes,
    ] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('client_goals').select('*').eq('student_id', studentId).eq('status', 'active').limit(3),
      supabase.from('client_anthropometry').select('*').eq('student_id', studentId).order('measured_at', { ascending: false }).limit(3),
      supabase.from('workout_sessions').select('*').eq('student_id', studentId).eq('status', 'completed').order('session_date', { ascending: false }).limit(6),
      supabase.from('wellness_checkins').select('*').eq('student_id', studentId).order('checkin_date', { ascending: false }).limit(7),
      supabase.from('nutrition_plans').select('*').eq('student_id', studentId).eq('status', 'active').limit(1),
    ]);

    const student = studentRes.data;
    const studentName = student ? `${student.nombre ?? ''} ${student.apellido ?? ''}`.trim() : 'Alumno';

    // Build goal info
    const goals = goalsRes.data ?? [];
    const primaryGoal = goals[0];
    const goalLabels: Record<string, string> = {
      lose_weight: 'Bajar de peso',
      gain_muscle: 'Ganar musculo',
      strength: 'Fuerza',
      endurance: 'Resistencia',
      general_fitness: 'Fitness general',
    };

    // Build measurements
    const measurements = (anthroRes.data ?? []).map((a: any) => ({
      date: a.measured_at,
      weight: a.weight_kg,
      fat_pct: a.body_fat_pct,
      muscle_kg: a.muscle_mass_kg,
    }));

    // Build sessions with exercises
    const sessions = sessionsRes.data ?? [];
    const recentSessions: AnalysisContext['recent_sessions'] = [];
    let currentSession: AnalysisContext['current_session'] | undefined;

    for (const sess of sessions) {
      // Get exercises and sets for this session
      const { data: exercises } = await supabase
        .from('workout_session_exercises')
        .select('*, workout_exercises(exercise_name, exercise_order)')
        .eq('session_id', sess.id);

      const exIds = (exercises ?? []).map((e: any) => e.id);
      let sets: any[] = [];
      if (exIds.length > 0) {
        const { data } = await supabase
          .from('session_sets')
          .select('*')
          .in('session_exercise_id', exIds)
          .order('set_number', { ascending: true });
        sets = data ?? [];
      }

      const setsByEx = new Map<string, any[]>();
      for (const s of sets) {
        const arr = setsByEx.get(s.session_exercise_id) ?? [];
        arr.push(s);
        setsByEx.set(s.session_exercise_id, arr);
      }

      const exerciseData = (exercises ?? [])
        .sort((a: any, b: any) => (a.workout_exercises?.exercise_order ?? 0) - (b.workout_exercises?.exercise_order ?? 0))
        .map((ex: any) => {
          const exSets = setsByEx.get(ex.id) ?? [];
          return {
            name: ex.workout_exercises?.exercise_name ?? 'Ejercicio',
            max_weight: Math.max(0, ...exSets.map((s: any) => s.weight_kg ?? 0)),
            completed_all_reps: exSets.every((s: any) => s.completed),
            sets: exSets.map((s: any) => ({
              weight: s.weight_kg ?? 0,
              reps: s.reps_done ?? 0,
              completed: s.completed,
            })),
          };
        });

      if (sessionId && sess.id === sessionId) {
        // Get the workout plan name
        let routineName: string | undefined;
        if (sess.workout_plan_id) {
          const { data: plan } = await supabase
            .from('workout_plans')
            .select('name')
            .eq('id', sess.workout_plan_id)
            .single();
          routineName = plan?.name;
        }

        currentSession = {
          date: sess.session_date,
          routine_name: routineName,
          exercises: exerciseData,
          total_volume: sess.total_volume ?? 0,
          pt_notes: sess.pt_notes ?? undefined,
        };
      } else {
        recentSessions.push({
          date: sess.session_date,
          volume: sess.total_volume ?? 0,
          exercises: exerciseData.map((e: any) => ({
            name: e.name,
            max_weight: e.max_weight,
            completed_all_reps: e.completed_all_reps,
          })),
        });
      }
    }

    // Wellness check-ins
    const checkins = (wellnessRes.data ?? []).map((c: any) => ({
      date: c.checkin_date,
      energy: c.energy,
      sleep: c.sleep_quality,
      mood: c.mood,
      soreness: c.soreness,
    }));

    // Nutrition
    const activePlan = nutritionRes.data?.[0];
    const nutrition = activePlan
      ? {
          calories: activePlan.calories_target,
          protein: activePlan.protein_g,
          carbs: activePlan.carbs_g,
          fat: activePlan.fat_g,
        }
      : undefined;

    // Find PRs: max weight per exercise across all sessions
    const prMap = new Map<string, { exercise: string; weight: number; date: string }>();
    for (const sess of sessions) {
      const { data: exercises } = await supabase
        .from('workout_session_exercises')
        .select('id, workout_exercises(exercise_name)')
        .eq('session_id', sess.id);

      const exIds = (exercises ?? []).map((e: any) => e.id);
      if (!exIds.length) continue;

      const { data: setsData } = await supabase
        .from('session_sets')
        .select('session_exercise_id, weight_kg')
        .in('session_exercise_id', exIds);

      for (const s of setsData ?? []) {
        const ex: any = (exercises ?? []).find((e: any) => e.id === s.session_exercise_id);
        const name = ex?.workout_exercises?.exercise_name ?? '';
        const weight = s.weight_kg ?? 0;
        const existing = prMap.get(name);
        if (!existing || weight > existing.weight) {
          prMap.set(name, { exercise: name, weight, date: sess.session_date });
        }
      }
    }

    return {
      student_name: studentName,
      objective: primaryGoal ? (goalLabels[primaryGoal.goal_type] ?? primaryGoal.goal_type) : undefined,
      target_weight: primaryGoal?.target_value ? parseFloat(primaryGoal.target_value) : undefined,
      measurements,
      current_session: currentSession,
      recent_sessions: recentSessions,
      recent_checkins: checkins,
      personal_records: Array.from(prMap.values()).filter((p) => p.weight > 0).slice(0, 5),
      nutrition,
      active_alerts: [], // Could be computed server-side but we keep it simple
    };
  },

  async generateAnalysis(
    gymId: string,
    studentId: string,
    sessionId?: string,
  ): Promise<{ content: string; tokens_input: number; tokens_output: number; model: string }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no esta configurada en el servidor');
    }

    // Rate limit check
    const weekCount = await this.countThisWeek(studentId);
    if (weekCount >= MAX_ANALYSES_PER_WEEK) {
      throw new Error(`Limite de ${MAX_ANALYSES_PER_WEEK} analisis por semana alcanzado para este alumno`);
    }

    // Gather context
    const context = await this.gatherContext(gymId, studentId, sessionId);

    // Build prompt
    const userMessage = `Analiza los siguientes datos del alumno y dame tu resumen con sugerencias:\n\n${JSON.stringify(context, null, 2)}`;

    // Call Groq API
    const groq = new Groq({ apiKey });
    const model = 'llama-3.1-8b-instant';

    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage;

    return {
      content,
      tokens_input: usage?.prompt_tokens ?? 0,
      tokens_output: usage?.completion_tokens ?? 0,
      model,
    };
  },

  async analyzeAndSave(
    gymId: string,
    studentId: string,
    sessionId?: string,
  ): Promise<any> {
    const result = await this.generateAnalysis(gymId, studentId, sessionId);

    const { data, error } = await supabase
      .from('ai_analyses')
      .insert([{
        gym_id: gymId,
        student_id: studentId,
        session_id: sessionId ?? null,
        analysis_type: sessionId ? 'post_session' : 'weekly_review',
        content: result.content,
        model_used: result.model,
        tokens_used: result.tokens_input + result.tokens_output,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
