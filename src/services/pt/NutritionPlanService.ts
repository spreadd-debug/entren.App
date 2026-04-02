import { supabase } from '../../db/supabase';
import { NutritionPlan, NutritionItem } from '../../../shared/types';

export interface NutritionPlanWithItems extends NutritionPlan {
  items: NutritionItem[];
}

export const NutritionPlanService = {

  /** Planes de un alumno (activos primero, más recientes primero) */
  async getByStudent(studentId: string): Promise<NutritionPlan[]> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('status', { ascending: true })  // active before archived
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as NutritionPlan[];
  },

  /** Plan con sus items */
  async getWithItems(planId: string): Promise<NutritionPlanWithItems | null> {
    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) return null;

    const { data: items } = await supabase
      .from('nutrition_items')
      .select('*')
      .eq('plan_id', planId)
      .order('item_order', { ascending: true });

    return { ...(plan as NutritionPlan), items: (items ?? []) as NutritionItem[] };
  },

  /** Plan activo de un alumno (el más reciente) */
  async getActivePlan(studentId: string): Promise<NutritionPlanWithItems | null> {
    const { data } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1);

    const plan = (data ?? [])[0] as NutritionPlan | undefined;
    if (!plan) return null;

    const { data: items } = await supabase
      .from('nutrition_items')
      .select('*')
      .eq('plan_id', plan.id)
      .order('item_order', { ascending: true });

    return { ...plan, items: (items ?? []) as NutritionItem[] };
  },

  /** Crear plan */
  async createPlan(params: {
    gym_id: string;
    student_id: string;
    title: string;
    description?: string;
    calories_target?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }): Promise<NutritionPlan> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .insert({
        gym_id: params.gym_id,
        student_id: params.student_id,
        title: params.title,
        description: params.description || null,
        calories_target: params.calories_target || null,
        protein_g: params.protein_g || null,
        carbs_g: params.carbs_g || null,
        fat_g: params.fat_g || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as NutritionPlan;
  },

  /** Actualizar plan */
  async updatePlan(planId: string, updates: {
    title?: string;
    description?: string | null;
    calories_target?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    status?: 'active' | 'archived';
  }): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;
  },

  /** Eliminar plan (cascade borra items) */
  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },

  /** Agregar item a un plan */
  async addItem(params: {
    plan_id: string;
    meal_label: string;
    food_name: string;
    portion?: string;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    notes?: string;
    item_order?: number;
  }): Promise<NutritionItem> {
    const { data, error } = await supabase
      .from('nutrition_items')
      .insert({
        plan_id: params.plan_id,
        meal_label: params.meal_label,
        food_name: params.food_name,
        portion: params.portion || null,
        calories: params.calories || null,
        protein_g: params.protein_g || null,
        carbs_g: params.carbs_g || null,
        fat_g: params.fat_g || null,
        notes: params.notes || null,
        item_order: params.item_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as NutritionItem;
  },

  /** Eliminar item */
  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },
};
