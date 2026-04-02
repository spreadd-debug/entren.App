import { supabase } from '../../db/supabase';
import { PTShiftPayment, PaymentMethod } from '../../../shared/types';

export const PTPaymentService = {
  /** Get all payments for a gym, optionally filtered by date range */
  async getAll(gymId: string, opts?: { from?: string; to?: string }): Promise<PTShiftPayment[]> {
    let query = supabase
      .from('pt_shift_payments')
      .select(`
        *,
        student:students(nombre, apellido),
        shift:shifts(name, start_time, end_time)
      `)
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: false });

    if (opts?.from) query = query.gte('payment_date', opts.from);
    if (opts?.to) query = query.lte('payment_date', opts.to);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as PTShiftPayment[];
  },

  /** Get payments for a specific date (for calendar view) */
  async getByDate(gymId: string, date: string): Promise<PTShiftPayment[]> {
    const { data, error } = await supabase
      .from('pt_shift_payments')
      .select('*')
      .eq('gym_id', gymId)
      .eq('payment_date', date);

    if (error) throw error;
    return (data ?? []) as PTShiftPayment[];
  },

  /** Get payments for a specific shift+date combo (all students in that shift on that day) */
  async getByShiftAndDate(shiftId: string, date: string): Promise<PTShiftPayment[]> {
    const { data, error } = await supabase
      .from('pt_shift_payments')
      .select('*')
      .eq('shift_id', shiftId)
      .eq('payment_date', date);

    if (error) throw error;
    return (data ?? []) as PTShiftPayment[];
  },

  /** Mark a shift occurrence as paid for a student (upsert) */
  async markPaid(params: {
    gymId: string;
    shiftId: string;
    studentId: string;
    paymentDate: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): Promise<PTShiftPayment> {
    const { data, error } = await supabase
      .from('pt_shift_payments')
      .upsert({
        gym_id: params.gymId,
        shift_id: params.shiftId,
        student_id: params.studentId,
        payment_date: params.paymentDate,
        amount: params.amount,
        payment_method: params.paymentMethod,
        status: 'paid',
        notes: params.notes ?? null,
      }, { onConflict: 'shift_id,student_id,payment_date' })
      .select()
      .single();

    if (error) throw error;
    return data as PTShiftPayment;
  },

  /** Mark a shift occurrence as unpaid for a student (upsert) */
  async markUnpaid(params: {
    gymId: string;
    shiftId: string;
    studentId: string;
    paymentDate: string;
  }): Promise<PTShiftPayment> {
    const { data, error } = await supabase
      .from('pt_shift_payments')
      .upsert({
        gym_id: params.gymId,
        shift_id: params.shiftId,
        student_id: params.studentId,
        payment_date: params.paymentDate,
        amount: 0,
        payment_method: 'cash',
        status: 'unpaid',
        notes: null,
      }, { onConflict: 'shift_id,student_id,payment_date' })
      .select()
      .single();

    if (error) throw error;
    return data as PTShiftPayment;
  },

  /** Delete a payment record */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pt_shift_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /** Get summary stats for a gym */
  async getStats(gymId: string): Promise<{
    todayIncome: number;
    monthIncome: number;
    monthPaid: number;
    monthUnpaid: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';

    const { data, error } = await supabase
      .from('pt_shift_payments')
      .select('amount, status, payment_date')
      .eq('gym_id', gymId)
      .gte('payment_date', monthStart);

    if (error) throw error;

    const records = data ?? [];
    let todayIncome = 0;
    let monthIncome = 0;
    let monthPaid = 0;
    let monthUnpaid = 0;

    for (const r of records) {
      if (r.status === 'paid') {
        monthIncome += Number(r.amount) || 0;
        monthPaid++;
        if (r.payment_date === today) {
          todayIncome += Number(r.amount) || 0;
        }
      } else {
        monthUnpaid++;
      }
    }

    return { todayIncome, monthIncome, monthPaid, monthUnpaid };
  },
};
