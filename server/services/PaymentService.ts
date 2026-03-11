import { supabase } from '../db/supabase';
import { Payment } from '../../shared/types';

const DEFAULT_GYM_ID = '11111111-1111-1111-1111-111111111111';

export const PaymentService = {
  async getAll(gymId: string): Promise<Payment[]> {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        student_id,
        gym_id,
        monto,
        metodo_pago,
        fecha_pago,
        notes,
        created_at
      `)
      .eq('gym_id', resolvedGymId)
      .order('fecha_pago', { ascending: false });

    if (error) throw error;
    return (data || []) as any;
  },

  async register(payment: any): Promise<Payment> {
    const payload = {
      student_id: payment.student_id ?? payment.studentId,
      gym_id: payment.gym_id ?? payment.gymId ?? DEFAULT_GYM_ID,
      monto: Number(payment.monto ?? payment.amount ?? 0),
      metodo_pago: payment.metodo_pago ?? payment.method ?? 'efectivo',
      fecha_pago: payment.fecha_pago ?? payment.date ?? new Date().toISOString().split('T')[0],
      notes: payment.notes ?? null,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([payload])
      .select(`
        id,
        student_id,
        gym_id,
        monto,
        metodo_pago,
        fecha_pago,
        notes,
        created_at
      `)
      .single();

    if (error) throw error;
    return data as any;
  }
};