import { supabase } from '../db/supabase';
import { Payment } from '../../shared/types';

const DEFAULT_GYM_ID = '11111111-1111-1111-1111-111111111111';

function normalizePaymentMethod(method: string | undefined) {
  const value = String(method || '').toLowerCase();

  if (value === 'cash' || value === 'efectivo') return 'efectivo';
  if (value === 'transfer' || value === 'transferencia') return 'transferencia';
  if (value === 'mercadopago' || value === 'mercado_pago') return 'mercado_pago';
  if (value === 'tarjeta') return 'tarjeta';

  return 'otro';
}

export const PaymentService = {
  async getAll(gymId: string): Promise<Payment[]> {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        student_id,
        membership_id,
        gym_id,
        monto,
        metodo_pago,
        fecha_pago,
        notes,
        created_at,
        student:students (
          id,
          nombre,
          apellido
        )
      `)
      .eq('gym_id', resolvedGymId)
      .order('fecha_pago', { ascending: false });

    if (error) throw error;
    return (data || []) as any;
  },

  async register(payment: any): Promise<Payment> {
    const studentId = payment.student_id ?? payment.studentId;
    const gymId = payment.gym_id ?? payment.gymId ?? DEFAULT_GYM_ID;
    const monto = Number(payment.monto ?? payment.amount ?? 0);
    const metodoPago = normalizePaymentMethod(payment.metodo_pago ?? payment.method);
    const fechaPago =
      payment.fecha_pago ??
      payment.date ??
      new Date().toISOString().split('T')[0];

    if (!studentId) {
      throw new Error('studentId is required');
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select(`
        id,
        student_id,
        gym_id,
        plan_id,
        status,
        created_at
      `)
      .eq('student_id', studentId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const payload = {
      student_id: studentId,
      membership_id: membership?.id ?? null,
      gym_id: gymId,
      monto,
      metodo_pago: metodoPago,
      fecha_pago: fechaPago,
      notes: payment.notes ?? null,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([payload])
      .select(`
        id,
        student_id,
        membership_id,
        gym_id,
        monto,
        metodo_pago,
        fecha_pago,
        notes,
        created_at,
        student:students (
          id,
          nombre,
          apellido
        )
      `)
      .single();

    if (error) throw error;

    return data as any;
  }
};