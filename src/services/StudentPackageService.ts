import { supabase } from '../db/supabase';
import { StudentPackage, PaymentMethod } from '../../shared/types';

export const StudentPackageService = {
  /** Get the currently active package for a student (or null if none) */
  async getActive(studentId: string): Promise<StudentPackage | null> {
    const { data, error } = await supabase
      .from('student_packages')
      .select('*')
      .eq('student_id', studentId)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as StudentPackage | null;
  },

  /** Full package history for a student (most recent first) */
  async getHistory(studentId: string): Promise<StudentPackage[]> {
    const { data, error } = await supabase
      .from('student_packages')
      .select('*')
      .eq('student_id', studentId)
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as StudentPackage[];
  },

  /** All active packages in a gym — used by Defaulters PT to find near-expired ones */
  async getActiveByGym(gymId: string): Promise<StudentPackage[]> {
    const { data, error } = await supabase
      .from('student_packages')
      .select('*')
      .eq('gym_id', gymId)
      .eq('active', true);

    if (error) throw error;
    return (data ?? []) as StudentPackage[];
  },

  /**
   * Create a new package. Deactivates any existing active package for the student first
   * (there can only be one active package per student due to the unique index).
   */
  async create(params: {
    studentId: string;
    gymId: string;
    sessionsTotal: number;
    pricePaid: number;
    paymentMethod: PaymentMethod;
    purchasedAt?: string;
    expiresAt?: string | null;
    notes?: string | null;
  }): Promise<StudentPackage> {
    await supabase
      .from('student_packages')
      .update({ active: false })
      .eq('student_id', params.studentId)
      .eq('active', true);

    const { data, error } = await supabase
      .from('student_packages')
      .insert({
        student_id: params.studentId,
        gym_id: params.gymId,
        sessions_total: params.sessionsTotal,
        sessions_used: 0,
        price_paid: params.pricePaid,
        payment_method: params.paymentMethod,
        purchased_at: params.purchasedAt ?? new Date().toISOString().slice(0, 10),
        expires_at: params.expiresAt ?? null,
        active: true,
        notes: params.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as StudentPackage;
  },

  /**
   * Increment sessions_used by 1 on the active package.
   * Returns the updated package, or null if no active package.
   * Marks the package as inactive when sessions_used reaches sessions_total.
   */
  async consumeSession(studentId: string): Promise<StudentPackage | null> {
    const active = await this.getActive(studentId);
    if (!active) return null;

    const newUsed = active.sessions_used + 1;
    const exhausted = newUsed >= active.sessions_total;

    const { data, error } = await supabase
      .from('student_packages')
      .update({
        sessions_used: newUsed,
        active: !exhausted,
      })
      .eq('id', active.id)
      .select()
      .single();

    if (error) throw error;
    return data as StudentPackage;
  },

  /** Revert a consumed session (e.g. PT un-marks attendance) */
  async refundSession(studentId: string): Promise<StudentPackage | null> {
    const active = await this.getActive(studentId);
    if (!active || active.sessions_used === 0) return active;

    const { data, error } = await supabase
      .from('student_packages')
      .update({ sessions_used: active.sessions_used - 1 })
      .eq('id', active.id)
      .select()
      .single();

    if (error) throw error;
    return data as StudentPackage;
  },

  /** Delete a package (admin/correction flow) */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('student_packages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
