// api/_handler.ts
import "dotenv/config";
import express from "express";
import cors from "cors";

// server/routes/students.ts
import { Router } from "express";

// server/mappers/student.mapper.ts
function mapStudentRowToStudent(row) {
  return {
    id: row.id ?? "",
    gymId: row.gym_id,
    planId: row.plan_id ?? void 0,
    name: row.nombre,
    lastName: row.apellido ?? "",
    phone: row.telefono ?? "",
    status: row.status === "inactive" || row.status === "inactivo" ? "inactive" : "active",
    customPrice: row.precio_personalizado ?? void 0,
    discountType: row.tipo_beca ?? void 0,
    chargeFee: row.cobra_cuota ?? true,
    automaticReminder: row.recordatorio_automatico ?? true,
    whatsappOptIn: row.whatsapp_opt_in ?? false,
    whatsappOptInAt: row.whatsapp_opt_in_at ?? void 0,
    lastPaymentDate: row.last_payment_date ?? void 0,
    nextDueDate: row.next_due_date ?? void 0,
    observations: row.observaciones ?? void 0,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? ""
  };
}

// server/db/supabase.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is missing in .env");
}
if (!supabaseKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is missing in .env");
}
var supabase = createClient(supabaseUrl, supabaseKey);

// server/services/StudentService.ts
var DEFAULT_GYM_ID = "11111111-1111-1111-1111-111111111111";
var StudentService = {
  async getAll(gymId) {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;
    const { data, error } = await supabase.from("students").select(`
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
      `).eq("gym_id", resolvedGymId).order("nombre", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => mapStudentRowToStudent(row));
  },
  async getById(id) {
    const { data, error } = await supabase.from("students").select(`
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
      `).eq("id", id).single();
    if (error) throw error;
    if (!data) return null;
    return mapStudentRowToStudent(data);
  },
  async create(student) {
    const payload = {
      gym_id: student.gym_id ?? student.gymId ?? DEFAULT_GYM_ID,
      plan_id: student.plan_id ?? student.planId ?? null,
      nombre: student.nombre ?? student.firstName ?? student.name ?? "",
      apellido: student.apellido ?? student.lastName ?? "",
      telefono: student.telefono ?? student.phone ?? null,
      status: student.status ?? "activo",
      precio_personalizado: student.precio_personalizado ?? student.customPrice ?? null,
      tipo_beca: student.tipo_beca ?? student.discountType ?? "ninguna",
      cobra_cuota: student.cobra_cuota ?? true,
      recordatorio_automatico: student.recordatorio_automatico ?? true,
      whatsapp_opt_in: student.whatsapp_opt_in ?? false,
      whatsapp_opt_in_at: student.whatsapp_opt_in ? (/* @__PURE__ */ new Date()).toISOString() : null,
      last_payment_date: student.last_payment_date ?? student.lastPaymentDate ?? null,
      next_due_date: student.next_due_date ?? student.nextDueDate ?? null,
      observaciones: student.observaciones ?? student.observations ?? null
    };
    const { data, error } = await supabase.from("students").insert([payload]).select(`
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
      `).single();
    if (error) throw error;
    const createdStudent = data;
    if (createdStudent.plan_id) {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const { error: membershipError } = await supabase.from("memberships").insert([
        {
          gym_id: createdStudent.gym_id,
          student_id: createdStudent.id,
          plan_id: createdStudent.plan_id,
          status: "active",
          start_date: today,
          next_due_date: createdStudent.next_due_date ?? null,
          custom_price: createdStudent.precio_personalizado ?? null,
          discount_type: createdStudent.tipo_beca ?? null,
          auto_renew: true,
          notes: createdStudent.observaciones ?? null
        }
      ]);
      if (membershipError) throw membershipError;
    }
    return mapStudentRowToStudent(data);
  },
  async update(id, updates) {
    const payload = {};
    if (updates.gym_id !== void 0 || updates.gymId !== void 0) {
      payload.gym_id = updates.gym_id ?? updates.gymId;
    }
    if (updates.plan_id !== void 0 || updates.planId !== void 0) {
      payload.plan_id = updates.plan_id ?? updates.planId;
    }
    if (updates.nombre !== void 0 || updates.firstName !== void 0 || updates.name !== void 0) {
      payload.nombre = updates.nombre ?? updates.firstName ?? updates.name;
    }
    if (updates.apellido !== void 0 || updates.lastName !== void 0) {
      payload.apellido = updates.apellido ?? updates.lastName;
    }
    if (updates.telefono !== void 0 || updates.phone !== void 0) {
      payload.telefono = updates.telefono ?? updates.phone;
    }
    if (updates.status !== void 0) payload.status = updates.status;
    if (updates.precio_personalizado !== void 0 || updates.customPrice !== void 0) {
      payload.precio_personalizado = updates.precio_personalizado ?? updates.customPrice;
    }
    if (updates.tipo_beca !== void 0 || updates.discountType !== void 0) {
      payload.tipo_beca = updates.tipo_beca ?? updates.discountType;
    }
    if (updates.cobra_cuota !== void 0) payload.cobra_cuota = updates.cobra_cuota;
    if (updates.recordatorio_automatico !== void 0) payload.recordatorio_automatico = updates.recordatorio_automatico;
    if (updates.whatsapp_opt_in !== void 0) {
      payload.whatsapp_opt_in = updates.whatsapp_opt_in;
      payload.whatsapp_opt_in_at = updates.whatsapp_opt_in ? (/* @__PURE__ */ new Date()).toISOString() : null;
    }
    if (updates.last_payment_date !== void 0 || updates.lastPaymentDate !== void 0) {
      payload.last_payment_date = updates.last_payment_date ?? updates.lastPaymentDate;
    }
    if (updates.next_due_date !== void 0 || updates.nextDueDate !== void 0) {
      payload.next_due_date = updates.next_due_date ?? updates.nextDueDate;
    }
    if (updates.observaciones !== void 0 || updates.observations !== void 0) {
      payload.observaciones = updates.observaciones ?? updates.observations;
    }
    const { data, error } = await supabase.from("students").update(payload).eq("id", id).select(`
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
      `).single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
  }
};

