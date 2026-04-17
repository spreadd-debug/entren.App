import Groq from 'groq-sdk';
import { supabase } from '../db/supabase';

const MAX_ANALYSES_PER_WEEK = 3;

const SYSTEM_PROMPT = `Sos un asistente de planificacion para un Personal Trainer profesional.
Recibis datos de un alumno y tenes que darle al PT un analisis util con
sugerencias concretas y accionables.

REGLAS PRINCIPALES:

1. RESPETA EL PLAN DEL PT. Tenes su perfil de planificacion: la fase actual,
   el modelo de periodizacion, el metodo de progresion, las tecnicas que usa.
   Tus sugerencias deben estar ALINEADAS con eso. No sugieras cosas que
   contradigan su estrategia.
   - Si esta en fase de fuerza → no sugieras series de 15 reps.
   - Si usa RPE → habla en terminos de RPE, no de porcentajes.
   - Si usa doble progresion → sugeri subir reps antes de subir peso.
   - Si esta en deload → no sugieras subir cargas.

2. RESPETA LAS LESIONES. Si hay dolor de hombro, no sugieras press militar.
   Sugeri alternativas especificas y seguras para esa zona.

3. RESPETA EL CONTEXTO PERSONAL. Si manana tiene partido, no sugieras
   sesion intensa hoy. Si duerme mal, sugeri ajustar. Si los miercoles
   solo tiene 45min, no sugieras sesiones largas ese dia.

4. SE ESPECIFICO. Nombra ejercicios, pesos, reps, RPE.
   "Subile 2.5kg al press banca la proxima" > "considera aumentar la carga".
   "Proba sentadilla con pausa de 2seg al 80% (80kg)" > "cambia el estimulo".

5. PRIORIZA. Si hay algo preocupante (dolor, sueno bajo sostenido,
   alejandose del objetivo), mencionalo PRIMERO. Si hay algo positivo
   (PR, buena constancia, cerca de la meta), mencionalo tambien.

6. CORRELACIONA DATOS. "Rindio menos hoy, puede ser por las 5hs de sueno."
   "El volumen subio 15% en 3 semanas, considerar si es sostenible."
   "El peso subio pero la grasa bajo — esta ganando musculo, va bien."

7. CONSIDERA LA FASE Y SU TIMING. Si la fase actual esta por terminar
   segun la duracion planificada, mencionalo: "Estas en semana 3 de 4 del
   bloque de fuerza, la proxima semana arrancaria la transicion a potencia."

8. FORMATO DE SALIDA: Devolvé SOLO un objeto JSON válido con este schema exacto
   (sin texto fuera del JSON, sin markdown, sin code fences):

   {
     "resumen": "una oración (máx 25 palabras) que sintetice el estado del alumno hoy",
     "preocupaciones": ["bullet concreto 1", "bullet concreto 2"],
     "positivos": ["bullet concreto 1"],
     "sugerencias": ["acción específica con ejercicio/peso/reps/RPE", "acción 2"],
     "nota": "opcional — texto breve de cierre o null"
   }

   Reglas del JSON:
   - "resumen" y "sugerencias" son obligatorios. "sugerencias" debe tener al menos 1 item.
   - "preocupaciones" y "positivos" pueden ser arrays vacíos [] si no hay nada relevante.
   - Máximo 4 bullets por array. Cada bullet: una oración, directa, sin "considera"/"tal vez".
   - "nota" puede ser null si no hace falta. Usala solo para contexto extra, no para otra sugerencia.
   - Hablale al PT como un colega, sin disclaimers médicos ni relleno.

9. Si no hay perfil de planificacion (bloque "planning" vacio o con valores default),
   da sugerencias mas genericas basandote en los datos de progreso y entrenamiento.
   Esto es aceptable pero mencionalo en "nota".`;

function normalizeAnalysisJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    const normalized = {
      resumen: typeof parsed.resumen === 'string' ? parsed.resumen : '',
      preocupaciones: Array.isArray(parsed.preocupaciones)
        ? parsed.preocupaciones.filter((x: any) => typeof x === 'string' && x.trim())
        : [],
      positivos: Array.isArray(parsed.positivos)
        ? parsed.positivos.filter((x: any) => typeof x === 'string' && x.trim())
        : [],
      sugerencias: Array.isArray(parsed.sugerencias)
        ? parsed.sugerencias.filter((x: any) => typeof x === 'string' && x.trim())
        : [],
      nota: typeof parsed.nota === 'string' && parsed.nota.trim() ? parsed.nota : null,
    };
    if (!normalized.resumen && normalized.sugerencias.length === 0) {
      throw new Error('empty required fields');
    }
    return JSON.stringify(normalized);
  } catch {
    return JSON.stringify({
      resumen: raw.slice(0, 500),
      preocupaciones: [],
      positivos: [],
      sugerencias: [],
      nota: null,
    });
  }
}

