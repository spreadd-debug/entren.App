import { supabase } from '../db/supabase';
import {
  PersonalProfile,
  PersonalActivity,
  PersonalActivityInput,
  PersonalMeal,
  PersonalMealFood,
  PersonalMealWithFoods,
  PersonalMealInput,
  PersonalExpense,
  PersonalExpenseInput,
  PersonalExpenseCategory,
  PersonalBodyMetric,
  PersonalBodyMetricInput,
} from '../../shared/types';

// ── Profiles ─────────────────────────────────────────────────────────────────

export const PersonalProfileService = {
  async getByUserId(userId: string): Promise<PersonalProfile | null> {
    const { data, error } = await supabase
      .from('personal_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PersonalProfile | null;
  },

  async ensureForUser(userId: string, displayName?: string): Promise<PersonalProfile> {
    const existing = await this.getByUserId(userId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from('personal_profiles')
      .insert({ user_id: userId, display_name: displayName ?? null })
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalProfile;
  },

  async update(id: string, updates: Partial<PersonalProfile>): Promise<PersonalProfile> {
    const { data, error } = await supabase
      .from('personal_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalProfile;
  },
};

// ── Activities ───────────────────────────────────────────────────────────────

export interface ActivityRangeFilter {
  from?: string; // ISO
  to?: string;
  sportType?: string;
}

export const PersonalActivitiesService = {
  async list(profileId: string, filter: ActivityRangeFilter = {}): Promise<PersonalActivity[]> {
    let q = supabase
      .from('personal_activities')
      .select('*')
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false });
    if (filter.from) q = q.gte('started_at', filter.from);
    if (filter.to) q = q.lte('started_at', filter.to);
    if (filter.sportType) q = q.eq('sport_type', filter.sportType);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalActivity[];
  },

  async create(input: PersonalActivityInput): Promise<PersonalActivity> {
    const { data, error } = await supabase
      .from('personal_activities')
      .insert({ source: 'manual', ...input })
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalActivity;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('personal_activities').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Meals ────────────────────────────────────────────────────────────────────

export const PersonalMealsService = {
  async listByDate(profileId: string, date: string): Promise<PersonalMealWithFoods[]> {
    // date: YYYY-MM-DD; rango día completo
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59.999`;
    const { data, error } = await supabase
      .from('personal_meals')
      .select('*, foods:personal_meal_foods(*)')
      .eq('profile_id', profileId)
      .gte('consumed_at', dayStart)
      .lte('consumed_at', dayEnd)
      .order('consumed_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as PersonalMealWithFoods[];
  },

  async create(input: PersonalMealInput): Promise<PersonalMealWithFoods> {
    const { foods, ...mealFields } = input;
    const { data: meal, error } = await supabase
      .from('personal_meals')
      .insert(mealFields)
      .select('*')
      .single();
    if (error) throw error;
    let createdFoods: PersonalMealFood[] = [];
    if (foods && foods.length > 0) {
      const rows = foods.map((f, i) => ({
        meal_id: (meal as PersonalMeal).id,
        order_index: f.order_index ?? i,
        food_name: f.food_name,
        amount: f.amount ?? null,
        unit: f.unit ?? null,
        calories: f.calories ?? null,
        protein_g: f.protein_g ?? null,
        carbs_g: f.carbs_g ?? null,
        fat_g: f.fat_g ?? null,
      }));
      const { data: foodRows, error: foodErr } = await supabase
        .from('personal_meal_foods')
        .insert(rows)
        .select('*');
      if (foodErr) throw foodErr;
      createdFoods = (foodRows ?? []) as PersonalMealFood[];
    }
    return { ...(meal as PersonalMeal), foods: createdFoods };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('personal_meals').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Expense categories ───────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Comida',    icon: 'UtensilsCrossed', color: '#F97316' },
  { name: 'Transporte', icon: 'Car',            color: '#0EA5E9' },
  { name: 'Hogar',     icon: 'Home',            color: '#84CC16' },
  { name: 'Ocio',      icon: 'Sparkles',        color: '#A855F7' },
  { name: 'Salud',     icon: 'HeartPulse',      color: '#EF4444' },
  { name: 'Otros',     icon: 'Tag',             color: '#64748B' },
];

export const PersonalExpenseCategoriesService = {
  async list(profileId: string, includeArchived = false): Promise<PersonalExpenseCategory[]> {
    let q = supabase
      .from('personal_expense_categories')
      .select('*')
      .eq('profile_id', profileId)
      .order('name', { ascending: true });
    if (!includeArchived) q = q.eq('archived', false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalExpenseCategory[];
  },

  async ensureDefaults(profileId: string): Promise<PersonalExpenseCategory[]> {
    const existing = await this.list(profileId, true);
    if (existing.length > 0) return existing;
    const rows = DEFAULT_CATEGORIES.map(c => ({ ...c, profile_id: profileId }));
    const { data, error } = await supabase
      .from('personal_expense_categories')
      .insert(rows)
      .select('*');
    if (error) throw error;
    return (data ?? []) as PersonalExpenseCategory[];
  },

  async create(input: { profile_id: string; name: string; icon?: string; color?: string }): Promise<PersonalExpenseCategory> {
    const { data, error } = await supabase
      .from('personal_expense_categories')
      .insert(input)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalExpenseCategory;
  },

  async update(id: string, updates: Partial<PersonalExpenseCategory>): Promise<PersonalExpenseCategory> {
    const { data, error } = await supabase
      .from('personal_expense_categories')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalExpenseCategory;
  },
};

// ── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpensesRange {
  from: string; // YYYY-MM-DD
  to: string;
}

export const PersonalExpensesService = {
  async listInRange(profileId: string, range: ExpensesRange): Promise<PersonalExpense[]> {
    const { data, error } = await supabase
      .from('personal_expenses')
      .select('*')
      .eq('profile_id', profileId)
      .gte('spent_at', range.from)
      .lte('spent_at', range.to)
      .order('spent_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PersonalExpense[];
  },

  async create(input: PersonalExpenseInput): Promise<PersonalExpense> {
    const { data, error } = await supabase
      .from('personal_expenses')
      .insert(input)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalExpense;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('personal_expenses').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Body metrics ─────────────────────────────────────────────────────────────

export const PersonalBodyService = {
  async list(profileId: string, limit = 90): Promise<PersonalBodyMetric[]> {
    const { data, error } = await supabase
      .from('personal_body_metrics')
      .select('*')
      .eq('profile_id', profileId)
      .order('measured_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PersonalBodyMetric[];
  },

  async latest(profileId: string): Promise<PersonalBodyMetric | null> {
    const rows = await this.list(profileId, 1);
    return rows[0] ?? null;
  },

  async create(input: PersonalBodyMetricInput): Promise<PersonalBodyMetric> {
    const { data, error } = await supabase
      .from('personal_body_metrics')
      .insert(input)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalBodyMetric;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('personal_body_metrics').delete().eq('id', id);
    if (error) throw error;
  },
};
