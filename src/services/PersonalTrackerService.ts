import { supabase } from '../db/supabase';
import {
  PersonalProfile,
  PersonalActivity,
  PersonalActivityInput,
  PersonalMeal,
  PersonalMealFood,
  PersonalMealWithFoods,
  PersonalMealInput,
  PersonalAccount,
  PersonalAccountInput,
  PersonalCategory,
  PersonalCategoryInput,
  PersonalTransaction,
  PersonalTransactionInput,
  PersonalTransferInput,
  CategoryKind,
  PersonalBodyMetric,
  PersonalBodyMetricInput,
  PersonalSleep,
  PersonalDailyMetrics,
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

// ── Accounts (Finance v2) ────────────────────────────────────────────────────

const DEFAULT_ACCOUNT_GRADIENT_BY_KIND: Record<string, [string, string]> = {
  cash:       ['#10B981', '#3B82F6'], // green → blue
  bank:       ['#6366F1', '#A855F7'], // indigo → violet
  wallet:     ['#F59E0B', '#EC4899'], // amber → pink
  investment: ['#0EA5E9', '#8B5CF6'], // sky → violet
  other:      ['#64748B', '#0F172A'],
};

export const PersonalAccountsService = {
  async list(profileId: string, includeArchived = false): Promise<PersonalAccount[]> {
    let q = supabase
      .from('personal_accounts')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!includeArchived) q = q.eq('archived', false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalAccount[];
  },

  async getById(id: string): Promise<PersonalAccount | null> {
    const { data, error } = await supabase
      .from('personal_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PersonalAccount | null;
  },

  async create(input: PersonalAccountInput): Promise<PersonalAccount> {
    const grad = DEFAULT_ACCOUNT_GRADIENT_BY_KIND[input.kind ?? 'cash'] ?? DEFAULT_ACCOUNT_GRADIENT_BY_KIND.other;
    const payload = {
      ...input,
      kind: input.kind ?? 'cash',
      currency: input.currency ?? 'ARS',
      current_balance: input.current_balance ?? 0,
      color_a: input.color_a ?? grad[0],
      color_b: input.color_b ?? grad[1],
    };
    const { data, error } = await supabase
      .from('personal_accounts')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalAccount;
  },

  async update(id: string, updates: Partial<PersonalAccount>): Promise<PersonalAccount> {
    const { data, error } = await supabase
      .from('personal_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalAccount;
  },

  async archive(id: string, archived = true): Promise<void> {
    const { error } = await supabase
      .from('personal_accounts')
      .update({ archived, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('personal_accounts').delete().eq('id', id);
    if (error) throw error;
  },

  // Aplica un delta al current_balance. Lo usamos al crear/borrar transacciones.
  async adjustBalance(id: string, delta: number): Promise<void> {
    const account = await this.getById(id);
    if (!account) throw new Error(`Account ${id} not found`);
    const newBalance = Number(account.current_balance) + delta;
    const { error } = await supabase
      .from('personal_accounts')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

// ── Categories (Finance v2) ──────────────────────────────────────────────────

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Comida',     icon: 'UtensilsCrossed', color: '#F97316' },
  { name: 'Transporte', icon: 'Car',             color: '#0EA5E9' },
  { name: 'Hogar',      icon: 'Home',            color: '#84CC16' },
  { name: 'Ocio',       icon: 'Sparkles',        color: '#A855F7' },
  { name: 'Salud',      icon: 'HeartPulse',      color: '#EF4444' },
  { name: 'Servicios',  icon: 'Plug',            color: '#06B6D4' },
  { name: 'Otros',      icon: 'Tag',             color: '#64748B' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Sueldo',     icon: 'Briefcase',  color: '#10B981' },
  { name: 'Freelance',  icon: 'Laptop',     color: '#22C55E' },
  { name: 'Inversión',  icon: 'TrendingUp', color: '#3B82F6' },
  { name: 'Otros',      icon: 'PiggyBank',  color: '#A855F7' },
];

export const PersonalCategoriesService = {
  async list(profileId: string, kind?: CategoryKind, includeArchived = false): Promise<PersonalCategory[]> {
    let q = supabase
      .from('personal_categories')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (kind) q = q.eq('kind', kind);
    if (!includeArchived) q = q.eq('archived', false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalCategory[];
  },

  async ensureDefaults(profileId: string): Promise<PersonalCategory[]> {
    const existing = await this.list(profileId, undefined, true);
    if (existing.length > 0) return existing;
    const rows = [
      ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, profile_id: profileId, kind: 'expense' as const })),
      ...DEFAULT_INCOME_CATEGORIES.map(c => ({ ...c, profile_id: profileId, kind: 'income' as const })),
    ];
    const { data, error } = await supabase
      .from('personal_categories')
      .insert(rows)
      .select('*');
    if (error) throw error;
    return (data ?? []) as PersonalCategory[];
  },

  async create(input: PersonalCategoryInput): Promise<PersonalCategory> {
    const { data, error } = await supabase
      .from('personal_categories')
      .insert(input)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCategory;
  },

  async update(id: string, updates: Partial<PersonalCategory>): Promise<PersonalCategory> {
    const { data, error } = await supabase
      .from('personal_categories')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCategory;
  },
};

// ── Transactions (Finance v2) ────────────────────────────────────────────────

export interface TransactionsFilter {
  from?: string;          // ISO timestamp inclusive
  to?: string;            // ISO timestamp inclusive
  account_id?: string;
  kind?: 'expense' | 'income' | 'transfer';
  category_id?: string;
}

export const PersonalTransactionsService = {
  async list(profileId: string, filter: TransactionsFilter = {}, limit = 200): Promise<PersonalTransaction[]> {
    let q = supabase
      .from('personal_transactions')
      .select('*')
      .eq('profile_id', profileId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (filter.from) q = q.gte('occurred_at', filter.from);
    if (filter.to)   q = q.lte('occurred_at', filter.to);
    if (filter.account_id)  q = q.eq('account_id', filter.account_id);
    if (filter.category_id) q = q.eq('category_id', filter.category_id);
    if (filter.kind === 'expense') q = q.eq('kind', 'expense');
    if (filter.kind === 'income')  q = q.eq('kind', 'income');
    if (filter.kind === 'transfer') q = q.in('kind', ['transfer_in', 'transfer_out']);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalTransaction[];
  },

  async create(input: PersonalTransactionInput): Promise<PersonalTransaction> {
    const occurred = input.occurred_at ?? new Date().toISOString();
    const { data, error } = await supabase
      .from('personal_transactions')
      .insert({
        profile_id: input.profile_id,
        account_id: input.account_id,
        category_id: input.category_id ?? null,
        kind: input.kind,
        amount: input.amount,
        currency: input.currency,
        occurred_at: occurred,
        description: input.description ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    // Mantener el balance de la cuenta en sync.
    const delta = input.kind === 'expense' ? -input.amount : input.amount;
    await PersonalAccountsService.adjustBalance(input.account_id, delta);
    return data as PersonalTransaction;
  },

  async createTransfer(input: PersonalTransferInput): Promise<{ out: PersonalTransaction; in: PersonalTransaction }> {
    const [from, to] = await Promise.all([
      PersonalAccountsService.getById(input.from_account_id),
      PersonalAccountsService.getById(input.to_account_id),
    ]);
    if (!from || !to) throw new Error('Cuenta origen o destino inexistente');
    const occurred = input.occurred_at ?? new Date().toISOString();
    const fxRate = input.fx_rate ?? null;
    const toAmount = input.to_amount ?? (
      from.currency === to.currency
        ? input.amount
        : (fxRate ? Number((input.amount * fxRate).toFixed(2)) : input.amount)
    );
    const transferGroupId = crypto.randomUUID();

    const rowOut = {
      profile_id: input.profile_id,
      account_id: input.from_account_id,
      category_id: null,
      kind: 'transfer_out' as const,
      amount: input.amount,
      currency: from.currency,
      occurred_at: occurred,
      description: input.description ?? `→ ${to.name}`,
      transfer_group_id: transferGroupId,
      fx_rate: fxRate,
    };
    const rowIn = {
      profile_id: input.profile_id,
      account_id: input.to_account_id,
      category_id: null,
      kind: 'transfer_in' as const,
      amount: toAmount,
      currency: to.currency,
      occurred_at: occurred,
      description: input.description ?? `← ${from.name}`,
      transfer_group_id: transferGroupId,
      fx_rate: fxRate,
    };

    const { data, error } = await supabase
      .from('personal_transactions')
      .insert([rowOut, rowIn])
      .select('*');
    if (error) throw error;
    const created = (data ?? []) as PersonalTransaction[];
    const out = created.find(t => t.kind === 'transfer_out')!;
    const inn = created.find(t => t.kind === 'transfer_in')!;

    // Ajustar balances. Secuencial — si una falla, el cron del cliente
    // tendría que reconciliar manualmente. Es un trade-off aceptado.
    await PersonalAccountsService.adjustBalance(input.from_account_id, -input.amount);
    await PersonalAccountsService.adjustBalance(input.to_account_id,    toAmount);

    return { out, in: inn };
  },

  async delete(id: string): Promise<void> {
    // Para mantener balance correcto al borrar, primero leemos la transacción.
    const { data: tx, error: fetchErr } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!tx) return;

    if (tx.transfer_group_id) {
      // Borrar las 2 patas y revertir balances.
      const { data: pair } = await supabase
        .from('personal_transactions')
        .select('*')
        .eq('transfer_group_id', tx.transfer_group_id);
      const rows = (pair ?? []) as PersonalTransaction[];
      for (const r of rows) {
        const delta = r.kind === 'transfer_out' ? r.amount : -r.amount;
        await PersonalAccountsService.adjustBalance(r.account_id, delta);
      }
      const { error } = await supabase
        .from('personal_transactions')
        .delete()
        .eq('transfer_group_id', tx.transfer_group_id);
      if (error) throw error;
    } else {
      const delta = tx.kind === 'expense' ? tx.amount : -tx.amount;
      await PersonalAccountsService.adjustBalance(tx.account_id, delta);
      const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
      if (error) throw error;
    }
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

// ── Sleep (Garmin) ───────────────────────────────────────────────────────────

export const PersonalSleepService = {
  async list(profileId: string, limit = 30): Promise<PersonalSleep[]> {
    const { data, error } = await supabase
      .from('personal_sleep')
      .select('*')
      .eq('profile_id', profileId)
      .order('sleep_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PersonalSleep[];
  },

  async latest(profileId: string): Promise<PersonalSleep | null> {
    const rows = await this.list(profileId, 1);
    return rows[0] ?? null;
  },

  async byDate(profileId: string, date: string): Promise<PersonalSleep | null> {
    const { data, error } = await supabase
      .from('personal_sleep')
      .select('*')
      .eq('profile_id', profileId)
      .eq('sleep_date', date)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PersonalSleep | null;
  },
};

// ── Daily metrics (Garmin) ───────────────────────────────────────────────────

export const PersonalDailyMetricsService = {
  async list(profileId: string, limit = 30): Promise<PersonalDailyMetrics[]> {
    const { data, error } = await supabase
      .from('personal_daily_metrics')
      .select('*')
      .eq('profile_id', profileId)
      .order('metric_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PersonalDailyMetrics[];
  },

  async latest(profileId: string): Promise<PersonalDailyMetrics | null> {
    const rows = await this.list(profileId, 1);
    return rows[0] ?? null;
  },

  async byDate(profileId: string, date: string): Promise<PersonalDailyMetrics | null> {
    const { data, error } = await supabase
      .from('personal_daily_metrics')
      .select('*')
      .eq('profile_id', profileId)
      .eq('metric_date', date)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PersonalDailyMetrics | null;
  },
};
