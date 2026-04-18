import { supabase } from '../../db/supabase';
import {
  NutritionPlan,
  NutritionPlanMeal,
  NutritionPlanFood,
  NutritionCheckin,
  NutritionDetailLevel,
  NutritionActivityLevel,
  NutritionTmbGoalType,
  MealType,
} from '../../../shared/types';

// ─── Tipos compuestos ────────────────────────────────────────────────────────

export interface NutritionPlanMealWithFoods extends NutritionPlanMeal {
  foods: NutritionPlanFood[];
}

export interface NutritionPlanFull extends NutritionPlan {
  meals: NutritionPlanMealWithFoods[];
}

export interface NutritionDailyView {
  plan: NutritionPlan;
  meals: NutritionPlanMealWithFoods[];
  checkins: NutritionCheckin[];
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface CreateMealInput {
  day_of_week?: number | null;
  meal_type: MealType;
  order_index?: number;
  name?: string | null;
  time_hint?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
  foods?: CreateFoodInput[];
}

export interface CreateFoodInput {
  food_name: string;
  amount?: number | null;
  unit?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
  order_index?: number;
}

export interface CreatePlanInput {
  gym_id: string;
  student_id: string;
  title: string;
  description?: string | null;
  detail_level: NutritionDetailLevel;

  calories_target?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  water_ml?: number | null;

  show_calories?: boolean;
  show_protein?: boolean;
  show_carbs?: boolean;
  show_fat?: boolean;
  show_fiber?: boolean;
  show_water?: boolean;

  tmb_kcal?: number | null;
  tdee_kcal?: number | null;
  activity_level?: NutritionActivityLevel | null;
  tmb_goal_type?: NutritionTmbGoalType | null;
  goal_adjustment_pct?: number | null;
  calc_weight_kg?: number | null;
  calc_height_cm?: number | null;
  calc_age?: number | null;
  calc_biological_sex?: 'male' | 'female' | null;

  meals?: CreateMealInput[];
}

export type UpdatePlanInput = Partial<
  Omit<CreatePlanInput, 'gym_id' | 'student_id' | 'meals'>
> & { status?: 'active' | 'archived' };

// ─── Utils ───────────────────────────────────────────────────────────────────

const todayDate = (): string => new Date().toLocaleDateString('sv-SE');

// ─── Service ─────────────────────────────────────────────────────────────────

export const NutritionPlanService = {

  /** Planes de un alumno (activos primero, más recientes primero) */
  async getByStudent(studentId: string): Promise<NutritionPlan[]> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('status', { ascending: true })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as NutritionPlan[];
  },

  /** Plan activo del alumno con sus meals y foods */
  async getActivePlan(studentId: string): Promise<NutritionPlanFull | null> {
    const { data: plans } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1);

    const plan = (plans ?? [])[0] as NutritionPlan | undefined;
    if (!plan) return null;

