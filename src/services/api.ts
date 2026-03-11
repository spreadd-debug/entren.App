import {
  Student,
  Payment,
  Plan,
  ReminderLog,
  AutomationStatus,
  DashboardStats,
} from '../../shared/types';

const API_BASE = '/api';
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
    plan_id: student.plan_id ?? student.planId ?? null,
    planName:
      student.planName ??
      student.plan_nombre ??
      matchedPlan?.nombre ??
      'Sin plan',
    next_due_date,
    nextDueDate: next_due_date,
    precio_personalizado: student.precio_personalizado ?? null,
    tipo_beca: student.tipo_beca ?? 'ninguna',
    cobra_cuota: student.cobra_cuota ?? true,
    recordatorio_automatico: student.recordatorio_automatico ?? true,
    whatsapp_opt_in: student.whatsapp_opt_in ?? false,
    status: derivedStatus,
    debt: Number(
      student.debt ??
        student.precio_personalizado ??
        matchedPlan?.precio ??
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
          activeStudents: 0,
          expiredStudents: 0,
          expiringStudents: 0,
          monthlyRevenue: 0,
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

    async getById(id: string): Promise<Student> {
      const student = await fetchJson(`${API_BASE}/students/${id}`);
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

    async delete(id: string): Promise<void> {
      await fetchJson(`${API_BASE}/students/${id}`, { method: 'DELETE' });
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
          lastRunAt: null,
          nextRunAt: null,
          lastRunSummary: null,
          pendingCount: 0,
          sentCount: 0,
          failedCount: 0,
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
};