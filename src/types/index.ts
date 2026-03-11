
export type StudentStatus = 'active' | 'pausado' | 'baja' | 'expiring' | 'expired' | 'inactive';

export type ScholarshipType = 'none' | 'partial' | 'complete';

export interface Student {
  id: string;
  name: string;
  lastName?: string;
  apellido?: string; // Adding for consistency with request
  email: string;
  phone: string;
  status: StudentStatus;
  planId: string;
  planName: string;
  lastPaymentDate: string;
  nextDueDate: string;
  debt?: number;
  observations?: string;
  // Billing configuration
  cobra_cuota: boolean;
  recordatorio_automatico: boolean;
  precio_personalizado?: number;
  tipo_beca: ScholarshipType;
  observaciones_cobranza?: string;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at?: string;
  created_at: string;
  updated_at: string;
}

export type ReminderLogStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';

export interface ReminderLog {
  id: string;
  studentId: string;
  ruleCode: string;
  scheduledFor: string;
  sentAt?: string;
  status: ReminderLogStatus;
  channel: 'whatsapp';
  messagePreview: string;
  externalMessageId?: string;
  errorMessage?: string;
}

export interface ReminderRule {
  id: string;
  code: string;
  name: string;
  triggerType: 'before' | 'on_day' | 'after';
  offsetDays: number;
  active: boolean;
}

export interface MessageTemplate {
  id: string;
  code: string;
  title: string;
  body: string;
  active: boolean;
}

export interface AutomationStatus {
  lastRun: string | null;
  nextRun: string | null;
  lastResult: {
    totalEvaluated: number;
    totalEligible: number;
    totalGenerated: number;
    totalIgnored: number;
  } | null;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  method: 'cash' | 'transfer' | 'mercadopago';
  status: 'completed' | 'pending';
  nextDueDate: string;
  notes?: string;
}

export interface GymConfig {
  name: string;
  address: string;
  phone: string;
  autoMessages: {
    reminder: string;
    welcome: string;
  };
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  classesPerWeek?: number;
  description?: string;
  active: boolean;
}
