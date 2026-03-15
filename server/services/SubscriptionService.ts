import { supabase } from '../db/supabase';
import { GymSubscription, GymBillingPayment, GymPlanTier } from '../../shared/types';

function mapRow(row: any): GymSubscription {
  return {
    ...row,
    gym_name: row.gym?.name ?? 'Desconocido',
    owner_email: row.gym?.owner_email ?? '',
    owner_phone: row.gym?.owner_phone ?? null,
  };
}

const GYM_SELECT = `*, gym:gyms (name, owner_email, owner_phone)`;

export const SubscriptionService = {
  async getAll(): Promise<GymSubscription[]> {
    const { data, error } = await supabase
      .from('gym_subscriptions')
      .select(GYM_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async getByGymId(gymId: string): Promise<GymSubscription | null> {
    const { data, error } = await supabase
      .from('gym_subscriptions')
      .select(GYM_SELECT)
      .eq('gym_id', gymId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapRow(data);
  },

  async upsert(gymId: string, updates: Partial<GymSubscription>): Promise<GymSubscription> {
    // Strip computed/joined fields before writing
    const { gym_name, owner_email, ...rest } = updates as any;
    const payload = { ...rest, gym_id: gymId };

    const { data, error } = await supabase
      .from('gym_subscriptions')
      .upsert(payload, { onConflict: 'gym_id' })
      .select(GYM_SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  async activate(gymId: string, periodEnd: string, planTier?: GymPlanTier, skipPaymentCheck = false): Promise<GymSubscription> {
    if (!skipPaymentCheck) {
      const { data: payments } = await supabase
        .from('gym_billing_payments')
        .select('id')
        .eq('gym_id', gymId)
        .limit(1);
      if (!payments || payments.length === 0) {
        throw new Error('No se puede activar: el gimnasio no tiene pagos registrados. Registrá un pago primero.');
      }
    }
    return this.upsert(gymId, {
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
      access_enabled: true,
      ...(planTier ? { plan_tier: planTier } : {}),
    });
  },

  async suspend(gymId: string): Promise<GymSubscription> {
    return this.upsert(gymId, { status: 'suspended', access_enabled: false });
  },

  async cancel(gymId: string): Promise<GymSubscription> {
    return this.upsert(gymId, { status: 'cancelled', access_enabled: false });
  },

  async startTrial(gymId: string, trialDays: number = 30): Promise<GymSubscription> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    return this.upsert(gymId, {
      status: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
      access_enabled: true,
    });
  },

  async extend(gymId: string, newPeriodEnd: string): Promise<GymSubscription> {
    return this.upsert(gymId, {
      status: 'active',
      current_period_end: newPeriodEnd,
      access_enabled: true,
    });
  },

  async markPastDue(gymId: string): Promise<GymSubscription> {
    const existing = await this.getByGymId(gymId);
    const graceDays = existing?.grace_period_days ?? 7;
    const graceEndsAt = new Date();
    graceEndsAt.setDate(graceEndsAt.getDate() + graceDays);
    return this.upsert(gymId, {
      status: 'past_due',
      grace_period_ends_at: graceEndsAt.toISOString(),
      access_enabled: true,
    });
  },

  async createGym(
    name: string,
    ownerEmail: string,
    planTier: GymPlanTier = 'starter',
    trialDays: number = 30,
    ownerPhone?: string,
  ): Promise<GymSubscription> {
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .insert([{ name, owner_email: ownerEmail, ...(ownerPhone ? { owner_phone: ownerPhone } : {}) }])
      .select('id')
      .single();

    if (gymError) throw gymError;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const { data, error } = await supabase
      .from('gym_subscriptions')
      .insert([{
        gym_id: gym.id,
        plan_tier: planTier,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        access_enabled: true,
      }])
      .select(GYM_SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  // ── Billing payments ───────────────────────────────────────────────────────

  async getBillingPayments(gymId?: string): Promise<GymBillingPayment[]> {
    let query = supabase
      .from('gym_billing_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (gymId) query = query.eq('gym_id', gymId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];

    // Fetch gym names in one query to avoid N+1
    const gymIds = [...new Set(rows.map((r: any) => r.gym_id).filter(Boolean))];
    let gymNames: Record<string, string> = {};
    if (gymIds.length > 0) {
      const { data: gyms } = await supabase
        .from('gyms')
        .select('id, name')
        .in('id', gymIds);
      (gyms || []).forEach((g: any) => { gymNames[g.id] = g.name; });
    }

    return rows.map((row: any) => ({
      ...row,
      gym_name: gymNames[row.gym_id] ?? 'Desconocido',
    }));
  },

  async recordBillingPayment(payment: {
    gym_id: string;
    amount: number;
    currency?: string;
    period_start: string;
    period_end: string;
    payment_method: string;
    reference?: string;
    notes?: string;
    recorded_by?: string;
  }): Promise<GymBillingPayment> {
    const payload = {
      gym_id: payment.gym_id,
      amount: Number(payment.amount),
      currency: payment.currency ?? 'ARS',
      period_start: payment.period_start,
      period_end: payment.period_end,
      payment_method: payment.payment_method ?? 'transfer',
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      recorded_by: payment.recorded_by ?? null,
    };

    const { data, error } = await supabase
      .from('gym_billing_payments')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;

    // Fetch gym name separately (no FK declared in schema)
    const { data: gym } = await supabase
      .from('gyms')
      .select('name')
      .eq('id', payment.gym_id)
      .maybeSingle();

    // Activate the subscription for the paid period (skip payment check — we just recorded one)
    await this.activate(payment.gym_id, payment.period_end, undefined, true);

    return { ...data, gym_name: gym?.name ?? 'Desconocido' };
  },
};