    return this.getFullPlan(plan.id, plan);
  },

  /** Plan completo por id (plan + meals + foods) */
  async getFullPlan(planId: string, cachedPlan?: NutritionPlan): Promise<NutritionPlanFull | null> {
    let plan = cachedPlan;
    if (!plan) {
      const { data } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('id', planId)
        .single();
      plan = data as NutritionPlan | undefined;
    }
    if (!plan) return null;

    const { data: meals } = await supabase
      .from('nutrition_plan_meals')
      .select('*')
      .eq('plan_id', planId)
      .order('day_of_week', { ascending: true, nullsFirst: true })
      .order('order_index', { ascending: true });

    const mealList = (meals ?? []) as NutritionPlanMeal[];
    if (mealList.length === 0) return { ...plan, meals: [] };

    const { data: foods } = await supabase
      .from('nutrition_plan_foods')
      .select('*')
      .in('meal_id', mealList.map(m => m.id))
      .order('order_index', { ascending: true });

    const foodList = (foods ?? []) as NutritionPlanFood[];
    const foodsByMeal = new Map<string, NutritionPlanFood[]>();
    for (const f of foodList) {
      const arr = foodsByMeal.get(f.meal_id) ?? [];
      arr.push(f);
      foodsByMeal.set(f.meal_id, arr);
    }

    return {
      ...plan,
      meals: mealList.map(m => ({ ...m, foods: foodsByMeal.get(m.id) ?? [] })),
    };
  },

  /**
   * Vista del día para el alumno: plan activo + meals aplicables al día + foods + checkins.
   * Filtra meals al day_of_week del `date` (o null = todos los días).
   */
  async getDailyView(studentId: string, date: string = todayDate()): Promise<NutritionDailyView | null> {
    const full = await this.getActivePlan(studentId);
    if (!full) return null;

    const dow = new Date(date + 'T12:00:00').getDay();
    const todayMeals = full.meals.filter(m => m.day_of_week === null || m.day_of_week === dow);

    const { data: checkins } = await supabase
      .from('nutrition_checkins')
      .select('*')
      .eq('student_id', studentId)
      .eq('plan_id', full.id)
      .eq('checkin_date', date);

    return {
      plan: full,
      meals: todayMeals,
      checkins: (checkins ?? []) as NutritionCheckin[],
    };
  },

  /** Crear plan con meals y foods anidados en una sola operación */
  async createPlan(input: CreatePlanInput): Promise<NutritionPlanFull> {
    const { meals, ...planData } = input;

    const { data: plan, error: planErr } = await supabase
      .from('nutrition_plans')
      .insert({
        gym_id: planData.gym_id,
        student_id: planData.student_id,
        title: planData.title,
        description: planData.description ?? null,
        detail_level: planData.detail_level,
        calories_target: planData.calories_target ?? null,
        protein_g: planData.protein_g ?? null,
        carbs_g: planData.carbs_g ?? null,
        fat_g: planData.fat_g ?? null,
        fiber_g: planData.fiber_g ?? null,
        water_ml: planData.water_ml ?? null,
        show_calories: planData.show_calories ?? true,
        show_protein: planData.show_protein ?? true,
        show_carbs: planData.show_carbs ?? true,
        show_fat: planData.show_fat ?? true,
        show_fiber: planData.show_fiber ?? false,
        show_water: planData.show_water ?? false,
        tmb_kcal: planData.tmb_kcal ?? null,
        tdee_kcal: planData.tdee_kcal ?? null,
        activity_level: planData.activity_level ?? null,
        tmb_goal_type: planData.tmb_goal_type ?? null,
        goal_adjustment_pct: planData.goal_adjustment_pct ?? null,
        calc_weight_kg: planData.calc_weight_kg ?? null,
        calc_height_cm: planData.calc_height_cm ?? null,
        calc_age: planData.calc_age ?? null,
        calc_biological_sex: planData.calc_biological_sex ?? null,
      })
      .select()
      .single();

    if (planErr) throw planErr;
    const createdPlan = plan as NutritionPlan;

    if (!meals || meals.length === 0) {
      return { ...createdPlan, meals: [] };
    }

    // Insert meals en orden — necesitamos los IDs para los foods
    const createdMeals: NutritionPlanMealWithFoods[] = [];
    for (const m of meals) {
      const createdMeal = await this.addMeal(createdPlan.id, m);
      createdMeals.push(createdMeal);
    }

    return { ...createdPlan, meals: createdMeals };
  },

  /** Actualizar metadata del plan (no toca meals/foods) */
  async updatePlan(planId: string, updates: UpdatePlanInput): Promise<NutritionPlan> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data as NutritionPlan;
  },

  /** Soft delete: archivar plan */
  async archivePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;
  },

  /** Reactivar un plan archivado */
  async unarchivePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plans')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;
  },

  /** Hard delete (cascade elimina meals, foods y checkins) */
  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },

  // ── Meals ──────────────────────────────────────────────────────────────────

  async addMeal(planId: string, input: CreateMealInput): Promise<NutritionPlanMealWithFoods> {
    const { foods, ...mealData } = input;
    const { data: meal, error } = await supabase
      .from('nutrition_plan_meals')
      .insert({
        plan_id: planId,
        day_of_week: mealData.day_of_week ?? null,
        meal_type: mealData.meal_type,
        order_index: mealData.order_index ?? 0,
        name: mealData.name ?? null,
        time_hint: mealData.time_hint ?? null,
        calories: mealData.calories ?? null,
        protein_g: mealData.protein_g ?? null,
        carbs_g: mealData.carbs_g ?? null,
        fat_g: mealData.fat_g ?? null,
        notes: mealData.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    const createdMeal = meal as NutritionPlanMeal;

    const createdFoods: NutritionPlanFood[] = [];
    if (foods && foods.length > 0) {
      const rows = foods.map((f, i) => ({
        meal_id: createdMeal.id,
        food_name: f.food_name,
        amount: f.amount ?? null,
        unit: f.unit ?? null,
        calories: f.calories ?? null,
        protein_g: f.protein_g ?? null,
        carbs_g: f.carbs_g ?? null,
        fat_g: f.fat_g ?? null,
        notes: f.notes ?? null,
        order_index: f.order_index ?? i,
      }));
      const { data: inserted, error: foodErr } = await supabase
        .from('nutrition_plan_foods')
        .insert(rows)
        .select();
      if (foodErr) throw foodErr;
      createdFoods.push(...((inserted ?? []) as NutritionPlanFood[]));
    }

    return { ...createdMeal, foods: createdFoods };
  },

  async updateMeal(mealId: string, updates: Partial<Omit<NutritionPlanMeal, 'id' | 'plan_id' | 'created_at'>>): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plan_meals')
      .update(updates)
      .eq('id', mealId);
    if (error) throw error;
  },

  async deleteMeal(mealId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plan_meals')
      .delete()
      .eq('id', mealId);
    if (error) throw error;
  },

  async reorderMeals(planId: string, orderedMealIds: string[]): Promise<void> {
    // Update order_index en batch
    await Promise.all(orderedMealIds.map((id, idx) =>
      supabase.from('nutrition_plan_meals').update({ order_index: idx }).eq('id', id).eq('plan_id', planId),
    ));
  },

  // ── Foods ──────────────────────────────────────────────────────────────────

  async addFood(mealId: string, input: CreateFoodInput): Promise<NutritionPlanFood> {
    const { data, error } = await supabase
      .from('nutrition_plan_foods')
      .insert({
        meal_id: mealId,
        food_name: input.food_name,
        amount: input.amount ?? null,
        unit: input.unit ?? null,
        calories: input.calories ?? null,
        protein_g: input.protein_g ?? null,
        carbs_g: input.carbs_g ?? null,
        fat_g: input.fat_g ?? null,
        notes: input.notes ?? null,
        order_index: input.order_index ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as NutritionPlanFood;
  },

  async updateFood(foodId: string, updates: Partial<Omit<NutritionPlanFood, 'id' | 'meal_id' | 'created_at'>>): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plan_foods')
      .update(updates)
      .eq('id', foodId);
    if (error) throw error;
  },

  async deleteFood(foodId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plan_foods')
      .delete()
      .eq('id', foodId);
    if (error) throw error;
  },

  // ── Checkins (adherencia del alumno) ───────────────────────────────────────

  /**
   * Toggle adherencia de una comida en una fecha. Si ya existe, flippea `completed`.
   * Para plan 'macros' sin meals, pasar `mealId = null` → check-in diario global del plan.
   */
  async toggleCheckin(params: {
    gym_id: string;
    student_id: string;
    plan_id: string;
    meal_id: string | null;
    checkin_date?: string;
    completed?: boolean;
  }): Promise<NutritionCheckin> {
    const date = params.checkin_date ?? todayDate();

    // Buscar existente
    let query = supabase
      .from('nutrition_checkins')
      .select('*')
      .eq('student_id', params.student_id)
      .eq('plan_id', params.plan_id)
      .eq('checkin_date', date);
    query = params.meal_id === null ? query.is('meal_id', null) : query.eq('meal_id', params.meal_id);
    const { data: existing } = await query.limit(1).maybeSingle();

    const targetCompleted = params.completed ?? !(existing?.completed ?? false);

    if (existing) {
      const { data, error } = await supabase
        .from('nutrition_checkins')
        .update({ completed: targetCompleted, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as NutritionCheckin;
    }

    const { data, error } = await supabase
      .from('nutrition_checkins')
      .insert({
        gym_id: params.gym_id,
        student_id: params.student_id,
        plan_id: params.plan_id,
        meal_id: params.meal_id,
        checkin_date: date,
        completed: targetCompleted,
      })
      .select()
      .single();
    if (error) throw error;
    return data as NutritionCheckin;
  },

  /** Adherencia nutricional de un alumno en un rango (para Smart / estadísticas) */
  async getAdherence(studentId: string, days = 7): Promise<{
    days: number;
    total_expected: number;
    total_completed: number;
    adherence_pct: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const sinceStr = since.toLocaleDateString('sv-SE');

    const { data } = await supabase
      .from('nutrition_checkins')
      .select('completed')
      .eq('student_id', studentId)
      .gte('checkin_date', sinceStr);

    const rows = data ?? [];
    const total_expected = rows.length;
    const total_completed = rows.filter((r: any) => r.completed).length;
    const adherence_pct = total_expected === 0 ? 0 : Math.round((total_completed / total_expected) * 100);

    return { days, total_expected, total_completed, adherence_pct };
  },
};
