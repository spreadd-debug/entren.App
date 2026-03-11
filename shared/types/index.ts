
export type StudentStatus = 'active' | 'inactive' | 'expiring' | 'expired';
export type ScholarshipType = 'none' | 'partial' | 'complete';
export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago';

export interface Gym {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
}

export interface Student {
  id: string;
  gym_id: string;
  name: string;
  lastName: string;
  apellido?: string; // For compatibility
  phone: string;
  planId: string;
  planName: string;
  status: StudentStatus;
  lastPaymentDate: string;
  nextDueDate: string;
  observations?: string;
  debt: number;
  // Billing
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

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: 'completed' | 'pending' | 'cancelled';
  nextDueDate: string;
  created_at: string;
}

export interface ReminderRule {
  id: string;
  gym_id: string;
  name: string;
  code: string;
  triggerType: 'before' | 'on_day' | 'after';
  offsetDays: number;
  active: boolean;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  gym_id: string;
  title: string;
  code: string;
  body: string;
  active: boolean;
  created_at: string;
}

export interface ReminderLog {
  id: string;
  gym_id: string;
  studentId: string;
  ruleCode: string;
  scheduledFor: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel: 'whatsapp' | 'email';
  messagePreview: string;
  error?: string;
  created_at: string;
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

export interface DashboardStats {
  activeCount: number;
  expiredCount: number;
  expiringCount: number;
  monthlyIncome: number;
  pendingStudents: Student[];
}
