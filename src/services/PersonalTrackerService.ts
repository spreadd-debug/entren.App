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
  PersonalCreditCard,
  PersonalCreditCardInput,
  PersonalCardStatement,
  PayCardStatementInput,
  PersonalCardSubscription,
  PersonalCardSubscriptionInput,
} from '../../shared/types';
import { resolveStatementWindow } from '../components/personal/money/cardStatement';

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
  { name: 'Comida',       icon: 'ShoppingBasket',  color: '#F97316' }, // groceries / supermercado
  { name: 'Café',         icon: 'Coffee',          color: '#92400E' },
  { name: 'Restaurante',  icon: 'UtensilsCrossed', color: '#DC2626' },
  { name: 'Nafta',        icon: 'Fuel',            color: '#0EA5E9' },
  { name: 'Auto',         icon: 'Car',             color: '#475569' }, // mantenimiento, peajes, lavado
  { name: 'Transporte',   icon: 'Bus',             color: '#0891B2' }, // colectivo, taxi, uber
  { name: 'Hogar',        icon: 'Home',            color: '#84CC16' },
  { name: 'Servicios',    icon: 'Plug',            color: '#06B6D4' }, // luz, gas, agua
  { name: 'Internet',     icon: 'Wifi',            color: '#3B82F6' },
  { name: 'Ropa',         icon: 'Shirt',           color: '#EC4899' },
  { name: 'Salud',        icon: 'HeartPulse',      color: '#EF4444' },
  { name: 'Farmacia',     icon: 'Pill',            color: '#F43F5E' },
  { name: 'Gimnasio',     icon: 'Dumbbell',        color: '#A855F7' },
  { name: 'Ocio',         icon: 'Sparkles',        color: '#7C3AED' },
  { name: 'Streaming',    icon: 'Film',            color: '#1F2937' },
  { name: 'Tecnología',   icon: 'Smartphone',      color: '#6366F1' },
  { name: 'Mascotas',     icon: 'PawPrint',        color: '#F59E0B' },
  { name: 'Regalos',      icon: 'Gift',            color: '#FB923C' },
  { name: 'Viajes',       icon: 'Plane',           color: '#0EA5E9' },
  { name: 'Educación',    icon: 'GraduationCap',   color: '#10B981' },
  { name: 'Impuestos',    icon: 'Receipt',         color: '#64748B' },
  { name: 'Otros',        icon: 'Tag',             color: '#94A3B8' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Sueldo',     icon: 'Briefcase',  color: '#10B981' },
  { name: 'Freelance',  icon: 'Laptop',     color: '#22C55E' },
  { name: 'Inversión',  icon: 'TrendingUp', color: '#3B82F6' },
  { name: 'Reembolso',  icon: 'Undo2',      color: '#06B6D4' },
  { name: 'Venta',      icon: 'ShoppingBag', color: '#F59E0B' },
  { name: 'Regalo',     icon: 'Gift',       color: '#A855F7' },
  { name: 'Otros',      icon: 'PiggyBank',  color: '#0EA5E9' },
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

  // Aditivo: para cada categoría default que NO exista (match por nombre+kind),
  // la inserta. Permite expandir el set de defaults sin romper a usuarios que
  // ya tienen las viejas. Si borraste una default, va a volver a aparecer en el
  // próximo load — usá archive en vez de delete si querés que no vuelva.
  async ensureDefaults(profileId: string): Promise<PersonalCategory[]> {
    const existing = await this.list(profileId, undefined, true);
    const have = new Set(existing.map(c => `${c.kind}:${c.name.toLowerCase()}`));

    const missing = [
      ...DEFAULT_EXPENSE_CATEGORIES
        .filter(c => !have.has(`expense:${c.name.toLowerCase()}`))
        .map(c => ({ ...c, profile_id: profileId, kind: 'expense' as const })),
      ...DEFAULT_INCOME_CATEGORIES
        .filter(c => !have.has(`income:${c.name.toLowerCase()}`))
        .map(c => ({ ...c, profile_id: profileId, kind: 'income' as const })),
    ];

    if (missing.length === 0) return existing;

    const { data, error } = await supabase
      .from('personal_categories')
      .insert(missing)
      .select('*');
    if (error) throw error;
    return [...existing, ...((data ?? []) as PersonalCategory[])];
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

// ─── Cuotas ───────────────────────────────────────────────────────────────────
// Crea N transacciones (una por cuota) cuando installment_total >= 2.
//
// `occurredAt` es la fecha de la COMPRA ORIGINAL (cuota 1). Cada cuota i cae
// en occurredAt + (i-1) meses, así que el sistema sabe en qué statement va
// cada una. Si `current > 1`, salteamos las cuotas anteriores (las pagaste
// antes), pero las que sí creamos mantienen su fecha calendario correcta:
// cuota 3 de una compra de marzo cae en mayo, no en marzo.
//
// El monto guardado por cuota es total / installment_total (redondeado a 2
// decimales). La última cuota absorbe el resto del redondeo para que la suma
// dé exacto el monto original.
async function createInstallmentPurchase(
  input: PersonalTransactionInput,
  occurredAt: string,
  total: number,
): Promise<PersonalTransaction> {
  const current = Math.max(1, Math.min(total, input.installment_current ?? 1));
  const groupId = crypto.randomUUID();
  const baseDate = new Date(occurredAt);
  // Por simetría con el monto en cuotas que se ve en el resumen del banco,
  // dividimos en N partes iguales (en vez de en N - current + 1).
  const perCuotaRaw = Number(input.amount) / total;
  const perCuota = Math.round(perCuotaRaw * 100) / 100;

  const created: PersonalTransaction[] = [];
  for (let i = current; i <= total; i++) {
    const cuotaDate = new Date(baseDate);
    // Cuota i = compra original + (i-1) meses. Cuota 1 = mismo día de la compra.
    cuotaDate.setMonth(cuotaDate.getMonth() + (i - 1));
    const cuotaIso = cuotaDate.toISOString();

    const isLast = i === total;
    // Última cuota absorbe el residuo de redondeo: total - sum(perCuota * (N-1)).
    const cuotaAmount = isLast
      ? Math.round((Number(input.amount) - perCuota * (total - 1)) * 100) / 100
      : perCuota;

    const statement = await PersonalCardStatementsService.ensureForCardAndDate(
      input.credit_card_id!,
      input.profile_id,
      cuotaIso,
      input.currency,
    );

    const cuotaSuffix = ` · Cuota ${i}/${total}`;
    const description = (input.description ?? 'Compra') + cuotaSuffix;

    const { data, error } = await supabase
      .from('personal_transactions')
      .insert({
        profile_id: input.profile_id,
        account_id: null,
        credit_card_id: input.credit_card_id,
        statement_id: statement.id,
        category_id: input.category_id ?? null,
        kind: input.kind,
        amount: cuotaAmount,
        currency: input.currency,
        occurred_at: cuotaIso,
        description,
        installment_total: total,
        installment_number: i,
        installment_group_id: groupId,
      })
      .select('*')
      .single();
    if (error) throw error;
    await PersonalCardStatementsService.adjustTotal(statement.id, cuotaAmount);
    created.push(data as PersonalTransaction);
  }

  // Devolvemos la primera cuota creada (la del statement actual) como referencia.
  return created[0];
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

    // Si va con tarjeta de crédito, no afectamos balance de cuenta — la tx
    // queda asociada al statement correspondiente y se materializa al pagar.
    if (input.credit_card_id) {
      if (input.kind !== 'expense') {
        throw new Error('Solo se aceptan gastos en tarjeta de crédito (income va a una cuenta).');
      }

      // Modo cuotas: si installment_total >= 2, generamos N transacciones,
      // una por mes a partir de occurred_at, cada una en el statement que le toca.
      const total = input.installment_total ?? 1;
      if (total >= 2) {
        return await createInstallmentPurchase(input, occurred, total);
      }

      const statement = await PersonalCardStatementsService.ensureForCardAndDate(
        input.credit_card_id,
        input.profile_id,
        occurred,
        input.currency,
      );
      const { data, error } = await supabase
        .from('personal_transactions')
        .insert({
          profile_id: input.profile_id,
          account_id: null,
          credit_card_id: input.credit_card_id,
          statement_id: statement.id,
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
      // Sumar al total del statement.
      await PersonalCardStatementsService.adjustTotal(statement.id, input.amount);
      return data as PersonalTransaction;
    }

    if (!input.account_id) {
      throw new Error('account_id requerido cuando no es transacción con tarjeta');
    }
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
    const { data: tx, error: fetchErr } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!tx) return;

    // Compra con tarjeta: revertir el total del statement y borrar.
    // Si la tx forma parte de un grupo de cuotas, borramos TODAS las cuotas
    // del grupo y revertimos el total de cada statement afectado — borrar
    // sólo una cuota dejaría una compra a medio cargar, que nunca es lo deseado.
    if (tx.credit_card_id && tx.statement_id) {
      if (tx.installment_group_id) {
        const { data: group, error: groupErr } = await supabase
          .from('personal_transactions')
          .select('*')
          .eq('installment_group_id', tx.installment_group_id);
        if (groupErr) throw groupErr;
        for (const cuota of (group ?? []) as PersonalTransaction[]) {
          if (cuota.statement_id) {
            await PersonalCardStatementsService.adjustTotal(cuota.statement_id, -Number(cuota.amount));
          }
        }
        const { error } = await supabase
          .from('personal_transactions')
          .delete()
          .eq('installment_group_id', tx.installment_group_id);
        if (error) throw error;
        return;
      }
      await PersonalCardStatementsService.adjustTotal(tx.statement_id, -Number(tx.amount));
      const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    // Transferencia: borrar las 2 patas y revertir balances.
    if (tx.transfer_group_id) {
      const { data: pair } = await supabase
        .from('personal_transactions')
        .select('*')
        .eq('transfer_group_id', tx.transfer_group_id);
      const rows = (pair ?? []) as PersonalTransaction[];
      for (const r of rows) {
        if (!r.account_id) continue;
        const delta = r.kind === 'transfer_out' ? r.amount : -r.amount;
        await PersonalAccountsService.adjustBalance(r.account_id, delta);
      }
      const { error } = await supabase
        .from('personal_transactions')
        .delete()
        .eq('transfer_group_id', tx.transfer_group_id);
      if (error) throw error;
      return;
    }

    // Expense/income normal de cuenta.
    if (tx.account_id) {
      const delta = tx.kind === 'expense' ? tx.amount : -tx.amount;
      await PersonalAccountsService.adjustBalance(tx.account_id, delta);
    }
    const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Credit cards ─────────────────────────────────────────────────────────────

const DEFAULT_CARD_GRADIENT: [string, string] = ['#6366F1', '#A855F7'];

export const PersonalCreditCardsService = {
  async list(profileId: string, includeArchived = false): Promise<PersonalCreditCard[]> {
    let q = supabase
      .from('personal_credit_cards')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!includeArchived) q = q.eq('archived', false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalCreditCard[];
  },

  async getById(id: string): Promise<PersonalCreditCard | null> {
    const { data, error } = await supabase
      .from('personal_credit_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PersonalCreditCard | null;
  },

  async create(input: PersonalCreditCardInput): Promise<PersonalCreditCard> {
    const payload = {
      ...input,
      color_a: input.color_a ?? DEFAULT_CARD_GRADIENT[0],
      color_b: input.color_b ?? DEFAULT_CARD_GRADIENT[1],
    };
    const { data, error } = await supabase
      .from('personal_credit_cards')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCreditCard;
  },

  async update(id: string, updates: Partial<PersonalCreditCard>): Promise<PersonalCreditCard> {
    const { data, error } = await supabase
      .from('personal_credit_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCreditCard;
  },

  async archive(id: string, archived = true): Promise<void> {
    const { error } = await supabase
      .from('personal_credit_cards')
      .update({ archived, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('personal_credit_cards').delete().eq('id', id);
    if (error) throw error;
  },

  // Subir foto de la tarjeta a Supabase Storage. El bucket 'card-images' debe
  // existir y ser público (ver scripts/personal_credit_card_image_migration.sql).
  async uploadImage(profileId: string, cardId: string, file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${profileId}/${cardId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('card-images')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (uploadErr) throw uploadErr;
    const { data } = supabase.storage.from('card-images').getPublicUrl(path);
    return data.publicUrl;
  },
};

// ── Card statements ──────────────────────────────────────────────────────────

export const PersonalCardStatementsService = {
  async listByCard(cardId: string, limit = 24): Promise<PersonalCardStatement[]> {
    const { data, error } = await supabase
      .from('personal_card_statements')
      .select('*')
      .eq('card_id', cardId)
      .order('period_end', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PersonalCardStatement[];
  },

  async getById(id: string): Promise<PersonalCardStatement | null> {
    const { data, error } = await supabase
      .from('personal_card_statements')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PersonalCardStatement | null;
  },

  // Lazy-create del statement: si ya existe para (card, period_end, currency)
  // lo devuelve, si no lo crea con total_amount=0 y status=open.
  // Una tarjeta puede tener varios statements del mismo período si hubo
  // compras en monedas distintas (ej. uno ARS y uno USD).
  async ensureForCardAndDate(
    cardId: string,
    profileId: string,
    occurredAt: string,
    currency: string,
  ): Promise<PersonalCardStatement> {
    const card = await PersonalCreditCardsService.getById(cardId);
    if (!card) throw new Error(`Tarjeta ${cardId} inexistente`);
    const win = resolveStatementWindow(card, occurredAt);

    const existing = await supabase
      .from('personal_card_statements')
      .select('*')
      .eq('card_id', cardId)
      .eq('period_end', win.period_end)
      .eq('currency', currency)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data as PersonalCardStatement;

    // Status: si el período ya cerró (period_end pasó), arrancar en 'closed'.
    const today = new Date();
    const periodEndDate = new Date(win.period_end + 'T23:59:59');
    const status = today > periodEndDate ? 'closed' : 'open';

    const { data, error } = await supabase
      .from('personal_card_statements')
      .insert({
        card_id: cardId,
        profile_id: profileId,
        currency,
        period_start: win.period_start,
        period_end: win.period_end,
        due_date: win.due_date,
        total_amount: 0,
        paid_amount: 0,
        status,
        closed_at: status === 'closed' ? new Date().toISOString() : null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCardStatement;
  },

  // Suma delta al total_amount (negativo para revertir al borrar tx).
  async adjustTotal(statementId: string, delta: number): Promise<void> {
    const stmt = await this.getById(statementId);
    if (!stmt) throw new Error(`Statement ${statementId} inexistente`);
    const newTotal = Number(stmt.total_amount) + delta;
    const { error } = await supabase
      .from('personal_card_statements')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', statementId);
    if (error) throw error;
  },

  // Pago del resumen: crea una transacción 'expense' desde la cuenta elegida
  // y actualiza paid_amount/status del statement. Idempotente sobre el monto.
  async pay(input: PayCardStatementInput): Promise<{ statement: PersonalCardStatement; transaction: PersonalTransaction }> {
    const stmt = await this.getById(input.statement_id);
    if (!stmt) throw new Error('Statement inexistente');
    const card = await PersonalCreditCardsService.getById(stmt.card_id);
    if (!card) throw new Error('Tarjeta inexistente');
    const account = await PersonalAccountsService.getById(input.from_account_id);
    if (!account) throw new Error('Cuenta inexistente');

    const occurred = input.occurred_at ?? new Date().toISOString();

    // 1. Crear la tx 'expense' contra la cuenta. La asociamos al statement
    //    por traceability, sin credit_card_id (esa es la convención: tx con
    //    statement_id pero sin credit_card_id = pago, no compra).
    const { data: txData, error: txErr } = await supabase
      .from('personal_transactions')
      .insert({
        profile_id: input.profile_id,
        account_id: input.from_account_id,
        statement_id: input.statement_id,
        category_id: null,
        kind: 'expense',
        amount: input.amount,
        currency: account.currency,
        occurred_at: occurred,
        description: input.description ?? `Pago resumen ${card.name}`,
      })
      .select('*')
      .single();
    if (txErr) throw txErr;
    const transaction = txData as PersonalTransaction;

    // 2. Bajar balance de la cuenta.
    await PersonalAccountsService.adjustBalance(input.from_account_id, -input.amount);

    // 3. Actualizar paid_amount y status del statement.
    const newPaid = Number(stmt.paid_amount) + input.amount;
    const total = Number(stmt.total_amount);
    let newStatus: PersonalCardStatement['status'];
    if (newPaid >= total - 0.01) newStatus = 'paid';
    else if (newPaid > 0)         newStatus = 'partial';
    else                          newStatus = stmt.status;

    const { data: stmtData, error: stmtErr } = await supabase
      .from('personal_card_statements')
      .update({
        paid_amount: newPaid,
        status: newStatus,
        paid_at: newStatus === 'paid' ? occurred : stmt.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.statement_id)
      .select('*')
      .single();
    if (stmtErr) throw stmtErr;
    return { statement: stmtData as PersonalCardStatement, transaction };
  },
};

// ── Card subscriptions (débitos automáticos recurrentes) ─────────────────────

function periodKey(date: Date): string {
  // 'YYYY-MM' en local time — usado para idempotencia mensual.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export const PersonalCardSubscriptionsService = {
  async list(profileId: string, cardId?: string): Promise<PersonalCardSubscription[]> {
    let q = supabase
      .from('personal_card_subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .order('day_of_month', { ascending: true });
    if (cardId) q = q.eq('credit_card_id', cardId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PersonalCardSubscription[];
  },

  async create(input: PersonalCardSubscriptionInput): Promise<PersonalCardSubscription> {
    const { data, error } = await supabase
      .from('personal_card_subscriptions')
      .insert({
        profile_id: input.profile_id,
        credit_card_id: input.credit_card_id,
        category_id: input.category_id ?? null,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        day_of_month: input.day_of_month,
        active: input.active ?? true,
        starts_on: input.starts_on ?? new Date().toISOString().slice(0, 10),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCardSubscription;
  },

  // Crea la sub y a la vez registra la primera tx (la del mes en curso) usando
  // la fecha real de hoy. Marca last_charged_period del mes corriente para que
  // el cron no la cobre dos veces. Pensado para el flujo "cargo el gasto del
  // gym de este mes y queda agendado para los próximos".
  async createWithImmediateCharge(
    input: PersonalCardSubscriptionInput,
    immediateOccurredAt: string,
  ): Promise<{ subscription: PersonalCardSubscription; transaction: PersonalTransaction }> {
    const today = new Date(immediateOccurredAt);
    const period = periodKey(today);

    const { data: subData, error: subErr } = await supabase
      .from('personal_card_subscriptions')
      .insert({
        profile_id: input.profile_id,
        credit_card_id: input.credit_card_id,
        category_id: input.category_id ?? null,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        day_of_month: input.day_of_month,
        active: input.active ?? true,
        starts_on: input.starts_on ?? new Date().toISOString().slice(0, 10),
        last_charged_period: period, // ya cobrada este mes — el cron skipea
      })
      .select('*')
      .single();
    if (subErr) throw subErr;
    const sub = subData as PersonalCardSubscription;

    const statement = await PersonalCardStatementsService.ensureForCardAndDate(
      sub.credit_card_id,
      sub.profile_id,
      immediateOccurredAt,
      sub.currency,
    );
    const { data: txData, error: txErr } = await supabase
      .from('personal_transactions')
      .insert({
        profile_id: sub.profile_id,
        account_id: null,
        credit_card_id: sub.credit_card_id,
        statement_id: statement.id,
        subscription_id: sub.id,
        category_id: sub.category_id,
        kind: 'expense',
        amount: sub.amount,
        currency: sub.currency,
        occurred_at: immediateOccurredAt,
        description: `${sub.description} · Auto`,
      })
      .select('*')
      .single();
    if (txErr) throw txErr;
    await PersonalCardStatementsService.adjustTotal(statement.id, sub.amount);
    return { subscription: sub, transaction: txData as PersonalTransaction };
  },

  async update(id: string, patch: Partial<PersonalCardSubscriptionInput>): Promise<PersonalCardSubscription> {
    const { data, error } = await supabase
      .from('personal_card_subscriptions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalCardSubscription;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_card_subscriptions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Crea las txs de las subs que les toca este mes y todavía no se cargaron.
  // Devuelve cuántas materializó. Idempotente por last_charged_period.
  //
  // Cargamos para el mes corriente con fecha = day_of_month del mes en curso,
  // aunque el día sea futuro (ej. hoy 5 y el cobro es el 23). De esa manera el
  // resumen refleja todos los pagos recurrentes del mes desde que se setean —
  // no hace falta esperar al día calendario para verlo planificado.
  async materializeDue(profileId: string, today: Date = new Date()): Promise<number> {
    const subs = await this.list(profileId);
    const period = periodKey(today);
    let created = 0;

    for (const sub of subs) {
      if (!sub.active) continue;
      if (sub.last_charged_period === period) continue; // ya se cobró este mes
      if (sub.starts_on && new Date(sub.starts_on) > today) continue;

      // Fecha de la tx: día day_of_month del mes corriente. Puede ser pasado o
      // futuro respecto a hoy — lo importante es que cada mes calendario tenga
      // exactamente 1 tx por sub (ese día del mes que vos definiste).
      const occurred = new Date(today.getFullYear(), today.getMonth(), sub.day_of_month, 12, 0, 0);
      const occurredIso = occurred.toISOString();

      const statement = await PersonalCardStatementsService.ensureForCardAndDate(
        sub.credit_card_id,
        sub.profile_id,
        occurredIso,
        sub.currency,
      );

      const { error: insertErr } = await supabase
        .from('personal_transactions')
        .insert({
          profile_id: sub.profile_id,
          account_id: null,
          credit_card_id: sub.credit_card_id,
          statement_id: statement.id,
          subscription_id: sub.id,
          category_id: sub.category_id,
          kind: 'expense',
          amount: sub.amount,
          currency: sub.currency,
          occurred_at: occurredIso,
          description: `${sub.description} · Auto`,
        });
      if (insertErr) {
        console.error('[subscriptions] insert tx failed', insertErr);
        continue;
      }
      await PersonalCardStatementsService.adjustTotal(statement.id, sub.amount);
      await supabase
        .from('personal_card_subscriptions')
        .update({ last_charged_period: period, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      created++;
    }
    return created;
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
