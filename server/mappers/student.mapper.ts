import { Student } from '../../shared/types';

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
  created_at?: string;
  updated_at?: string;
};

export function mapStudentRowToStudent(row: StudentDbRow): Student {
  return {
    id: row.id ?? '',
    gymId: row.gym_id,
    planId: row.plan_id ?? undefined,
    name: row.nombre,
    lastName: row.apellido ?? '',
    phone: row.telefono ?? '',
    status:
      row.status === 'inactive' || row.status === 'inactivo'
        ? 'inactive'
        : 'active',
    customPrice: row.precio_personalizado ?? undefined,
    discountType: row.tipo_beca ?? undefined,
    chargeFee: row.cobra_cuota ?? true,
    automaticReminder: row.recordatorio_automatico ?? true,
    whatsappOptIn: row.whatsapp_opt_in ?? false,
    whatsappOptInAt: row.whatsapp_opt_in_at ?? undefined,
    lastPaymentDate: row.last_payment_date ?? undefined,
    nextDueDate: row.next_due_date ?? undefined,
    observations: row.observaciones ?? undefined,
    emergency_contact_name: row.emergency_contact_name ?? undefined,
    emergency_contact_phone: row.emergency_contact_phone ?? undefined,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  } as unknown as Student;
}