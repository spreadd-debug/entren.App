import {
  Student,
  Payment,
  Plan,
  ReminderLog,
  AutomationStatus,
  DashboardStats,
  GymSubscription,
  GymBillingPayment,
  GymPlanTier,
  OutreachDailyLog,
  OutreachDailyLogInput,
  GymActivityEventType,
  OnboardingFunnel,
  RetentionCohort,
  StudentDiscipline,
  StudentDisciplineRow,
  RunningSession,
  RunningSessionInput,
  RunningWeeklyTotal,
} from '../../shared/types';

import { isNative } from '../lib/platform';

const API_BASE = isNative()
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';
const DEFAULT_GYM_ID = '11111111-1111-1111-1111-111111111111';

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    console.error(`API error ${response.status} on ${url}`, json);
    throw new Error(json?.details || json?.error || `HTTP ${response.status}`);
  }

  return json;
}

function ensureArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizePlan(plan: any): Plan {
  return {
    ...plan,
    id: plan.id,
    nombre: plan.nombre ?? plan.name ?? 'Sin nombre',
    precio: Number(plan.precio ?? plan.price ?? 0),
    duracion_dias: Number(plan.duracion_dias ?? plan.durationDays ?? 30),
    clases_por_semana: plan.clases_por_semana ?? plan.classesPerWeek ?? null,
    activo: plan.activo ?? plan.active ?? true,
  };
}

function normalizeStudent(student: any, plans: Plan[] = []): Student {
  const nombre = student.nombre ?? student.name ?? '';
  const apellido = student.apellido ?? student.lastName ?? '';

  const matchedPlan = plans.find(
    (p: any) => p.id === (student.plan_id ?? student.planId)
  );

  const next_due_date = student.next_due_date ?? student.nextDueDate ?? null;

  let derivedStatus = student.status ?? 'activo';

  if (derivedStatus === 'active') derivedStatus = 'activo';
  if (derivedStatus === 'paused') derivedStatus = 'pausado';
  if (derivedStatus === 'inactive') derivedStatus = 'baja';

  return {
    ...student,
    id: student.id,
    nombre,
    apellido,
    name: `${nombre} ${apellido}`.trim(),
    telefono: student.telefono ?? student.phone ?? null,
    observaciones: student.observaciones ?? student.observations ?? null,
    plan_id: student.plan_id ?? student.planId ?? null,
    planName:
      student.planName ??
      student.plan_nombre ??
      matchedPlan?.name ??
      'Sin cuota asignada',
    next_due_date,
    nextDueDate: next_due_date,
    precio_personalizado: student.precio_personalizado ?? student.customPrice ?? null,
    tipo_beca: student.tipo_beca ?? student.discountType ?? 'ninguna',
    cobra_cuota: student.cobra_cuota ?? student.chargeFee ?? true,
    recordatorio_automatico: student.recordatorio_automatico ?? student.automaticReminder ?? true,
    whatsapp_opt_in: student.whatsapp_opt_in ?? student.whatsappOptIn ?? false,
    pricing_model:
      student.pricing_model ??
      ((student.cobra_cuota ?? student.chargeFee ?? true) ? 'mensual' : 'libre'),
    session_rate:
      student.session_rate != null ? Number(student.session_rate) : null,
    is_online: !!(student.is_online ?? student.isOnline ?? false),
    emergency_contact_name: student.emergency_contact_name ?? null,
    emergency_contact_phone: student.emergency_contact_phone ?? null,
    access_code: student.access_code ?? null,
    status: derivedStatus,
    debt: Number(
      student.debt ??
        student.precio_personalizado ??
        student.customPrice ??
        matchedPlan?.price ??
        0
    ),
  };
}