interface AIContext {
  planning: any;
  progress: any;
  training: any;
  wellbeing: any;
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
  ): Promise<AIContext> {
    // Fetch all data in parallel
    const [
      studentRes,
      profileRes,
      goalsRes,
      anthroRes,
      sessionsRes,
      wellnessRes,
      nutritionRes,
    ] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('student_plan_profiles').select('*').eq('student_id', studentId).maybeSingle(),
      supabase.from('client_goals').select('*').eq('student_id', studentId).eq('status', 'active').limit(3),
      supabase.from('client_anthropometry').select('*').eq('student_id', studentId).order('measured_at', { ascending: false }).limit(5),
      supabase.from('workout_sessions').select('*').eq('student_id', studentId).eq('status', 'completed').order('session_date', { ascending: false }).limit(8),
      supabase.from('wellness_checkins').select('*').eq('student_id', studentId).order('checkin_date', { ascending: false }).limit(7),
      supabase.from('nutrition_plans').select('*').eq('student_id', studentId).eq('status', 'active').limit(1),
    ]);

    const student = studentRes.data;
    const profile = profileRes.data;
    const sessions = sessionsRes.data ?? [];

    // ─── BLOCK 1: Planning (from wizard profile) ─────────────────────────
    let planning: any = {};
    if (profile) {
      // Calculate phase week
      let phaseWeek: string | null = null;
      if (profile.phase_start_date && profile.phase_duration_weeks) {
        const startDate = new Date(profile.phase_start_date);
        const now = new Date();
        const weekNum = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        phaseWeek = `${Math.min(weekNum, profile.phase_duration_weeks)} de ${profile.phase_duration_weeks}`;
      }

      planning = {
        student_type: profile.student_type,
        sport: profile.sport,
        sport_season: profile.sport_season,
        experience: profile.experience_level,
        age: profile.age,
        sex: profile.biological_sex,
        injuries: profile.injuries_limitations,
        objective: profile.primary_objective,
        secondary_objective: profile.secondary_objective,
        goal: profile.numeric_goal,
        timeframe: profile.goal_timeframe,
        current_phase: profile.current_phase,
        phase_week: phaseWeek,
        next_phase: profile.next_phase,
        periodization: profile.periodization_model,
        progression_method: profile.progression_method,
        rep_range: profile.rep_range,
        special_techniques: profile.special_techniques,
        methodology_notes: profile.methodology_notes,
        nutrition: profile.nutrition_strategy,
        nutrition_detail: profile.nutrition_detail,
        lifestyle: profile.lifestyle_factors,
        equipment: profile.equipment_restrictions,
        schedule: profile.schedule_considerations,
        available_days: profile.available_days,
        sessions_per_week: profile.sessions_per_week,
        session_duration_min: profile.session_duration_min,
      };
    }

    // ─── BLOCK 2: Progress ───────────────────────────────────────────────

    // Measurements
    const measurements = (anthroRes.data ?? []).map((a: any) => ({
      date: a.measured_at,
      weight: a.weight_kg,
      fat_pct: a.body_fat_pct,
      muscle_kg: a.muscle_mass_kg,
    }));

    // Gather all exercises + sets for sessions (for PRs, progression, stagnation)
    const sessionExerciseMap = new Map<string, any[]>();
    const allExIds: string[] = [];

    for (const sess of sessions) {
      const { data: exercises } = await supabase
        .from('workout_session_exercises')
        .select('*, workout_exercises(exercise_name, exercise_order)')
        .eq('session_id', sess.id);

      sessionExerciseMap.set(sess.id, exercises ?? []);
      for (const e of exercises ?? []) allExIds.push(e.id);
    }

    let allSets: any[] = [];
    if (allExIds.length > 0) {
      // Fetch in chunks of 50 to avoid URL length limits
      for (let i = 0; i < allExIds.length; i += 50) {
        const chunk = allExIds.slice(i, i + 50);
        const { data } = await supabase
          .from('session_sets')
          .select('*')
          .in('session_exercise_id', chunk)
          .order('set_number', { ascending: true });
        allSets = allSets.concat(data ?? []);
      }
    }

    const setsByExId = new Map<string, any[]>();
    for (const s of allSets) {
      const arr = setsByExId.get(s.session_exercise_id) ?? [];
      arr.push(s);
      setsByExId.set(s.session_exercise_id, arr);
    }

    // Personal records
    const prMap = new Map<string, { exercise: string; weight: number; date: string }>();
    // Exercise history for progression/stagnation analysis
    const exerciseTimeline = new Map<string, Array<{ date: string; weight: number; reps: number; completed: boolean }>>();

    for (const sess of sessions) {
      const exercises = sessionExerciseMap.get(sess.id) ?? [];
      for (const ex of exercises) {
        const name = ex.workout_exercises?.exercise_name ?? '';
        if (!name) continue;
        const exSets = setsByExId.get(ex.id) ?? [];

        for (const s of exSets) {
          const weight = s.weight_kg ?? 0;
          // PRs
          const existing = prMap.get(name);
          if (!existing || weight > existing.weight) {
            prMap.set(name, { exercise: name, weight, date: sess.session_date });
          }
          // Timeline
          const timeline = exerciseTimeline.get(name) ?? [];
          timeline.push({
            date: sess.session_date,
            weight,
            reps: s.reps_done ?? 0,
            completed: s.completed,
          });
          exerciseTimeline.set(name, timeline);
        }
      }
    }

    // Compute progression and stagnation
    const progressing: any[] = [];
    const stagnant: any[] = [];

    for (const [name, timeline] of exerciseTimeline.entries()) {
      if (timeline.length < 2) continue;
      // Group by date, get max weight per date
      const byDate = new Map<string, number>();
      for (const t of timeline) {
        const cur = byDate.get(t.date) ?? 0;
        if (t.weight > cur) byDate.set(t.date, t.weight);
      }
      const dates = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (dates.length < 2) continue;

      const first = dates[0][1];
      const last = dates[dates.length - 1][1];

      if (last > first) {
        progressing.push({ exercise: name, from: first, to: last, period: `${dates.length} sesiones` });
      } else if (last === first && dates.length >= 3) {
        stagnant.push({ exercise: name, weight: last, sessions_stuck: dates.length });
      }
    }

    // Weekly volume (last 4 weeks)
    const weeklyVolume: any[] = [];
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentCompletedSessions = sessions.filter(
      (s: any) => new Date(s.session_date) >= fourWeeksAgo
    );
    const weekMap = new Map<string, number>();
    for (const s of recentCompletedSessions) {
      const d = new Date(s.session_date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + (s.total_volume ?? 0));
    }
    for (const [week, volume] of [...weekMap.entries()].sort()) {
      weeklyVolume.push({ week, volume });
    }

    // Session frequency
    const sessionsLast4Weeks = recentCompletedSessions.length;
    const weeksWithData = weekMap.size || 1;

    const progress = {
      student_name: student ? `${student.nombre ?? ''} ${student.apellido ?? ''}`.trim() : 'Alumno',
      measurements,
      personal_records: Array.from(prMap.values()).filter((p) => p.weight > 0).slice(0, 8),
      weekly_volume: weeklyVolume,
      sessions_last_4_weeks: sessionsLast4Weeks,
      sessions_per_week_avg: Math.round((sessionsLast4Weeks / weeksWithData) * 10) / 10,
      sessions_per_week_planned: profile?.sessions_per_week ?? null,
      progressing: progressing.slice(0, 5),
      stagnant: stagnant.slice(0, 5),
    };

    // ─── BLOCK 3: Training ───────────────────────────────────────────────

    let currentSession: any = null;
    const recentSessionsSummary: any[] = [];
    const exerciseHistory = new Map<string, any[]>();

    for (const sess of sessions) {
      const exercises = sessionExerciseMap.get(sess.id) ?? [];
      const sortedExercises = [...exercises].sort(
        (a: any, b: any) => (a.workout_exercises?.exercise_order ?? 0) - (b.workout_exercises?.exercise_order ?? 0)
      );

      const exerciseData = sortedExercises.map((ex: any) => {
        const exSets = setsByExId.get(ex.id) ?? [];
        const name = ex.workout_exercises?.exercise_name ?? 'Ejercicio';
        return {
          name,
          sets: exSets.map((s: any) => ({
            weight: s.weight_kg ?? 0,
            reps: s.reps_done ?? 0,
            completed: s.completed,
          })),
          max_weight: Math.max(0, ...exSets.map((s: any) => s.weight_kg ?? 0)),
        };
      });

      if (sessionId && sess.id === sessionId) {
        let routineName: string | undefined;
        if (sess.workout_plan_id) {
          const { data: plan } = await supabase
            .from('workout_plans')
            .select('name')
            .eq('id', sess.workout_plan_id)
            .single();
          routineName = plan?.name;
        }

        const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const sessDate = new Date(sess.session_date);

        currentSession = {
          date: sess.session_date,
          day_of_week: dayNames[sessDate.getDay()],
          routine_name: routineName,
          exercises: exerciseData,
          total_volume: sess.total_volume ?? 0,
          pt_notes: sess.pt_notes ?? null,
        };

        // Build exercise history for exercises in current session
        for (const ex of exerciseData) {
          const history: any[] = [];
          for (const prevSess of sessions) {
            if (prevSess.id === sess.id) continue;
            const prevExercises = sessionExerciseMap.get(prevSess.id) ?? [];
            const match = prevExercises.find((pe: any) =>
              pe.workout_exercises?.exercise_name === ex.name
            );
            if (match) {
              const prevSets = setsByExId.get(match.id) ?? [];
              const maxW = Math.max(0, ...prevSets.map((s: any) => s.weight_kg ?? 0));
              const setsStr = prevSets.map((s: any) => s.reps_done ?? 0).join(',');
              history.push({
                date: prevSess.session_date,
                weight: maxW,
                sets: setsStr,
                completed: prevSets.every((s: any) => s.completed),
              });
            }
          }
          if (history.length > 0) {
            exerciseHistory.set(ex.name, history.slice(0, 3));
          }
        }
      } else {
        const highlights = exerciseData
          .slice(0, 3)
          .map((e: any) => {
            const topSet = e.sets[0];
            return topSet ? `${e.name} ${topSet.weight}kg×${topSet.reps}` : e.name;
          })
          .join(', ');

        recentSessionsSummary.push({
          date: sess.session_date,
          routine: null,
          highlights,
          volume: sess.total_volume ?? 0,
        });
      }
    }

    const training: any = {
      current_session: currentSession,
      recent_sessions: recentSessionsSummary.slice(0, 5),
    };
    if (exerciseHistory.size > 0) {
      training.exercise_history = Object.fromEntries(exerciseHistory);
    }

    // ─── BLOCK 4: Wellbeing ──────────────────────────────────────────────

    const checkins = (wellnessRes.data ?? []).map((c: any) => ({
      date: c.checkin_date,
      energy: c.energy,
      sleep_quality: c.sleep_quality,
      mood: c.mood,
      soreness: c.soreness,
      note: c.notes ?? null,
    }));

    // Compute weekly averages
    const weeklyAvg: Record<string, number> = {};
    if (checkins.length > 0) {
      const keys = ['energy', 'sleep_quality', 'mood', 'soreness'] as const;
      for (const key of keys) {
        const vals = checkins.map((c: any) => c[key]).filter((v: any) => v != null);
        weeklyAvg[key] = vals.length > 0 ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : 0;
      }
    }

    // Derive flags
    const flags: string[] = [];
    if (weeklyAvg.sleep_quality && weeklyAvg.sleep_quality < 2.5) {
      flags.push(`Sueno bajo esta semana (prom ${weeklyAvg.sleep_quality})`);
    }
    if (weeklyAvg.energy && weeklyAvg.energy < 2.5) {
      flags.push(`Energia baja esta semana (prom ${weeklyAvg.energy})`);
    }
    if (weeklyAvg.soreness && weeklyAvg.soreness > 3.5) {
      flags.push(`Dolor muscular alto esta semana (prom ${weeklyAvg.soreness})`);
    }
    // Check for pain notes
    const todayCheckin = checkins[0];
    if (todayCheckin?.note) {
      flags.push(`Nota del alumno: "${todayCheckin.note}"`);
    }

    // Nutrition plan
    const activePlan = nutritionRes.data?.[0];
    const nutritionData = activePlan
      ? {
          calories: activePlan.calories_target,
          protein: activePlan.protein_g,
          carbs: activePlan.carbs_g,
          fat: activePlan.fat_g,
        }
      : null;

    const wellbeing = {
      recent_checkins: checkins,
      weekly_avg: Object.keys(weeklyAvg).length > 0 ? weeklyAvg : null,
      nutrition: nutritionData,
      flags,
    };

    return { planning, progress, training, wellbeing };
  },

  async generateAnalysis(
    gymId: string,
    studentId: string,
    sessionId?: string,
  ): Promise<{ content: string; tokens_input: number; tokens_output: number; model: string; context_json: any }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no esta configurada en el servidor');
    }

    // Rate limit check
    const weekCount = await this.countThisWeek(studentId);
    if (weekCount >= MAX_ANALYSES_PER_WEEK) {
      throw new Error(`Limite de ${MAX_ANALYSES_PER_WEEK} analisis por semana alcanzado para este alumno`);
    }

    // Gather structured context
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
      max_tokens: 700,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content ?? '';
    const content = normalizeAnalysisJson(rawContent);
    const usage = response.usage;

    return {
      content,
      tokens_input: usage?.prompt_tokens ?? 0,
      tokens_output: usage?.completion_tokens ?? 0,
      model,
      context_json: context,
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
        context_json: result.context_json,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
