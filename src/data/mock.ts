
import { Student, Payment, Plan, ReminderRule, MessageTemplate, ReminderLog } from '../types';

// Today is 2026-03-11

export const MOCK_STUDENTS: Student[] = [
  {
    id: '1',
    name: 'Juan',
    apellido: 'Pérez',
    email: 'juan.perez@email.com',
    phone: '5491122334455',
    status: 'active',
    planId: '1',
    planName: 'Pase Libre',
    lastPaymentDate: '2026-03-10',
    nextDueDate: '2026-04-09',
    cobra_cuota: true,
    recordatorio_automatico: true,
    tipo_beca: 'none',
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-03-10',
  },
  {
    id: '2',
    name: 'María',
    apellido: 'García',
    email: 'maria.g@email.com',
    phone: '5491155667788',
    status: 'expiring',
    planId: '3',
    planName: '3 veces por semana',
    lastPaymentDate: '2026-02-12',
    nextDueDate: '2026-03-14', // 3 days from today
    cobra_cuota: true,
    recordatorio_automatico: true,
    tipo_beca: 'none',
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-02-12',
  },
  {
    id: '3',
    name: 'Carlos',
    apellido: 'Rodríguez',
    email: 'carlos.r@email.com',
    phone: '5491199001122',
    status: 'expired',
    planId: '2',
    planName: '2 veces por semana',
    lastPaymentDate: '2026-02-05',
    nextDueDate: '2026-03-07', // 4 days ago
    debt: 18000,
    cobra_cuota: true,
    recordatorio_automatico: true,
    tipo_beca: 'none',
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-02-05',
  },
  {
    id: '4',
    name: 'Ana',
    apellido: 'Martínez',
    email: 'ana.m@email.com',
    phone: '5491133445566',
    status: 'active',
    planId: '4',
    planName: 'Plan Atleta',
    lastPaymentDate: '2026-03-01',
    nextDueDate: '2026-03-31',
    cobra_cuota: false,
    recordatorio_automatico: false,
    tipo_beca: 'complete',
    observaciones_cobranza: 'Alumno becado por competencia',
    whatsapp_opt_in: false,
    created_at: '2026-01-01',
    updated_at: '2026-03-01',
  },
  {
    id: '5',
    name: 'Roberto',
    apellido: 'Sánchez',
    email: 'roberto.s@email.com',
    phone: '5491177889900',
    status: 'expired',
    planId: '1',
    planName: 'Pase Libre',
    lastPaymentDate: '2026-01-28',
    nextDueDate: '2026-02-27', // 12 days ago
    debt: 25000,
    cobra_cuota: true,
    recordatorio_automatico: true,
    tipo_beca: 'none',
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-28',
  },
  {
    id: '6',
    name: 'Lucía',
    apellido: 'López',
    email: 'lucia.l@email.com',
    phone: '5491144556677',
    status: 'active',
    planId: '1',
    planName: 'Pase Libre',
    lastPaymentDate: '2026-03-11',
    nextDueDate: '2026-04-10',
    cobra_cuota: true,
    recordatorio_automatico: false, // Manual reminder
    tipo_beca: 'none',
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: '2026-03-11',
    created_at: '2026-03-11',
    updated_at: '2026-03-11',
  }
];

export const MOCK_REMINDER_RULES: ReminderRule[] = [
  { id: 'r1', code: 'due_soon_3d', name: '3 días antes', triggerType: 'before', offsetDays: 3, active: true },
  { id: 'r2', code: 'due_today', name: 'Día de vencimiento', triggerType: 'on_day', offsetDays: 0, active: true },
  { id: 'r3', code: 'overdue_3d', name: '3 días después', triggerType: 'after', offsetDays: 3, active: true },
  { id: 'r4', code: 'overdue_7d', name: '7 días después', triggerType: 'after', offsetDays: 7, active: true },
];

export const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: 't1',
    code: 'due_soon_3d',
    title: 'Aviso Preventivo (3 días)',
    body: 'Hola {nombre}, te recordamos que tu cuota de {plan} vence el {fecha_vencimiento}. ¡Te esperamos en el gym!',
    active: true
  },
  {
    id: 't2',
    code: 'due_today',
    title: 'Día de Vencimiento',
    body: 'Hola {nombre}, hoy vence tu cuota de {plan}. Podés abonar por transferencia o en el gym.',
    active: true
  },
  {
    id: 't3',
    code: 'overdue_3d',
    title: 'Mora Temprana (3 días)',
    body: 'Hola {nombre}, tu cuota de {plan} está vencida hace {dias_atraso} días. El monto pendiente es {precio}.',
    active: true
  },
  {
    id: 't4',
    code: 'overdue_7d',
    title: 'Mora Tardía (7 días)',
    body: 'Hola {nombre}, registramos una deuda de {dias_atraso} días en tu plan {plan}. Por favor contactanos para regularizar.',
    active: true
  }
];

export const MOCK_REMINDER_LOGS: ReminderLog[] = [
  {
    id: 'l1',
    studentId: '3',
    ruleCode: 'due_today',
    scheduledFor: '2026-03-07',
    sentAt: '2026-03-07T10:00:00Z',
    status: 'delivered',
    channel: 'whatsapp',
    messagePreview: 'Hola Carlos, hoy vence tu cuota...',
    externalMessageId: 'wa_123456'
  }
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'p1',
    studentId: '1',
    studentName: 'Juan Pérez',
    amount: 4200,
    date: '2026-03-10',
    method: 'cash',
    status: 'completed',
    nextDueDate: '2026-04-09',
  },
  {
    id: 'p2',
    studentId: '4',
    studentName: 'Ana Martínez',
    amount: 3800,
    date: '2026-03-01',
    method: 'transfer',
    status: 'completed',
    nextDueDate: '2026-03-31',
  },
  {
    id: 'p3',
    studentId: '2',
    studentName: 'María García',
    amount: 5000,
    date: '2026-02-12',
    method: 'mercadopago',
    status: 'completed',
    nextDueDate: '2026-03-14',
  }
];

export const MOCK_PLANS: Plan[] = [
  { 
    id: '1', 
    name: 'Pase Libre', 
    price: 25000, 
    durationDays: 30, 
    description: 'Acceso total al gimnasio', 
    active: true 
  },
  { 
    id: '2', 
    name: '2 veces por semana', 
    price: 18000, 
    durationDays: 30, 
    classesPerWeek: 2, 
    description: 'Ideal para mantenimiento', 
    active: true 
  },
  { 
    id: '3', 
    name: '3 veces por semana', 
    price: 20000, 
    durationDays: 30, 
    classesPerWeek: 3, 
    description: 'Nuestro plan más popular', 
    active: true 
  },
  { 
    id: '4', 
    name: 'Plan Atleta', 
    price: 35000, 
    durationDays: 30, 
    description: 'Entrenamiento de alto rendimiento', 
    active: false 
  },
];