// server/routes/students.ts
var router = Router();
router.get("/", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const students = await StudentService.getAll(gymId);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const student = await StudentService.getById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post("/", async (req, res) => {
  try {
    const student = await StudentService.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const student = await StudentService.update(req.params.id, req.body);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    await StudentService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var students_default = router;

// server/routes/plans.ts
import { Router as Router2 } from "express";

// server/config/gym.ts
var CURRENT_GYM_ID = "11111111-1111-1111-1111-111111111111";

// server/services/PlanService.ts
var DEFAULT_GYM_ID2 = "11111111-1111-1111-1111-111111111111";
var PlanService = {
  async getAll(gymId) {
    const resolvedGymId = gymId || DEFAULT_GYM_ID2;
    const { data, error } = await supabase.from("plans").select(`
        id,
        gym_id,
        nombre,
        precio,
        duracion_dias,
        clases_por_semana,
        activo,
        created_at
      `).eq("gym_id", resolvedGymId).order("nombre", { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async create(plan) {
    const payload = {
      gym_id: plan.gym_id || DEFAULT_GYM_ID2,
      nombre: plan.nombre ?? plan.name ?? "",
      precio: Number(plan.precio ?? plan.price ?? 0),
      duracion_dias: Number(plan.duracion_dias ?? plan.durationDays ?? 30),
      clases_por_semana: plan.clases_por_semana ?? plan.classesPerWeek ?? null,
      activo: plan.activo ?? plan.active ?? true
    };
    const { data, error } = await supabase.from("plans").insert([payload]).select(`
        id,
        gym_id,
        nombre,
        precio,
        duracion_dias,
        clases_por_semana,
        activo,
        created_at
      `).single();
    if (error) throw error;
    return data;
  },
  async update(id, updates) {
    const payload = {};
    if (updates.gym_id !== void 0) payload.gym_id = updates.gym_id;
    if (updates.nombre !== void 0 || updates.name !== void 0) {
      payload.nombre = updates.nombre ?? updates.name;
    }
    if (updates.precio !== void 0 || updates.price !== void 0) {
      payload.precio = Number(updates.precio ?? updates.price ?? 0);
    }
    if (updates.duracion_dias !== void 0 || updates.durationDays !== void 0) {
      payload.duracion_dias = Number(updates.duracion_dias ?? updates.durationDays ?? 30);
    }
    if (updates.clases_por_semana !== void 0 || updates.classesPerWeek !== void 0) {
      payload.clases_por_semana = updates.clases_por_semana ?? updates.classesPerWeek;
    }
    if (updates.activo !== void 0 || updates.active !== void 0) {
      payload.activo = updates.activo ?? updates.active;
    }
    const { data, error } = await supabase.from("plans").update(payload).eq("id", id).eq("gym_id", CURRENT_GYM_ID).select(`
        id,
        gym_id,
        nombre,
        precio,
        duracion_dias,
        clases_por_semana,
        activo,
        created_at
      `).single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from("plans").delete().eq("id", id).eq("gym_id", CURRENT_GYM_ID);
    if (error) throw error;
  }
};

// server/routes/plans.ts
var router2 = Router2();
router2.get("/", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const plans = await PlanService.getAll(gymId);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router2.post("/", async (req, res) => {
  try {
    const plan = await PlanService.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router2.put("/:id", async (req, res) => {
  try {
    const plan = await PlanService.update(req.params.id, req.body);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router2.delete("/:id", async (req, res) => {
  try {
    await PlanService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var plans_default = router2;

// server/routes/payments.ts
import { Router as Router3 } from "express";

// server/services/PaymentService.ts
var DEFAULT_GYM_ID3 = "11111111-1111-1111-1111-111111111111";
function normalizePaymentMethod(method) {
  const value = String(method || "").toLowerCase();
  if (value === "cash" || value === "efectivo") return "efectivo";
  if (value === "transfer" || value === "transferencia") return "transferencia";
  if (value === "mercadopago" || value === "mercado_pago") return "mercado_pago";
  if (value === "tarjeta") return "tarjeta";
  return "otro";
}
var PaymentService = {
  async getAll(gymId) {
    const resolvedGymId = gymId || DEFAULT_GYM_ID3;
    const { data, error } = await supabase.from("payments").select(`
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
      `).eq("gym_id", resolvedGymId).order("fecha_pago", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async register(payment) {
    const studentId = payment.student_id ?? payment.studentId;
    const gymId = payment.gym_id ?? payment.gymId ?? DEFAULT_GYM_ID3;
    const monto = Number(payment.monto ?? payment.amount ?? 0);
    const metodoPago = normalizePaymentMethod(payment.metodo_pago ?? payment.method);
    const fechaPago = payment.fecha_pago ?? payment.date ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (!studentId) {
      throw new Error("studentId is required");
    }
    const { data: membership, error: membershipError } = await supabase.from("memberships").select(`
        id,
        student_id,
        gym_id,
        plan_id,
        status,
        created_at
      `).eq("student_id", studentId).eq("gym_id", gymId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (membershipError) throw membershipError;
    const payload = {
      student_id: studentId,
      membership_id: membership?.id ?? null,
      gym_id: gymId,
      monto,
      metodo_pago: metodoPago,
      fecha_pago: fechaPago,
      notes: payment.notes ?? null
    };
    const { data, error } = await supabase.from("payments").insert([payload]).select(`
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
      `).single();
    if (error) throw error;
    return data;
  }
};

// server/routes/payments.ts
var router3 = Router3();
router3.get("/", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const payments = await PaymentService.getAll(gymId);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router3.post("/", async (req, res) => {
  try {
    const payment = await PaymentService.register(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var payments_default = router3;

// server/routes/dashboard.ts
import { Router as Router4 } from "express";

// server/services/DashboardService.ts
var DashboardService = {
  async getStats(gymId) {
    const students = await StudentService.getAll(gymId);
    const payments = await PaymentService.getAll(gymId);
    const activeCount = students.filter((s) => s.status === "active").length;
    const expiredCount = students.filter((s) => s.status === "expired").length;
    const expiringCount = students.filter((s) => s.status === "expiring").length;
    const now = /* @__PURE__ */ new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyIncome = payments.filter((p) => {
      const pDate = new Date(p.date);
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    }).reduce((sum, p) => sum + p.amount, 0);
    const pendingStudents = students.filter((s) => s.status === "expired" || s.status === "expiring").sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    return {
      activeCount,
      expiredCount,
      expiringCount,
      monthlyIncome,
      pendingStudents
    };
  }
};

// server/routes/dashboard.ts
var router4 = Router4();
router4.get("/", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const stats = await DashboardService.getStats(gymId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var dashboard_default = router4;

// server/routes/automation.ts
import { Router as Router5 } from "express";

// server/services/BillingReminderService.ts
var BillingReminderService = {
  async getRules(gymId) {
    const { data, error } = await supabase.from("reminder_rules").select("*").eq("gym_id", gymId);
    if (error) throw error;
    return data || [];
  },
  async getTemplates(gymId) {
    const { data, error } = await supabase.from("message_templates").select("*").eq("gym_id", gymId);
    if (error) throw error;
    return data || [];
  },
  async getLogs(gymId) {
    const { data, error } = await supabase.from("reminder_logs").select("*").eq("gym_id", gymId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async runDailyCheck(gymId) {
    const students = await StudentService.getAll(gymId);
    const rules = await this.getRules(gymId);
    const templates = await this.getTemplates(gymId);
    const plans = await PlanService.getAll(gymId);
    const logs = await this.getLogs(gymId);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const today = new Date(todayStr);
    let totalEvaluated = 0;
    let totalEligible = 0;
    let totalGenerated = 0;
    let totalIgnored = 0;
    const newLogs = [];
    for (const student of students) {
      totalEvaluated++;
      const isEligible = (student.status === "active" || student.status === "expiring" || student.status === "expired") && student.cobra_cuota && student.recordatorio_automatico && student.whatsapp_opt_in && student.phone && student.nextDueDate;
      if (!isEligible) {
        totalIgnored++;
        continue;
      }
      totalEligible++;
      for (const rule of rules.filter((r) => r.active)) {
        const dueDate = new Date(student.nextDueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
        let shouldTrigger = false;
        if (rule.triggerType === "before" && diffDays === rule.offsetDays) shouldTrigger = true;
        else if (rule.triggerType === "on_day" && diffDays === 0) shouldTrigger = true;
        else if (rule.triggerType === "after" && diffDays === -rule.offsetDays) shouldTrigger = true;
        if (shouldTrigger) {
          const alreadySent = logs.some(
            (log) => log.studentId === student.id && log.ruleCode === rule.code && log.scheduledFor === todayStr
          );
          if (!alreadySent) {
            const template = templates.find((t) => t.code === rule.code && t.active);
            if (template) {
              const plan = plans.find((p) => p.id === student.planId);
              const message = this.formatMessage(template.body, student, plan, "Gimnasio Pro");
              const log = {
                gym_id: gymId,
                studentId: student.id,
                ruleCode: rule.code,
                scheduledFor: todayStr,
                status: "pending",
                channel: "whatsapp",
                messagePreview: message
              };
              const { data: savedLog, error: logError } = await supabase.from("reminder_logs").insert([log]).select().single();
              if (!logError && savedLog) {
                newLogs.push(savedLog);
                totalGenerated++;
              }
            }
          }
        }
      }
    }
    return {
      totalEvaluated,
      totalEligible,
      totalGenerated,
      totalIgnored,
      newLogs
    };
  },
  formatMessage(body, student, plan, gymName = "Gimnasio Pro") {
    const dueDate = new Date(student.nextDueDate);
    const today = /* @__PURE__ */ new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1e3 * 60 * 60 * 24)));
    const variables = {
      "{nombre}": student.name,
      "{apellido}": student.apellido || student.lastName || "",
      "{plan}": plan?.name || student.planName || "",
      "{fecha_vencimiento}": student.nextDueDate,
      "{dias_atraso}": diffDays.toString(),
      "{precio}": (student.precio_personalizado || plan?.price || 0).toString(),
      "{gimnasio}": gymName
    };
    let formatted = body;
    Object.entries(variables).forEach(([key, value]) => {
      formatted = formatted.replace(new RegExp(key, "g"), value);
    });
    return formatted;
  }
};

// server/routes/automation.ts
var router5 = Router5();
router5.get("/status", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const logs = await BillingReminderService.getLogs(gymId);
    const lastRun = logs.length > 0 ? logs[0].created_at : null;
    res.json({
      lastRun,
      nextRun: lastRun ? new Date(new Date(lastRun).getTime() + 864e5).toISOString() : null,
      lastResult: null
      // Could be stored in a separate table if needed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router5.get("/logs", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const logs = await BillingReminderService.getLogs(gymId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router5.post("/run", async (req, res) => {
  try {
    const gymId = req.body.gymId || "11111111-1111-1111-1111-111111111111";
    const result = await BillingReminderService.runDailyCheck(gymId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var automation_default = router5;

// server/routes/subscriptions.ts
import { Router as Router6 } from "express";

// server/services/SubscriptionService.ts
function mapRow(row) {
  return {
    ...row,
    gym_name: row.gym?.name ?? "Desconocido",
    owner_email: row.gym?.owner_email ?? ""
  };
}
var GYM_SELECT = `*, gym:gyms (name, owner_email)`;
var SubscriptionService = {
  async getAll() {
    const { data, error } = await supabase.from("gym_subscriptions").select(GYM_SELECT).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },
  async getByGymId(gymId) {
    const { data, error } = await supabase.from("gym_subscriptions").select(GYM_SELECT).eq("gym_id", gymId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapRow(data);
  },
  async upsert(gymId, updates) {
    const { gym_name, owner_email, ...rest } = updates;
    const payload = { ...rest, gym_id: gymId };
    const { data, error } = await supabase.from("gym_subscriptions").upsert(payload, { onConflict: "gym_id" }).select(GYM_SELECT).single();
    if (error) throw error;
    return mapRow(data);
  },
  async activate(gymId, periodEnd, planTier) {
    return this.upsert(gymId, {
      status: "active",
      current_period_start: (/* @__PURE__ */ new Date()).toISOString(),
      current_period_end: periodEnd,
      access_enabled: true,
      ...planTier ? { plan_tier: planTier } : {}
    });
  },
  async suspend(gymId) {
    return this.upsert(gymId, { status: "suspended", access_enabled: false });
  },
  async cancel(gymId) {
    return this.upsert(gymId, { status: "cancelled", access_enabled: false });
  },
  async startTrial(gymId, trialDays = 30) {
    const trialEndsAt = /* @__PURE__ */ new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    return this.upsert(gymId, {
      status: "trial",
      trial_ends_at: trialEndsAt.toISOString(),
      access_enabled: true
    });
  },
  async extend(gymId, newPeriodEnd) {
    return this.upsert(gymId, {
      status: "active",
      current_period_end: newPeriodEnd,
      access_enabled: true
    });
  },
  async markPastDue(gymId) {
    const existing = await this.getByGymId(gymId);
    const graceDays = existing?.grace_period_days ?? 7;
    const graceEndsAt = /* @__PURE__ */ new Date();
    graceEndsAt.setDate(graceEndsAt.getDate() + graceDays);
    return this.upsert(gymId, {
      status: "past_due",
      grace_period_ends_at: graceEndsAt.toISOString(),
      access_enabled: true
    });
  },
  async createGym(name, ownerEmail, planTier = "basic", trialDays = 30) {
    const { data: gym, error: gymError } = await supabase.from("gyms").insert([{ name, owner_email: ownerEmail }]).select("id").single();
    if (gymError) throw gymError;
    const trialEndsAt = /* @__PURE__ */ new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    const { data, error } = await supabase.from("gym_subscriptions").insert([{
      gym_id: gym.id,
      plan_tier: planTier,
      status: "trial",
      trial_ends_at: trialEndsAt.toISOString(),
      access_enabled: true
    }]).select(GYM_SELECT).single();
    if (error) throw error;
    return mapRow(data);
  },
  // ── Billing payments ───────────────────────────────────────────────────────
  async getBillingPayments(gymId) {
    let query = supabase.from("gym_billing_payments").select(`*, gym:gyms (name)`).order("created_at", { ascending: false });
    if (gymId) query = query.eq("gym_id", gymId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      gym_name: row.gym?.name ?? "Desconocido"
    }));
  },
  async recordBillingPayment(payment) {
    const payload = {
      gym_id: payment.gym_id,
      amount: Number(payment.amount),
      currency: payment.currency ?? "ARS",
      period_start: payment.period_start,
      period_end: payment.period_end,
      payment_method: payment.payment_method ?? "transfer",
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      recorded_by: payment.recorded_by ?? null
    };
    const { data, error } = await supabase.from("gym_billing_payments").insert([payload]).select(`*, gym:gyms (name)`).single();
    if (error) throw error;
    await this.activate(payment.gym_id, payment.period_end);
    return { ...data, gym_name: data.gym?.name ?? "Desconocido" };
  }
};

// server/routes/subscriptions.ts
var router6 = Router6();
router6.get("/billing", async (req, res) => {
  try {
    const gymId = req.query.gymId;
    const payments = await SubscriptionService.getBillingPayments(gymId);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/billing", async (req, res) => {
  try {
    const payment = await SubscriptionService.recordBillingPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/gyms", async (req, res) => {
  try {
    const { name, owner_email, plan_tier = "basic", trial_days = 30 } = req.body;
    if (!name || !owner_email) {
      return res.status(400).json({ error: "name y owner_email son requeridos" });
    }
    const sub = await SubscriptionService.createGym(name, owner_email, plan_tier, Number(trial_days));
    res.status(201).json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.get("/", async (_req, res) => {
  try {
    const subscriptions = await SubscriptionService.getAll();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.get("/:gymId", async (req, res) => {
  try {
    const sub = await SubscriptionService.getByGymId(req.params.gymId);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.put("/:gymId", async (req, res) => {
  try {
    const updated = await SubscriptionService.upsert(req.params.gymId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/:gymId/activate", async (req, res) => {
  try {
    const { period_end, plan_tier } = req.body;
    if (!period_end) return res.status(400).json({ error: "period_end is required" });
    const updated = await SubscriptionService.activate(req.params.gymId, period_end, plan_tier);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/:gymId/suspend", async (req, res) => {
  try {
    const updated = await SubscriptionService.suspend(req.params.gymId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/:gymId/cancel", async (req, res) => {
  try {
    const updated = await SubscriptionService.cancel(req.params.gymId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/:gymId/trial", async (req, res) => {
  try {
    const { trial_days = 30 } = req.body;
    const updated = await SubscriptionService.startTrial(req.params.gymId, Number(trial_days));
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/:gymId/extend", async (req, res) => {
  try {
    const { period_end } = req.body;
    if (!period_end) return res.status(400).json({ error: "period_end is required" });
    const updated = await SubscriptionService.extend(req.params.gymId, period_end);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.post("/:gymId/past-due", async (req, res) => {
  try {
    const updated = await SubscriptionService.markPastDue(req.params.gymId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var subscriptions_default = router6;

// api/_handler.ts
var app = express();
app.use(cors());
app.use(express.json());
app.use("/api/students", students_default);
app.use("/api/plans", plans_default);
app.use("/api/payments", payments_default);
app.use("/api/dashboard", dashboard_default);
app.use("/api/automation", automation_default);
app.use("/api/subscriptions", subscriptions_default);
app.get("/api/health", async (_req, res) => {
  const supabaseUrl2 = process.env.SUPABASE_URL;
  const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const status = {
    env: {
      SUPABASE_URL: supabaseUrl2 ? `OK (${supabaseUrl2.slice(0, 30)}...)` : "MISSING",
      SUPABASE_KEY: supabaseKey2 ? `OK (length: ${supabaseKey2.length})` : "MISSING"
    },
    db: null
  };
  try {
    const { createClient: createClient2 } = await import("@supabase/supabase-js");
    const client = createClient2(supabaseUrl2, supabaseKey2);
    const { data, error } = await client.from("gym_subscriptions").select("gym_id").limit(1);
    status.db = error ? { error: error.message } : { ok: true, rows: data?.length ?? 0 };
  } catch (e) {
    status.db = { error: e.message };
  }
  res.json(status);
});
app.get("/api/data", async (req, res) => {
  try {
    const gymId = "11111111-1111-1111-1111-111111111111";
    const [students, payments, plans, logs, rules, templates] = await Promise.all([
      StudentService.getAll(gymId),
      PaymentService.getAll(gymId),
      PlanService.getAll(gymId),
      BillingReminderService.getLogs(gymId),
      BillingReminderService.getRules(gymId),
      BillingReminderService.getTemplates(gymId)
    ]);
    res.json({
      students,
      payments,
      plans,
      reminderLogs: logs,
      reminderRules: rules,
      messageTemplates: templates,
      automationStatus: { lastRun: logs.length > 0 ? logs[0].created_at : null, nextRun: null, lastResult: null }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var handler_default = app;
export {
  handler_default as default
};