function normalizePayment(payment: any): Payment {
  const amount = Number(payment.monto ?? payment.amount ?? 0);
  const date = payment.fecha_pago ?? payment.date ?? null;
  const method = payment.metodo_pago ?? payment.method ?? 'otro';

  const studentName =
    payment.studentName ??
    payment.student_name ??
    payment.nombre_completo ??
    (payment.student
      ? `${payment.student.nombre ?? ''} ${payment.student.apellido ?? ''}`.trim()
      : 'Alumno');

  return {
    ...payment,
    id: payment.id,
    monto: amount,
    amount,
    fecha_pago: date,
    date,
    metodo_pago: method,
    method,
    studentName: studentName || 'Alumno',
  };
}

export const api = {
  dashboard: {
    async getStats(gymId: string = DEFAULT_GYM_ID): Promise<DashboardStats> {
      try {
        return await fetchJson(`${API_BASE}/dashboard?gymId=${gymId}`);
      } catch (error) {
        console.error('dashboard.getStats failed:', error);
        return {
          activeCount: 0,
          expiredCount: 0,
          expiringCount: 0,
          monthlyIncome: 0,
          pendingStudents: [],
        } as DashboardStats;
      }
    },
  },

  students: {
    async getAll(gymId: string = DEFAULT_GYM_ID): Promise<Student[]> {
      try {
        const [studentsRaw, plansRaw] = await Promise.all([
          fetchJson(`${API_BASE}/students?gymId=${gymId}`),
          fetchJson(`${API_BASE}/plans?gymId=${gymId}`),
        ]);

        const plans = ensureArray<Plan>(plansRaw).map(normalizePlan);
        const students = ensureArray<Student>(studentsRaw).map((student) =>
          normalizeStudent(student, plans)
        );

        return students;
      } catch (error) {
        console.error('students.getAll failed:', error);
        return [];
      }
    },

    async getById(id: string, gymId: string = DEFAULT_GYM_ID): Promise<Student> {
      const student = await fetchJson(`${API_BASE}/students/${id}?gymId=${gymId}`);
      return normalizeStudent(student, []);
    },

    async create(student: Partial<Student>): Promise<Student> {
      const created = await fetchJson(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });

      return normalizeStudent(created, []);
    },

    async update(id: string, updates: Partial<Student>): Promise<Student> {
      const updated = await fetchJson(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      return normalizeStudent(updated, []);
    },

    async delete(id: string, gymId: string = DEFAULT_GYM_ID): Promise<void> {
      await fetchJson(`${API_BASE}/students/${id}?gymId=${gymId}`, { method: 'DELETE' });
    },

    async setCustomCode(id: string, currentCode: string, newCode: string): Promise<void> {
      await fetchJson(`${API_BASE}/students/${id}/set-custom-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_code: currentCode, new_code: newCode }),
      });
    },

    async regenerateAccessCode(id: string, gymId: string = DEFAULT_GYM_ID): Promise<{ access_code: string }> {
      return fetchJson(`${API_BASE}/students/${id}/regenerate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymId }),
      });
    },
  },

  plans: {
    async getAll(gymId: string = DEFAULT_GYM_ID): Promise<Plan[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/plans?gymId=${gymId}`);
        return ensureArray<Plan>(raw).map(normalizePlan);
      } catch (error) {
        console.error('plans.getAll failed:', error);
        return [];
      }
    },

    async create(plan: Partial<Plan>): Promise<Plan> {
      const created = await fetchJson(`${API_BASE}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });

      return normalizePlan(created);
    },

    async update(id: string, updates: Partial<Plan>): Promise<Plan> {
      const updated = await fetchJson(`${API_BASE}/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      return normalizePlan(updated);
    },

    async delete(id: string): Promise<void> {
      await fetchJson(`${API_BASE}/plans/${id}`, { method: 'DELETE' });
    },
  },

  payments: {
    async getAll(gymId: string = DEFAULT_GYM_ID): Promise<Payment[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/payments?gymId=${gymId}`);
        return ensureArray<Payment>(raw).map(normalizePayment);
      } catch (error) {
        console.error('payments.getAll failed:', error);
        return [];
      }
    },

    async register(payment: any): Promise<Payment> {
      const created = await fetchJson(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });

      return normalizePayment(created);
    },
  },

  automation: {
    async getStatus(gymId: string = DEFAULT_GYM_ID): Promise<AutomationStatus> {
      try {
        return await fetchJson(`${API_BASE}/automation/status?gymId=${gymId}`);
      } catch (error) {
        console.error('automation.getStatus failed:', error);
        return {
          lastRun: null,
          nextRun: null,
          lastResult: null,
        } as AutomationStatus;
      }
    },

    async getLogs(gymId: string = DEFAULT_GYM_ID): Promise<ReminderLog[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/automation/logs?gymId=${gymId}`);
        return ensureArray<ReminderLog>(raw);
      } catch (error) {
        console.error('automation.getLogs failed:', error);
        return [];
      }
    },

    async run(gymId: string = DEFAULT_GYM_ID): Promise<any> {
      try {
        return await fetchJson(`${API_BASE}/automation/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gymId }),
        });
      } catch (error) {
        console.error('automation.run failed:', error);
        return { ok: false, error: String(error) };
      }
    },
  },

  subscriptions: {
    async getAll(): Promise<GymSubscription[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/subscriptions`);
        return ensureArray<GymSubscription>(raw);
      } catch (error) {
        console.error('subscriptions.getAll failed:', error);
        return [];
      }
    },

    async getByGymId(gymId: string): Promise<GymSubscription | null> {
      try {
        return await fetchJson(`${API_BASE}/subscriptions/${gymId}`);
      } catch {
        return null;
      }
    },

    async update(gymId: string, updates: Partial<GymSubscription>): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    },

    async activate(gymId: string, periodEnd: string, planTier?: GymPlanTier): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_end: periodEnd, plan_tier: planTier }),
      });
    },

    async suspend(gymId: string): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}/suspend`, { method: 'POST' });
    },

    async cancel(gymId: string): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}/cancel`, { method: 'POST' });
    },

    async startTrial(gymId: string, trialDays: number = 30): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trial_days: trialDays }),
      });
    },

    async extend(gymId: string, periodEnd: string): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_end: periodEnd }),
      });
    },

    async markPastDue(gymId: string): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/${gymId}/past-due`, { method: 'POST' });
    },

    async getBillingPayments(gymId?: string): Promise<GymBillingPayment[]> {
      try {
        const qs = gymId ? `?gymId=${gymId}` : '';
        const raw = await fetchJson(`${API_BASE}/subscriptions/billing${qs}`);
        return ensureArray<GymBillingPayment>(raw);
      } catch (error) {
        console.error('subscriptions.getBillingPayments failed:', error);
        return [];
      }
    },

    async recordBillingPayment(payment: {
      gym_id: string;
      amount: number;
      currency?: string;
      period_start: string;
      period_end: string;
      payment_method: string;
      reference?: string;
      notes?: string;
      recorded_by?: string;
    }): Promise<GymBillingPayment> {
      return fetchJson(`${API_BASE}/subscriptions/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });
    },

    async createGym(data: {
      name: string;
      owner_email: string;
      owner_phone?: string;
      password?: string;
      plan_tier?: GymPlanTier;
      trial_days?: number;
      gym_type?: 'gym' | 'personal_trainer';
      monthly_price?: number | null;
    }): Promise<GymSubscription> {
      return fetchJson(`${API_BASE}/subscriptions/gyms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  },

  activity: {
    async log(params: {
      gym_id: string;
      event_type: Extract<GymActivityEventType, 'login' | 'onboarding_step_completed'>;
      event_data?: Record<string, any>;
      user_id?: string | null;
    }): Promise<void> {
      try {
        await fetchJson(`${API_BASE}/activity/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
      } catch (error) {
        // Silent — no queremos romper la UX por un log de telemetría
        console.warn('activity.log failed:', error);
      }
    },

    async getFunnel(): Promise<OnboardingFunnel | null> {
      try {
        return await fetchJson(`${API_BASE}/activity/funnel`);
      } catch (error) {
        console.error('activity.getFunnel failed:', error);
        return null;
      }
    },

    async getRetention(weeks = 8): Promise<RetentionCohort[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/activity/retention?weeks=${weeks}`);
        return ensureArray<RetentionCohort>(raw);
      } catch (error) {
        console.error('activity.getRetention failed:', error);
        return [];
      }
    },
  },

  outreach: {
    async getRange(from?: string, to?: string): Promise<OutreachDailyLog[]> {
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        const raw = await fetchJson(`${API_BASE}/outreach${qs ? `?${qs}` : ''}`);
        return ensureArray<OutreachDailyLog>(raw);
      } catch (error) {
        console.error('outreach.getRange failed:', error);
        return [];
      }
    },

    async upsertDay(date: string, input: OutreachDailyLogInput): Promise<OutreachDailyLog> {
      return fetchJson(`${API_BASE}/outreach/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },

    async remove(date: string): Promise<void> {
      await fetchJson(`${API_BASE}/outreach/${date}`, { method: 'DELETE' });
    },
  },

  staff: {
    async getByGym(gymId: string): Promise<{ id: string; email: string; name: string }[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/staff?gymId=${gymId}`);
        return ensureArray(raw);
      } catch (error) {
        console.error('staff.getByGym failed:', error);
        return [];
      }
    },

    async create(data: { email: string; password: string; name: string; gym_id: string }): Promise<{ id: string; email: string; name: string }> {
      return fetchJson(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    async remove(userId: string): Promise<void> {
      await fetchJson(`${API_BASE}/staff/${userId}`, { method: 'DELETE' });
    },
  },

  running: {
    async listDisciplines(studentId: string): Promise<StudentDisciplineRow[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/running/students/${studentId}/disciplines`);
        return ensureArray(raw);
      } catch (error) {
        console.error('running.listDisciplines failed:', error);
        return [];
      }
    },

    async addDiscipline(studentId: string, gymId: string, discipline: StudentDiscipline): Promise<StudentDisciplineRow> {
      return fetchJson(`${API_BASE}/running/students/${studentId}/disciplines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id: gymId, discipline }),
      });
    },

    async removeDiscipline(studentId: string, discipline: StudentDiscipline): Promise<void> {
      await fetchJson(`${API_BASE}/running/students/${studentId}/disciplines/${discipline}`, { method: 'DELETE' });
    },

    async listSessions(studentId: string, opts: { from?: string; to?: string; limit?: number } = {}): Promise<RunningSession[]> {
      try {
        const params = new URLSearchParams();
        if (opts.from) params.set('from', opts.from);
        if (opts.to) params.set('to', opts.to);
        if (opts.limit) params.set('limit', String(opts.limit));
        const qs = params.toString();
        const raw = await fetchJson(`${API_BASE}/running/students/${studentId}/sessions${qs ? `?${qs}` : ''}`);
        return ensureArray(raw);
      } catch (error) {
        console.error('running.listSessions failed:', error);
        return [];
      }
    },

    async weeklyTotals(studentId: string, weeks = 8): Promise<RunningWeeklyTotal[]> {
      try {
        const raw = await fetchJson(`${API_BASE}/running/students/${studentId}/sessions/weekly?weeks=${weeks}`);
        return ensureArray(raw);
      } catch (error) {
        console.error('running.weeklyTotals failed:', error);
        return [];
      }
    },

    async createSession(input: RunningSessionInput): Promise<RunningSession> {
      return fetchJson(`${API_BASE}/running/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },

    async updateSession(id: string, patch: Partial<RunningSessionInput>): Promise<RunningSession> {
      return fetchJson(`${API_BASE}/running/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    },

    async deleteSession(id: string): Promise<void> {
      await fetchJson(`${API_BASE}/running/sessions/${id}`, { method: 'DELETE' });
    },
  },
};