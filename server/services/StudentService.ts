import { mapStudentRowToStudent } from '../mappers/student.mapper';
import { supabase } from '../db/supabase';
import { Student } from '../../shared/types';
import { ActivityEventsService } from './ActivityEventsService';

const DEFAULT_GYM_ID = '11111111-1111-1111-1111-111111111111';

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

type StudentDbRow = {
  id?: string;
  gym_id: string;
  plan_id?: string | null;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  status?: string | null;
  precio_personalizado?: number | null;
  tipo_beca?: string | null;
  cobra_cuota?: boolean | null;
  recordatorio_automatico?: boolean | null;
  whatsapp_opt_in?: boolean | null;
  whatsapp_opt_in_at?: string | null;
  last_payment_date?: string | null;
  next_due_date?: string | null;
  observaciones?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  access_code?: string | null;
  has_custom_code?: boolean | null;
  is_online?: boolean | null;
  birth_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
        is_online,
        birth_date,
        created_at,
        updated_at
      `)
      .eq('gym_id', resolvedGymId)
      .order('nombre', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => mapStudentRowToStudent(row as any));
  },

  async getById(id: string, gymId: string): Promise<Student | null> {
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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
        is_online,
        birth_date,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('gym_id', resolvedGymId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapStudentRowToStudent(data as any);
  },

  async create(student: Record<string, any>): Promise<Student> {
    const payload: StudentDbRow = {
      gym_id: student.gym_id ?? student.gymId ?? DEFAULT_GYM_ID,
      plan_id: student.plan_id ?? student.planId ?? null,
      nombre: student.nombre ?? student.firstName ?? student.name ?? '',
      apellido: student.apellido ?? student.lastName ?? '',
      telefono: student.telefono ?? student.phone ?? null,
      status: student.status ?? 'activo',
      precio_personalizado: student.precio_personalizado ?? student.customPrice ?? null,
      tipo_beca: student.tipo_beca ?? student.discountType ?? 'ninguna',
      cobra_cuota: student.cobra_cuota ?? true,
      recordatorio_automatico: student.recordatorio_automatico ?? true,
      whatsapp_opt_in: student.whatsapp_opt_in ?? false,
      whatsapp_opt_in_at: student.whatsapp_opt_in ? new Date().toISOString() : null,
      last_payment_date: student.last_payment_date ?? student.lastPaymentDate ?? null,
      next_due_date: student.next_due_date ?? student.nextDueDate ?? null,
      observaciones: student.observaciones ?? student.observations ?? null,
      emergency_contact_name: student.emergency_contact_name ?? null,
      emergency_contact_phone: student.emergency_contact_phone ?? null,
      access_code: generateAccessCode(),
      is_online: student.is_online ?? false,
      birth_date: student.birth_date ?? null,
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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
        is_online,
        birth_date,
        created_at,
        updated_at
      `)
      .single();

    if (error) throw error;

    const createdStudent = data as StudentDbRow;

    if (createdStudent.plan_id) {
      const today = new Date().toISOString().split('T')[0];

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert([
          {
            gym_id: createdStudent.gym_id,
            student_id: createdStudent.id,
            plan_id: createdStudent.plan_id,
            status: 'active',
            start_date: today,
            next_due_date: createdStudent.next_due_date ?? null,
            custom_price: createdStudent.precio_personalizado ?? null,
            discount_type: createdStudent.tipo_beca ?? null,
            auto_renew: true,
            notes: createdStudent.observaciones ?? null,
          },
        ]);

      if (membershipError) throw membershipError;
    }

    if (createdStudent.gym_id && createdStudent.gym_id !== DEFAULT_GYM_ID) {
      // El índice único en DB evita duplicados; si ya existía, log() retorna null.
      ActivityEventsService.log({
        gym_id: createdStudent.gym_id,
        event_type: 'first_student_created',
        event_data: { student_id: createdStudent.id },
      }).catch(err => console.error('activity log first_student_created failed:', err));
    }

    return mapStudentRowToStudent(data as any);
  },

  async update(id: string, updates: Record<string, any>): Promise<Student> {
    const payload: Record<string, any> = {};

    if (updates.gym_id !== undefined || updates.gymId !== undefined) {
      payload.gym_id = updates.gym_id ?? updates.gymId;
    }

    if (updates.plan_id !== undefined || updates.planId !== undefined) {
      const rawPlan = updates.plan_id ?? updates.planId;
      payload.plan_id = rawPlan || null; // '' -> null to avoid FK violation
    }

    if (updates.nombre !== undefined || updates.firstName !== undefined || updates.name !== undefined) {
      payload.nombre = updates.nombre ?? updates.firstName ?? updates.name;
    }

    if (updates.apellido !== undefined || updates.lastName !== undefined) {
      payload.apellido = updates.apellido ?? updates.lastName;
    }

    if (updates.telefono !== undefined || updates.phone !== undefined) {
      const rawPhone = updates.telefono ?? updates.phone;
      payload.telefono = rawPhone?.trim() || null; // '' -> null
    }

    if (updates.status !== undefined) payload.status = updates.status;

    if (updates.precio_personalizado !== undefined || updates.customPrice !== undefined) {
      payload.precio_personalizado = updates.precio_personalizado ?? updates.customPrice;
    }

    if (updates.tipo_beca !== undefined || updates.discountType !== undefined) {
      payload.tipo_beca = updates.tipo_beca ?? updates.discountType;
    }

    if (updates.cobra_cuota !== undefined) payload.cobra_cuota = updates.cobra_cuota;
    if (updates.recordatorio_automatico !== undefined) payload.recordatorio_automatico = updates.recordatorio_automatico;

    if (updates.whatsapp_opt_in !== undefined) {
      payload.whatsapp_opt_in = updates.whatsapp_opt_in;
      payload.whatsapp_opt_in_at = updates.whatsapp_opt_in ? new Date().toISOString() : null;
    }

    if (updates.last_payment_date !== undefined || updates.lastPaymentDate !== undefined) {
      payload.last_payment_date = updates.last_payment_date ?? updates.lastPaymentDate;
    }

    if (updates.next_due_date !== undefined || updates.nextDueDate !== undefined) {
      payload.next_due_date = updates.next_due_date ?? updates.nextDueDate;
    }

    if (updates.observaciones !== undefined || updates.observations !== undefined) {
      const rawObs = updates.observaciones ?? updates.observations;
      payload.observaciones = rawObs?.trim() || null;
    }

    if (updates.emergency_contact_name !== undefined) {
      payload.emergency_contact_name = updates.emergency_contact_name?.trim() || null;
    }

    if (updates.emergency_contact_phone !== undefined) {
      payload.emergency_contact_phone = updates.emergency_contact_phone?.trim() || null;
    }

    if (updates.is_online !== undefined) {
      payload.is_online = !!updates.is_online;
    }

    if (updates.birth_date !== undefined) {
      // '' o null → null para no fallar el CHECK constraint
      const raw = updates.birth_date;
      payload.birth_date = raw && String(raw).trim() ? raw : null;
    }

    const gymId = updates.gym_id ?? updates.gymId ?? DEFAULT_GYM_ID;
    // Don't allow moving a student to a different gym
    delete payload.gym_id;

    if (Object.keys(payload).length === 0) {
      // Nothing to update — just return current student
      const current = await this.getById(id, gymId);
      if (!current) throw new Error('Student not found');
      return current;
    }

    const { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .eq('gym_id', gymId)
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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
        is_online,
        birth_date,
        created_at,
        updated_at
      `)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No se encontró el alumno o no se pudo actualizar');
    return mapStudentRowToStudent(data as any);
  },

  async regenerateAccessCode(id: string, gymId: string): Promise<string> {
    const newCode = generateAccessCode();
    const resolvedGymId = gymId || DEFAULT_GYM_ID;

    const { error } = await supabase
      .from('students')
      .update({ access_code: newCode })
      .eq('id', id)
      .eq('gym_id', resolvedGymId);

    if (error) throw error;
    return newCode;
  },

  async setCustomCode(id: string, currentCode: string, newCode: string): Promise<void> {
    // Verify current code matches
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('access_code')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!student) throw new Error('Alumno no encontrado');

    if (student.access_code?.toUpperCase() !== currentCode.toUpperCase()) {
      throw new Error('Código actual incorrecto');
    }

    const { error } = await supabase
      .from('students')
      .update({ access_code: newCode.toUpperCase(), has_custom_code: true })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string, gymId: string): Promise<void> {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
      .eq('gym_id', resolvedGymId);

    if (error) throw error;
  }
};