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
    emergency_contact_name: row.emergency_contact_name ?? void 0,
    emergency_contact_phone: row.emergency_contact_phone ?? void 0,
    access_code: row.access_code ?? void 0,
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
function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
        created_at,
        updated_at
      `).eq("gym_id", resolvedGymId).order("nombre", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => mapStudentRowToStudent(row));
  },
  async getById(id, gymId) {
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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
        created_at,
        updated_at
      `).eq("id", id).eq("gym_id", resolvedGymId).single();
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
      observaciones: student.observaciones ?? student.observations ?? null,
      emergency_contact_name: student.emergency_contact_name ?? null,
      emergency_contact_phone: student.emergency_contact_phone ?? null,
      access_code: generateAccessCode()
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
        emergency_contact_name,
        emergency_contact_phone,
        access_code,
        has_custom_code,
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
      const rawPlan = updates.plan_id ?? updates.planId;
      payload.plan_id = rawPlan || null;
    }
    if (updates.nombre !== void 0 || updates.firstName !== void 0 || updates.name !== void 0) {
      payload.nombre = updates.nombre ?? updates.firstName ?? updates.name;
    }
    if (updates.apellido !== void 0 || updates.lastName !== void 0) {
      payload.apellido = updates.apellido ?? updates.lastName;
    }
    if (updates.telefono !== void 0 || updates.phone !== void 0) {
      const rawPhone = updates.telefono ?? updates.phone;
      payload.telefono = rawPhone?.trim() || null;
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
      const rawObs = updates.observaciones ?? updates.observations;
      payload.observaciones = rawObs?.trim() || null;
    }
    if (updates.emergency_contact_name !== void 0) {
      payload.emergency_contact_name = updates.emergency_contact_name?.trim() || null;
    }
    if (updates.emergency_contact_phone !== void 0) {
      payload.emergency_contact_phone = updates.emergency_contact_phone?.trim() || null;
    }
    const gymId = updates.gym_id ?? updates.gymId ?? DEFAULT_GYM_ID;
    delete payload.gym_id;
    if (Object.keys(payload).length === 0) {
      const current = await this.getById(id, gymId);
      if (!current) throw new Error("Student not found");
      return current;
    }
    const { data, error } = await supabase.from("students").update(payload).eq("id", id).eq("gym_id", gymId).select(`
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
        created_at,
        updated_at
      `).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("No se encontr\xF3 el alumno o no se pudo actualizar");
    return mapStudentRowToStudent(data);
  },
  async regenerateAccessCode(id, gymId) {
    const newCode = generateAccessCode();
    const resolvedGymId = gymId || DEFAULT_GYM_ID;
    const { error } = await supabase.from("students").update({ access_code: newCode }).eq("id", id).eq("gym_id", resolvedGymId);
    if (error) throw error;
    return newCode;
  },
  async setCustomCode(id, currentCode, newCode) {
    const { data: student, error: fetchError } = await supabase.from("students").select("access_code").eq("id", id).single();
    if (fetchError) throw fetchError;
    if (!student) throw new Error("Alumno no encontrado");
    if (student.access_code?.toUpperCase() !== currentCode.toUpperCase()) {
      throw new Error("C\xF3digo actual incorrecto");
    }
    const { error } = await supabase.from("students").update({ access_code: newCode.toUpperCase(), has_custom_code: true }).eq("id", id);
    if (error) throw error;
  },
  async delete(id, gymId) {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;
    const { error } = await supabase.from("students").delete().eq("id", id).eq("gym_id", resolvedGymId);
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
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    const student = await StudentService.getById(req.params.id, gymId);
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
router.post("/:id/regenerate-code", async (req, res) => {
  try {
    const gymId = req.query.gymId || req.body.gymId || "11111111-1111-1111-1111-111111111111";
    const newCode = await StudentService.regenerateAccessCode(req.params.id, gymId);
    res.json({ access_code: newCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post("/:id/set-custom-code", async (req, res) => {
  try {
    const { current_code, new_code } = req.body;
    if (!current_code || !new_code) {
      return res.status(400).json({ error: "current_code and new_code are required" });
    }
    if (new_code.length < 4 || new_code.length > 8) {
      return res.status(400).json({ error: "El c\xF3digo debe tener entre 4 y 8 caracteres" });
    }
    await StudentService.setCustomCode(req.params.id, current_code, new_code);
    res.json({ ok: true });
  } catch (error) {
    const status = error.message === "C\xF3digo actual incorrecto" ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const gymId = req.query.gymId || "11111111-1111-1111-1111-111111111111";
    await StudentService.delete(req.params.id, gymId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var students_default = router;

// server/routes/plans.ts
import { Router as Router2 } from "express";

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
    const { data, error } = await supabase.from("plans").update(payload).eq("id", id).eq("gym_id", updates.gym_id ?? DEFAULT_GYM_ID2).select(`
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
  async delete(id, gymId) {
    let query = supabase.from("plans").delete().eq("id", id);
    if (gymId) query = query.eq("gym_id", gymId);
    const { error } = await query;
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
    const gymId = req.query.gymId;
    await PlanService.delete(req.params.id, gymId);
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
    const { data: studentCheck } = await supabase.from("students").select("id").eq("id", studentId).eq("gym_id", gymId).maybeSingle();
    if (!studentCheck) {
      throw new Error("Student not found for this gym");
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

// server/services/WhatsAppProvider.ts
var WhatsAppProvider = {
  async sendMessage(phone, message) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      console.warn(`[WhatsApp] Credenciales no configuradas, simulando env\xEDo a ${phone}`);
      return true;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "text",
            text: { body: message }
          })
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[WhatsApp] Error API (${res.status}):`, errText);
        return false;
      }
      const data = await res.json();
      console.log(`[WhatsApp] Mensaje enviado a ${cleanPhone}, id: ${data?.messages?.[0]?.id}`);
      return true;
    } catch (err) {
      console.error("[WhatsApp] Error de red:", err);
      return false;
    }
  }
};

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
                const sent = await WhatsAppProvider.sendMessage(student.phone, message);
                await supabase.from("reminder_logs").update({
                  status: sent ? "sent" : "failed",
                  sentAt: (/* @__PURE__ */ new Date()).toISOString(),
                  ...sent ? {} : { error: "WhatsApp API call failed" }
                }).eq("id", savedLog.id);
                newLogs.push({ ...savedLog, status: sent ? "sent" : "failed" });
                if (sent) totalGenerated++;
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
router5.post("/cron", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { data: subs, error } = await supabase.from("gym_subscriptions").select("gym_id").in("plan_tier", ["pro", "business"]).eq("status", "active").eq("access_enabled", true);
    if (error) throw error;
    const gymIds = (subs || []).map((s) => s.gym_id);
    const results = await Promise.allSettled(
      gymIds.map((gymId) => BillingReminderService.runDailyCheck(gymId))
    );
    const summary = results.map((r, i) => ({
      gymId: gymIds[i],
      status: r.status,
      ...r.status === "fulfilled" ? { result: r.value } : { error: r.reason?.message }
    }));
    res.json({ ok: true, ran: gymIds.length, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var automation_default = router5;

// server/routes/subscriptions.ts
import { Router as Router6 } from "express";
import { createClient as createClient2 } from "@supabase/supabase-js";

// server/services/SubscriptionService.ts
function mapRow(row) {
  return {
    ...row,
    gym_name: row.gym?.name ?? "Desconocido",
    owner_email: row.gym?.owner_email ?? "",
    owner_phone: row.gym?.owner_phone ?? null,
    gym_type: row.gym?.gym_type ?? "gym"
  };
}
var GYM_SELECT = `*, gym:gyms (name, owner_email, owner_phone, gym_type)`;
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
    const { gym_name, owner_email, owner_phone, gym_type, ...rest } = updates;
    const payload = { ...rest, gym_id: gymId };
    const { data, error } = await supabase.from("gym_subscriptions").upsert(payload, { onConflict: "gym_id" }).select(GYM_SELECT).single();
    if (error) throw error;
    return mapRow(data);
  },
  async activate(gymId, periodEnd, planTier, skipPaymentCheck = false) {
    if (!skipPaymentCheck) {
      const { data: payments } = await supabase.from("gym_billing_payments").select("id").eq("gym_id", gymId).limit(1);
      if (!payments || payments.length === 0) {
        throw new Error("No se puede activar: el gimnasio no tiene pagos registrados. Registr\xE1 un pago primero.");
      }
    }
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
  async createGym(name, ownerEmail, planTier = "starter", trialDays = 30, ownerPhone, gymType = "gym", monthlyPrice) {
    const { data: gym, error: gymError } = await supabase.from("gyms").insert([{ name, owner_email: ownerEmail, gym_type: gymType, ...ownerPhone ? { owner_phone: ownerPhone } : {} }]).select("id, gym_type").single();
    if (gymError) throw gymError;
    const trialEndsAt = /* @__PURE__ */ new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    const { data, error } = await supabase.from("gym_subscriptions").insert([{
      gym_id: gym.id,
      plan_tier: planTier,
      status: "trial",
      trial_ends_at: trialEndsAt.toISOString(),
      access_enabled: true,
      ...monthlyPrice != null ? { monthly_price: monthlyPrice } : {}
    }]).select(GYM_SELECT).single();
    if (error) throw error;
    return mapRow(data);
  },
  // ── Billing payments ───────────────────────────────────────────────────────
  async getBillingPayments(gymId) {
    let query = supabase.from("gym_billing_payments").select("*").order("created_at", { ascending: false });
    if (gymId) query = query.eq("gym_id", gymId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const gymIds = [...new Set(rows.map((r) => r.gym_id).filter(Boolean))];
    let gymNames = {};
    if (gymIds.length > 0) {
      const { data: gyms } = await supabase.from("gyms").select("id, name").in("id", gymIds);
      (gyms || []).forEach((g) => {
        gymNames[g.id] = g.name;
      });
    }
    return rows.map((row) => ({
      ...row,
      gym_name: gymNames[row.gym_id] ?? "Desconocido"
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
    const { data, error } = await supabase.from("gym_billing_payments").insert([payload]).select("*").single();
    if (error) throw error;
    const { data: gym } = await supabase.from("gyms").select("name").eq("id", payment.gym_id).maybeSingle();
    await this.activate(payment.gym_id, payment.period_end, void 0, true);
    return { ...data, gym_name: gym?.name ?? "Desconocido" };
  }
};

// server/routes/subscriptions.ts
var router6 = Router6();
function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient2(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
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
    const { name, owner_email, owner_phone, plan_tier = "starter", trial_days = 30, gym_type = "gym", monthly_price, password } = req.body;
    if (!name || !owner_email) {
      return res.status(400).json({ error: "name y owner_email son requeridos" });
    }
    const sub = await SubscriptionService.createGym(name, owner_email, plan_tier, Number(trial_days), owner_phone, gym_type, monthly_price != null ? Number(monthly_price) : null);
    if (password) {
      const supabaseAdmin = getAdminClient();
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: owner_email,
        password,
        user_metadata: {
          gym_id: sub.gym_id,
          role: "admin",
          ...gym_type === "personal_trainer" ? { gym_type: "personal_trainer" } : {},
          must_change_password: true
        },
        email_confirm: true
      });
      if (authError) {
        return res.status(201).json({ ...sub, auth_warning: authError.message });
      }
    }
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
    const status = error.message?.includes("no tiene pagos registrados") ? 422 : 500;
    res.status(status).json({ error: error.message });
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

// server/routes/staff.ts
import { Router as Router7 } from "express";
import { createClient as createClient3 } from "@supabase/supabase-js";
var router7 = Router7();
function getAdminClient2() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient3(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
router7.post("/", async (req, res) => {
  try {
    const { email, password, name, gym_id } = req.body;
    if (!email || !password || !gym_id) {
      return res.status(400).json({ error: "email, password y gym_id son requeridos" });
    }
    const supabase2 = getAdminClient2();
    const { data, error } = await supabase2.auth.admin.createUser({
      email,
      password,
      user_metadata: { gym_id, role: "staff", name: name ?? "" },
      email_confirm: true
    });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data.user.id, email: data.user.email, name: name ?? "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router7.get("/", async (req, res) => {
  try {
    const gymId = req.query.gymId;
    if (!gymId) return res.status(400).json({ error: "gymId requerido" });
    const supabase2 = getAdminClient2();
    const { data, error } = await supabase2.auth.admin.listUsers();
    if (error) return res.status(400).json({ error: error.message });
    const staff = data.users.filter((u) => u.user_metadata?.gym_id === gymId && u.user_metadata?.role === "staff").map((u) => ({ id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? "" }));
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router7.delete("/:userId", async (req, res) => {
  try {
    const supabase2 = getAdminClient2();
    const { error } = await supabase2.auth.admin.deleteUser(req.params.userId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var staff_default = router7;

// server/routes/ai.ts
import { Router as Router8 } from "express";

// server/services/AIAnalysisServerService.ts
import { GoogleGenAI } from "@google/genai";
var MAX_ANALYSES_PER_WEEK = 3;
var SYSTEM_PROMPT = `Sos un asistente de planificaci\xF3n para un Personal Trainer profesional.
Tu trabajo es analizar los datos de un alumno y darle al PT un resumen \xFAtil con sugerencias accionables.

Reglas:
- Hablale al PT como un colega, directo y sin vueltas.
- S\xE9 espec\xEDfico: nombr\xE1 ejercicios, pesos, n\xFAmeros. No seas gen\xE9rico.
- Prioriz\xE1 lo accionable: "subile 2.5kg al press banca" > "consider\xE1 aumentar la carga".
- Si hay algo preocupante (dolor, mal sue\xF1o, alej\xE1ndose del objetivo), mencionalo primero.
- Si hay algo para felicitar (PR, constancia, cerca del objetivo), mencionalo.
- M\xE1ximo 4-6 oraciones. R\xE1pido de leer.
- No des disclaimers m\xE9dicos. El PT es el profesional, vos sos su asistente de datos.
- Correlacion\xE1 datos: "rindi\xF3 menos hoy, puede ser por las 5hs de sue\xF1o".
- Suger\xED variantes de ejercicios concretas cuando haya estancamiento.
- Suger\xED ajustes de peso espec\xEDficos (ej: "subir a 52.5kg", "bajar a 70kg y meter m\xE1s reps").
- Respond\xE9 siempre en espa\xF1ol.`;
var AIAnalysisServerService = {
  async countThisWeek(studentId) {
    const now = /* @__PURE__ */ new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const { count, error } = await supabase.from("ai_analyses").select("*", { count: "exact", head: true }).eq("student_id", studentId).gte("created_at", monday.toISOString());
    if (error) throw error;
    return count ?? 0;
  },
  async gatherContext(gymId, studentId, sessionId) {
    const [
      studentRes,
      goalsRes,
      anthroRes,
      sessionsRes,
      wellnessRes,
      nutritionRes
    ] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),
      supabase.from("client_goals").select("*").eq("student_id", studentId).eq("status", "active").limit(3),
      supabase.from("client_anthropometry").select("*").eq("student_id", studentId).order("measured_at", { ascending: false }).limit(3),
      supabase.from("workout_sessions").select("*").eq("student_id", studentId).eq("status", "completed").order("session_date", { ascending: false }).limit(6),
      supabase.from("wellness_checkins").select("*").eq("student_id", studentId).order("checkin_date", { ascending: false }).limit(7),
      supabase.from("nutrition_plans").select("*").eq("student_id", studentId).eq("status", "active").limit(1)
    ]);
    const student = studentRes.data;
    const studentName = student ? `${student.nombre ?? ""} ${student.apellido ?? ""}`.trim() : "Alumno";
    const goals = goalsRes.data ?? [];
    const primaryGoal = goals[0];
    const goalLabels = {
      lose_weight: "Bajar de peso",
      gain_muscle: "Ganar musculo",
      strength: "Fuerza",
      endurance: "Resistencia",
      general_fitness: "Fitness general"
    };
    const measurements = (anthroRes.data ?? []).map((a) => ({
      date: a.measured_at,
      weight: a.weight_kg,
      fat_pct: a.body_fat_pct,
      muscle_kg: a.muscle_mass_kg
    }));
    const sessions = sessionsRes.data ?? [];
    const recentSessions = [];
    let currentSession;
    for (const sess of sessions) {
      const { data: exercises } = await supabase.from("workout_session_exercises").select("*, workout_exercises(exercise_name, exercise_order)").eq("session_id", sess.id);
      const exIds = (exercises ?? []).map((e) => e.id);
      let sets = [];
      if (exIds.length > 0) {
        const { data } = await supabase.from("session_sets").select("*").in("session_exercise_id", exIds).order("set_number", { ascending: true });
        sets = data ?? [];
      }
      const setsByEx = /* @__PURE__ */ new Map();
      for (const s of sets) {
        const arr = setsByEx.get(s.session_exercise_id) ?? [];
        arr.push(s);
        setsByEx.set(s.session_exercise_id, arr);
      }
      const exerciseData = (exercises ?? []).sort((a, b) => (a.workout_exercises?.exercise_order ?? 0) - (b.workout_exercises?.exercise_order ?? 0)).map((ex) => {
        const exSets = setsByEx.get(ex.id) ?? [];
        return {
          name: ex.workout_exercises?.exercise_name ?? "Ejercicio",
          max_weight: Math.max(0, ...exSets.map((s) => s.weight_kg ?? 0)),
          completed_all_reps: exSets.every((s) => s.completed),
          sets: exSets.map((s) => ({
            weight: s.weight_kg ?? 0,
            reps: s.reps_done ?? 0,
            completed: s.completed
          }))
        };
      });
      if (sessionId && sess.id === sessionId) {
        let routineName;
        if (sess.workout_plan_id) {
          const { data: plan } = await supabase.from("workout_plans").select("name").eq("id", sess.workout_plan_id).single();
          routineName = plan?.name;
        }
        currentSession = {
          date: sess.session_date,
          routine_name: routineName,
          exercises: exerciseData,
          total_volume: sess.total_volume ?? 0,
          pt_notes: sess.pt_notes ?? void 0
        };
      } else {
        recentSessions.push({
          date: sess.session_date,
          volume: sess.total_volume ?? 0,
          exercises: exerciseData.map((e) => ({
            name: e.name,
            max_weight: e.max_weight,
            completed_all_reps: e.completed_all_reps
          }))
        });
      }
    }
    const checkins = (wellnessRes.data ?? []).map((c) => ({
      date: c.checkin_date,
      energy: c.energy,
      sleep: c.sleep_quality,
      mood: c.mood,
      soreness: c.soreness
    }));
    const activePlan = nutritionRes.data?.[0];
    const nutrition = activePlan ? {
      calories: activePlan.calories_target,
      protein: activePlan.protein_g,
      carbs: activePlan.carbs_g,
      fat: activePlan.fat_g
    } : void 0;
    const prMap = /* @__PURE__ */ new Map();
    for (const sess of sessions) {
      const { data: exercises } = await supabase.from("workout_session_exercises").select("id, workout_exercises(exercise_name)").eq("session_id", sess.id);
      const exIds = (exercises ?? []).map((e) => e.id);
      if (!exIds.length) continue;
      const { data: setsData } = await supabase.from("session_sets").select("session_exercise_id, weight_kg").in("session_exercise_id", exIds);
      for (const s of setsData ?? []) {
        const ex = (exercises ?? []).find((e) => e.id === s.session_exercise_id);
        const name = ex?.workout_exercises?.exercise_name ?? "";
        const weight = s.weight_kg ?? 0;
        const existing = prMap.get(name);
        if (!existing || weight > existing.weight) {
          prMap.set(name, { exercise: name, weight, date: sess.session_date });
        }
      }
    }
    return {
      student_name: studentName,
      objective: primaryGoal ? goalLabels[primaryGoal.goal_type] ?? primaryGoal.goal_type : void 0,
      target_weight: primaryGoal?.target_value ? parseFloat(primaryGoal.target_value) : void 0,
      measurements,
      current_session: currentSession,
      recent_sessions: recentSessions,
      recent_checkins: checkins,
      personal_records: Array.from(prMap.values()).filter((p) => p.weight > 0).slice(0, 5),
      nutrition,
      active_alerts: []
      // Could be computed server-side but we keep it simple
    };
  },
  async generateAnalysis(gymId, studentId, sessionId) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no esta configurada en el servidor");
    }
    const weekCount = await this.countThisWeek(studentId);
    if (weekCount >= MAX_ANALYSES_PER_WEEK) {
      throw new Error(`Limite de ${MAX_ANALYSES_PER_WEEK} analisis por semana alcanzado para este alumno`);
    }
    const context = await this.gatherContext(gymId, studentId, sessionId);
    const userMessage = `Analiza los siguientes datos del alumno y dame tu resumen con sugerencias:

${JSON.stringify(context, null, 2)}`;
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-1.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 400,
        temperature: 0.7
      }
    });
    const content = response.text ?? "";
    const usage = response.usageMetadata;
    return {
      content,
      tokens_input: usage?.promptTokenCount ?? 0,
      tokens_output: usage?.candidatesTokenCount ?? 0,
      model
    };
  },
  async analyzeAndSave(gymId, studentId, sessionId) {
    const result = await this.generateAnalysis(gymId, studentId, sessionId);
    const { data, error } = await supabase.from("ai_analyses").insert([{
      gym_id: gymId,
      student_id: studentId,
      session_id: sessionId ?? null,
      analysis_type: sessionId ? "post_session" : "weekly_review",
      content: result.content,
      model_used: result.model,
      tokens_used: result.tokens_input + result.tokens_output
    }]).select().single();
    if (error) throw error;
    return data;
  }
};

// server/routes/ai.ts
var router8 = Router8();
router8.post("/analyze", async (req, res) => {
  try {
    const { gymId, studentId, sessionId } = req.body;
    if (!gymId || !studentId) {
      return res.status(400).json({ error: "gymId y studentId son requeridos" });
    }
    const result = await AIAnalysisServerService.analyzeAndSave(gymId, studentId, sessionId);
    res.status(201).json(result);
  } catch (error) {
    const status = error.message?.includes("Limite de") ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
});
router8.get("/latest", async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ error: "studentId es requerido" });
    }
    const { data, error } = await supabase.from("ai_analyses").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router8.get("/count-week", async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ error: "studentId es requerido" });
    }
    const count = await AIAnalysisServerService.countThisWeek(studentId);
    res.json({ count, limit: 3 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var ai_default = router8;

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
app.use("/api/staff", staff_default);
app.use("/api/ai", ai_default);
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
    const { createClient: createClient4 } = await import("@supabase/supabase-js");
    const client = createClient4(supabaseUrl2, supabaseKey2);
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
