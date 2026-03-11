import { supabase } from '../db/supabase';
import { Student } from '../../shared/types';

const DEFAULT_GYM_ID = '11111111-1111-1111-1111-111111111111';

export const StudentService = {
  async getAll(gymId: string): Promise<Student[]> {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        gym_id,
        plan_id,
        nombre,
        apellido,
        telefono,
        status,
        precio_personalizado,
        tipo_beca,
        cobra_cuota,
        recordatorio_automatico,
        whatsapp_opt_in,
        whatsapp_opt_in_at,
        last_payment_date,
        next_due_date,
        observaciones,
        created_at,
        updated_at
      `)
      .eq('gym_id', resolvedGymId)
      .order('nombre', { ascending: true });

    if (error) throw error;

    return (data || []) as Student[];
  },

  async getById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        gym_id,
        plan_id,
        nombre,
        apellido,
        telefono,
        status,
        precio_personalizado,
        tipo_beca,
        cobra_cuota,
        recordatorio_automatico,
        whatsapp_opt_in,
        whatsapp_opt_in_at,
        last_payment_date,
        next_due_date,
        observaciones,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return data as Student;
  },

  async create(student: Partial<Student>): Promise<Student> {
    const payload = {
      gym_id: student.gym_id || DEFAULT_GYM_ID,
      plan_id: student.plan_id ?? null,
      nombre: student.nombre ?? '',
      apellido: student.apellido ?? '',
      telefono: student.telefono ?? null,
      status: student.status ?? 'activo',
      precio_personalizado: student.precio_personalizado ?? null,
      tipo_beca: student.tipo_beca ?? 'ninguna',
      cobra_cuota: student.cobra_cuota ?? true,
      recordatorio_automatico: student.recordatorio_automatico ?? true,
      whatsapp_opt_in: student.whatsapp_opt_in ?? false,
      whatsapp_opt_in_at: student.whatsapp_opt_in ? new Date().toISOString() : null,
      last_payment_date: student.last_payment_date ?? null,
      next_due_date: student.next_due_date ?? null,
      observaciones: student.observaciones ?? null,
    };

    const { data, error } = await supabase
      .from('students')
      .insert([payload])
      .select(`
        id,
        gym_id,
        plan_id,
        nombre,
        apellido,
        telefono,
        status,
        precio_personalizado,
        tipo_beca,
        cobra_cuota,
        recordatorio_automatico,
        whatsapp_opt_in,
        whatsapp_opt_in_at,
        last_payment_date,
        next_due_date,
        observaciones,
        created_at,
        updated_at
      `)
      .single();

    if (error) throw error;
    return data as Student;
  },

  async update(id: string, updates: Partial<Student>): Promise<Student> {
    const payload: Record<string, any> = {};

    if (updates.gym_id !== undefined) payload.gym_id = updates.gym_id;
    if (updates.plan_id !== undefined) payload.plan_id = updates.plan_id;
    if (updates.nombre !== undefined) payload.nombre = updates.nombre;
    if (updates.apellido !== undefined) payload.apellido = updates.apellido;
    if (updates.telefono !== undefined) payload.telefono = updates.telefono;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.precio_personalizado !== undefined) payload.precio_personalizado = updates.precio_personalizado;
    if (updates.tipo_beca !== undefined) payload.tipo_beca = updates.tipo_beca;
    if (updates.cobra_cuota !== undefined) payload.cobra_cuota = updates.cobra_cuota;
    if (updates.recordatorio_automatico !== undefined) payload.recordatorio_automatico = updates.recordatorio_automatico;
    if (updates.whatsapp_opt_in !== undefined) {
      payload.whatsapp_opt_in = updates.whatsapp_opt_in;
      payload.whatsapp_opt_in_at = updates.whatsapp_opt_in ? new Date().toISOString() : null;
    }
    if (updates.last_payment_date !== undefined) payload.last_payment_date = updates.last_payment_date;
    if (updates.next_due_date !== undefined) payload.next_due_date = updates.next_due_date;
    if (updates.observaciones !== undefined) payload.observaciones = updates.observaciones;

    const { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .select(`
        id,
        gym_id,
        plan_id,
        nombre,
        apellido,
        telefono,
        status,
        precio_personalizado,
        tipo_beca,
        cobra_cuota,
        recordatorio_automatico,
        whatsapp_opt_in,
        whatsapp_opt_in_at,
        last_payment_date,
        next_due_date,
        observaciones,
        created_at,
        updated_at
      `)
      .single();

    if (error) throw error;
    return data as Student;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};