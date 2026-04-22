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
    is_online: row.is_online ?? false,
    birth_date: row.birth_date ?? null,
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

// server/services/ActivityEventsService.ts
var TABLE = "gym_activity_events";
function mapRow(row) {
  return {
    id: row.id,
    gym_id: row.gym_id,
    user_id: row.user_id ?? null,
    event_type: row.event_type,
    event_data: row.event_data ?? null,
    created_at: row.created_at
  };
}
function isoDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function addDays(base, days) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
var ActivityEventsService = {
  /**
   * Insert an event. For event types that have unique constraints in DB
   * (first_*, daily login), Supabase returns an error on conflict — we swallow
   * it so the caller doesn't care whether the event was already logged.
   */
  async log(params) {
    const { data, error } = await supabase.from(TABLE).insert({
      gym_id: params.gym_id,
      event_type: params.event_type,
      event_data: params.event_data ?? null,
      user_id: params.user_id ?? null
    }).select("*").maybeSingle();
    if (error) {
      const code = error.code ?? "";
      if (code === "23505") return null;
      throw error;
    }
    return data ? mapRow(data) : null;
  },
  async getForGym(gymId, limit = 200) {
    const { data, error } = await supabase.from(TABLE).select("*").eq("gym_id", gymId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map(mapRow);
  },
  /**
   * Funnel: cuántos gyms alcanzaron cada paso del onboarding.
   * `registered` = COUNT(DISTINCT gym_id WHERE event_type = 'gym_registered').
   * Los otros son COUNT(DISTINCT gym_id WHERE event_type = 'first_*').
   */
  async getFunnel() {
    const targets = [
      "gym_registered",
      "first_student_created",
      "first_payment_registered",
      "gym_activated"
    ];
    const counts = {};
    await Promise.all(
      targets.map(async (type) => {
        const { count, error } = await supabase.from(TABLE).select("gym_id", { count: "exact", head: true }).eq("event_type", type);
        if (error) throw error;
        counts[type] = count ?? 0;
      })
    );
    return {
      registered: counts["gym_registered"] ?? 0,
      first_student: counts["first_student_created"] ?? 0,
      first_payment: counts["first_payment_registered"] ?? 0,
      activated: counts["gym_activated"] ?? 0
    };
  },
  /**
   * Retention por cohorte semanal (últimas 8 semanas).
   * Para cada gym con evento `gym_registered` en la semana, se marca:
   *   - d1: login en las 24-48hs posteriores al registro
   *   - d7: login en las horas 144-336 (día 7 ±1)
   *   - d30: login en las horas 696-888 (día 30 ±1)
   * Se usan ventanas laxas de ±1 día para no perder gente que entra un día
   * antes o después del target exacto.
   */
  async getRetention(weeks = 8) {
    const now = /* @__PURE__ */ new Date();
    const day = now.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));
    const cohortStarts = [];
    for (let i = weeks - 1; i >= 0; i--) {
      cohortStarts.push(addDays(thisMonday, -7 * i));
    }
    const windowStart = addDays(cohortStarts[0], -1);
    const windowEnd = addDays(now, 1);
    const maxEnd = addDays(cohortStarts[cohortStarts.length - 1], 32);
    const effectiveEnd = maxEnd > windowEnd ? maxEnd : windowEnd;
    const [{ data: regRows, error: regErr }, { data: loginRows, error: loginErr }] = await Promise.all([
      supabase.from(TABLE).select("gym_id, created_at").eq("event_type", "gym_registered").gte("created_at", windowStart.toISOString()).lte("created_at", effectiveEnd.toISOString()),
      supabase.from(TABLE).select("gym_id, created_at").eq("event_type", "login").gte("created_at", windowStart.toISOString()).lte("created_at", effectiveEnd.toISOString())
    ]);
    if (regErr) throw regErr;
    if (loginErr) throw loginErr;
    const loginsByGym = /* @__PURE__ */ new Map();
    for (const r of loginRows ?? []) {
      const arr = loginsByGym.get(r.gym_id) ?? [];
      arr.push(new Date(r.created_at).getTime());
      loginsByGym.set(r.gym_id, arr);
    }
    for (const arr of loginsByGym.values()) arr.sort((a, b) => a - b);
    const registrationByGym = /* @__PURE__ */ new Map();
    for (const r of regRows ?? []) {
      const t = new Date(r.created_at).getTime();
      const current = registrationByGym.get(r.gym_id);
      if (current == null || t < current) registrationByGym.set(r.gym_id, t);
    }
    const hasLoginInWindow = (gymId, startOffsetDays, endOffsetDays, regTime) => {
      const logins = loginsByGym.get(gymId);
      if (!logins) return false;
      const start = regTime + startOffsetDays * 864e5;
      const end = regTime + endOffsetDays * 864e5;
      if (Date.now() < start) return false;
      return logins.some((t) => t >= start && t <= end);
    };
    const cohorts = cohortStarts.map((weekStart) => {
      const weekEnd = addDays(weekStart, 7);
      const cohortGymIds = [];
      for (const [gymId, regTime] of registrationByGym.entries()) {
        if (regTime >= weekStart.getTime() && regTime < weekEnd.getTime()) {
          cohortGymIds.push({ gymId, regTime });
        }
      }
      let d1 = 0, d7 = 0, d30 = 0;
      for (const { gymId, regTime } of cohortGymIds) {
        if (hasLoginInWindow(gymId, 0.5, 2, regTime)) d1++;
        if (hasLoginInWindow(gymId, 6, 9, regTime)) d7++;
        if (hasLoginInWindow(gymId, 28, 32, regTime)) d30++;
      }
      return {
        cohort_date: isoDate(weekStart),
        cohort_size: cohortGymIds.length,
        d1,
        d7,
        d30
      };
    });
    return cohorts;
  }
};

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
        is_online,
        birth_date,
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
        is_online,
        birth_date,
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
      access_code: generateAccessCode(),
      is_online: student.is_online ?? false,
      birth_date: student.birth_date ?? null
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
        is_online,
        birth_date,
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
    if (createdStudent.gym_id && createdStudent.gym_id !== DEFAULT_GYM_ID) {
      ActivityEventsService.log({
        gym_id: createdStudent.gym_id,
        event_type: "first_student_created",
        event_data: { student_id: createdStudent.id }
      }).catch((err) => console.error("activity log first_student_created failed:", err));
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
    if (updates.is_online !== void 0) {
      payload.is_online = !!updates.is_online;
    }
    if (updates.birth_date !== void 0) {
      const raw = updates.birth_date;
      payload.birth_date = raw && String(raw).trim() ? raw : null;
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
        is_online,
        birth_date,
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

// server/services/StravaService.ts
import crypto from "crypto";

// server/services/StudentDisciplinesService.ts
var StudentDisciplinesService = {
  async listForStudent(studentId) {
    const { data, error } = await supabase.from("student_disciplines").select("*").eq("student_id", studentId).order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async add(gymId, studentId, discipline) {
    const { data, error } = await supabase.from("student_disciplines").upsert(
      { gym_id: gymId, student_id: studentId, discipline },
      { onConflict: "student_id,discipline", ignoreDuplicates: false }
    ).select("*").single();
    if (error) throw error;
    return data;
  },
  async remove(studentId, discipline) {
    const { error } = await supabase.from("student_disciplines").delete().eq("student_id", studentId).eq("discipline", discipline);
    if (error) throw error;
  }
};

// server/services/StravaService.ts
var STRAVA_OAUTH_BASE = "https://www.strava.com";
var STRAVA_API_BASE = "https://www.strava.com/api/v3";
var STATE_TTL_MS = 15 * 60 * 1e3;
var TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1e3;
var DEDUPE_DISTANCE_TOLERANCE_KM = 0.5;
var RUN_ACTIVITY_TYPES = /* @__PURE__ */ new Set(["Run", "TrailRun", "VirtualRun"]);
function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}
function envOptional(name) {
  return process.env[name] ?? null;
}
function signState(payload) {
  const secret = env("STRAVA_OAUTH_STATE_SECRET");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyState(state) {
  const secret = env("STRAVA_OAUTH_STATE_SECRET");
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.sid !== "string" || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > STATE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
function publicConnection(row) {
  return {
    id: row.id,
    gym_id: row.gym_id,
    student_id: row.student_id,
    athlete_id: row.athlete_id,
    athlete_firstname: row.athlete_firstname ?? null,
    athlete_lastname: row.athlete_lastname ?? null,
    scope: row.scope ?? null,
    connected_at: row.connected_at,
    last_sync_at: row.last_sync_at ?? null
  };
}
function mapStravaTypeToSession(type) {
  if (type === "TrailRun") return "long";
  if (type === "Run" || type === "VirtualRun") return "easy";
  return "other";
}
function buildNotes(activity) {
  const parts = [];
  if (activity.name) parts.push(activity.name);
  if (activity.description) parts.push(activity.description);
  const joined = parts.join(" \u2014 ").trim();
  return joined || null;
}
async function postForm(url, params) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString()
  });
}
async function fetchAuthed(url, accessToken) {
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
}
async function getStoredByStudent(studentId) {
  const { data, error } = await supabase.from("strava_connections").select("*").eq("student_id", studentId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}
async function getStoredByAthlete(athleteId) {
  const { data, error } = await supabase.from("strava_connections").select("*").eq("athlete_id", athleteId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}
async function persistTokenUpdate(connectionId, tokens) {
  const { data, error } = await supabase.from("strava_connections").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1e3).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", connectionId).select("*").single();
  if (error) throw error;
  return data;
}
async function refreshAccessToken(connection) {
  const res = await postForm(`${STRAVA_OAUTH_BASE}/oauth/token`, {
    client_id: env("STRAVA_CLIENT_ID"),
    client_secret: env("STRAVA_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${text}`);
  }
  const tokens = await res.json();
  return persistTokenUpdate(connection.id, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at
  });
}
async function getValidConnection(connection) {
  const expiresAtMs = new Date(connection.expires_at).getTime();
  if (expiresAtMs - Date.now() > TOKEN_REFRESH_MARGIN_MS) return connection;
  return refreshAccessToken(connection);
}
async function deleteManualDuplicates(studentId, sessionDate, distanceKm) {
  const minKm = distanceKm - DEDUPE_DISTANCE_TOLERANCE_KM;
  const maxKm = distanceKm + DEDUPE_DISTANCE_TOLERANCE_KM;
  const { error } = await supabase.from("running_sessions").delete().eq("student_id", studentId).eq("session_date", sessionDate).eq("source", "manual").gte("distance_km", minKm).lte("distance_km", maxKm);
  if (error) throw error;
}
async function upsertActivity(connection, activity) {
  if (!RUN_ACTIVITY_TYPES.has(activity.type)) return;
  const sessionDate = (activity.start_date_local || "").slice(0, 10);
  const distanceKm = Math.round(activity.distance / 1e3 * 100) / 100;
  const durationSeconds = Math.round(activity.moving_time);
  if (!sessionDate || !(distanceKm > 0) || !(durationSeconds > 0)) return;
  await deleteManualDuplicates(connection.student_id, sessionDate, distanceKm);
  const payload = {
    gym_id: connection.gym_id,
    student_id: connection.student_id,
    session_date: sessionDate,
    distance_km: distanceKm,
    duration_seconds: durationSeconds,
    avg_hr_bpm: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    perceived_effort: null,
    session_type: mapStravaTypeToSession(activity.type),
    notes: buildNotes(activity),
    logged_by: "student",
    source: "strava",
    external_provider: "strava",
    external_id: String(activity.id),
    avg_speed_mps: activity.average_speed != null ? Math.round(activity.average_speed * 100) / 100 : null,
    elevation_gain_m: activity.total_elevation_gain != null ? Math.round(activity.total_elevation_gain) : null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { error } = await supabase.from("running_sessions").upsert(payload, { onConflict: "external_provider,external_id" });
  if (error) throw error;
}
async function backfillSince(connection, sinceUnix) {
  const fresh = await getValidConnection(connection);
  let imported = 0;
  let page = 1;
  while (true) {
    const url = `${STRAVA_API_BASE}/athlete/activities?after=${sinceUnix}&per_page=100&page=${page}`;
    const res = await fetchAuthed(url, fresh.access_token);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strava list activities failed: ${res.status} ${text}`);
    }
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) break;
    for (const activity of list) {
      try {
        await upsertActivity(fresh, activity);
        if (RUN_ACTIVITY_TYPES.has(activity.type)) imported += 1;
      } catch (err) {
        console.error("[strava] failed to upsert activity", activity.id, err);
      }
    }
    if (list.length < 100) break;
    page += 1;
  }
  await supabase.from("strava_connections").update({ last_sync_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", fresh.id);
  return imported;
}
var StravaService = {
  buildAuthUrl(studentId) {
    const state = signState({ sid: studentId, ts: Date.now() });
    const params = new URLSearchParams({
      client_id: env("STRAVA_CLIENT_ID"),
      response_type: "code",
      redirect_uri: env("STRAVA_REDIRECT_URI"),
      approval_prompt: "auto",
      scope: "read,activity:read",
      state
    });
    return `${STRAVA_OAUTH_BASE}/oauth/authorize?${params.toString()}`;
  },
  async handleCallback(code, state) {
    const verified = verifyState(state);
    if (!verified) return { ok: false, reason: "invalid_state" };
    const { data: studentRow, error: studentErr } = await supabase.from("students").select("id, gym_id").eq("id", verified.sid).maybeSingle();
    if (studentErr) throw studentErr;
    if (!studentRow) return { ok: false, reason: "student_not_found" };
    const res = await postForm(`${STRAVA_OAUTH_BASE}/oauth/token`, {
      client_id: env("STRAVA_CLIENT_ID"),
      client_secret: env("STRAVA_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code"
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[strava] token exchange failed", res.status, text);
      return { ok: false, reason: "token_exchange_failed" };
    }
    const tokens = await res.json();
    if (!tokens.athlete?.id) return { ok: false, reason: "missing_athlete" };
    const { data: connRow, error: connErr } = await supabase.from("strava_connections").upsert(
      {
        gym_id: studentRow.gym_id,
        student_id: verified.sid,
        athlete_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1e3).toISOString(),
        scope: "read,activity:read",
        athlete_firstname: tokens.athlete.firstname ?? null,
        athlete_lastname: tokens.athlete.lastname ?? null,
        connected_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "student_id" }
    ).select("*").single();
    if (connErr) throw connErr;
    try {
      await StudentDisciplinesService.add(studentRow.gym_id, verified.sid, "running");
    } catch (err) {
      console.error("[strava] failed to auto-mark running discipline", err);
    }
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1e3) / 1e3);
    try {
      await backfillSince(connRow, since);
    } catch (err) {
      console.error("[strava] backfill failed", err);
    }
    return { ok: true };
  },
  async importActivity(athleteId, activityId) {
    const stored = await getStoredByAthlete(athleteId);
    if (!stored) {
      console.warn("[strava] webhook for unknown athlete", athleteId);
      return;
    }
    const fresh = await getValidConnection(stored);
    const res = await fetchAuthed(`${STRAVA_API_BASE}/activities/${activityId}`, fresh.access_token);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strava get activity ${activityId} failed: ${res.status} ${text}`);
    }
    const activity = await res.json();
    await upsertActivity(fresh, activity);
    await supabase.from("strava_connections").update({ last_sync_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", fresh.id);
  },
  async deleteImportedActivity(athleteId, activityId) {
    const stored = await getStoredByAthlete(athleteId);
    if (!stored) return;
    const { error } = await supabase.from("running_sessions").delete().eq("student_id", stored.student_id).eq("external_provider", "strava").eq("external_id", String(activityId));
    if (error) throw error;
  },
  async disconnect(studentId) {
    const stored = await getStoredByStudent(studentId);
    if (!stored) return;
    const fresh = await getValidConnection(stored);
    const res = await fetch(`${STRAVA_OAUTH_BASE}/oauth/deauthorize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fresh.access_token}` }
    });
    if (!res.ok && res.status !== 401) {
      const text = await res.text();
      throw new Error(`Strava deauthorize failed: ${res.status} ${text}`);
    }
    const { error } = await supabase.from("strava_connections").delete().eq("student_id", studentId);
    if (error) throw error;
  },
  async getConnectionStatus(studentId) {
    const stored = await getStoredByStudent(studentId);
    return stored ? publicConnection(stored) : null;
  },
  async backfillRecentForAllConnections(windowHours = 24) {
    const { data, error } = await supabase.from("strava_connections").select("*");
    if (error) throw error;
    const since = Math.floor((Date.now() - windowHours * 60 * 60 * 1e3) / 1e3);
    let imported = 0;
    for (const row of data || []) {
      try {
        imported += await backfillSince(row, since);
      } catch (err) {
        console.error("[strava] cron backfill failed for student", row.student_id, err);
      }
    }
    return { checked: (data || []).length, imported };
  },
  // Exposed para el script de bootstrap del webhook
  webhookVerifyToken() {
    return env("STRAVA_WEBHOOK_VERIFY_TOKEN");
  },
  envSummary() {
    return {
      hasClientId: !!envOptional("STRAVA_CLIENT_ID"),
      hasClientSecret: !!envOptional("STRAVA_CLIENT_SECRET"),
      hasRedirectUri: !!envOptional("STRAVA_REDIRECT_URI"),
      hasVerifyToken: !!envOptional("STRAVA_WEBHOOK_VERIFY_TOKEN"),
      hasStateSecret: !!envOptional("STRAVA_OAUTH_STATE_SECRET")
    };
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
    let stravaSync;
    try {
      stravaSync = await StravaService.backfillRecentForAllConnections(24);
    } catch (err) {
      stravaSync = { error: err?.message || String(err) };
    }
    res.json({ ok: true, ran: gymIds.length, summary, stravaSync });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var automation_default = router5;

// server/routes/subscriptions.ts
import { Router as Router6 } from "express";
import { createClient as createClient2 } from "@supabase/supabase-js";

// server/services/SubscriptionService.ts
var DEMO_GYM_ID = "11111111-1111-1111-1111-111111111111";
function fireActivity(gymId, eventType, data) {
  if (!gymId || gymId === DEMO_GYM_ID) return;
  ActivityEventsService.log({ gym_id: gymId, event_type: eventType, event_data: data ?? null }).catch((err) => console.error(`activity log ${eventType} failed:`, err));
}
function mapRow2(row) {
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
    return (data || []).map(mapRow2);
  },
  async getByGymId(gymId) {
    const { data, error } = await supabase.from("gym_subscriptions").select(GYM_SELECT).eq("gym_id", gymId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapRow2(data);
  },
  async upsert(gymId, updates) {
    const { gym_name, owner_email, owner_phone, gym_type, ...rest } = updates;
    const payload = { ...rest, gym_id: gymId };
    const { data, error } = await supabase.from("gym_subscriptions").upsert(payload, { onConflict: "gym_id" }).select(GYM_SELECT).single();
    if (error) throw error;
    return mapRow2(data);
  },
  async activate(gymId, periodEnd, planTier, skipPaymentCheck = false) {
    if (!skipPaymentCheck) {
      const { data: payments } = await supabase.from("gym_billing_payments").select("id").eq("gym_id", gymId).limit(1);
      if (!payments || payments.length === 0) {
        throw new Error("No se puede activar: el gimnasio no tiene pagos registrados. Registr\xE1 un pago primero.");
      }
    }
    const updated = await this.upsert(gymId, {
      status: "active",
      current_period_start: (/* @__PURE__ */ new Date()).toISOString(),
      current_period_end: periodEnd,
      access_enabled: true,
      ...planTier ? { plan_tier: planTier } : {}
    });
    fireActivity(gymId, "gym_activated");
    return updated;
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
    const created = mapRow2(data);
    fireActivity(created.gym_id, "gym_registered", { plan_tier: planTier, gym_type: gymType });
    return created;
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
    fireActivity(payment.gym_id, "first_payment_registered", { amount: payload.amount, method: payload.payment_method });
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
import Groq from "groq-sdk";
var MAX_ANALYSES_PER_WEEK = 3;
var SYSTEM_PROMPT = `Sos un asistente de planificacion para un Personal Trainer profesional.
Recibis datos de un alumno y tenes que darle al PT un analisis util con
sugerencias concretas y accionables.

REGLAS PRINCIPALES:

1. RESPETA EL PLAN DEL PT. Tenes su perfil de planificacion: la fase actual,
   el modelo de periodizacion, el metodo de progresion, las tecnicas que usa.
   Tus sugerencias deben estar ALINEADAS con eso. No sugieras cosas que
   contradigan su estrategia.
   - Si esta en fase de fuerza \u2192 no sugieras series de 15 reps.
   - Si usa RPE \u2192 habla en terminos de RPE, no de porcentajes.
   - Si usa doble progresion \u2192 sugeri subir reps antes de subir peso.
   - Si esta en deload \u2192 no sugieras subir cargas.

2. RESPETA LAS LESIONES. Si hay dolor de hombro, no sugieras press militar.
   Sugeri alternativas especificas y seguras para esa zona.

3. RESPETA EL CONTEXTO PERSONAL. Si manana tiene partido, no sugieras
   sesion intensa hoy. Si duerme mal, sugeri ajustar. Si los miercoles
   solo tiene 45min, no sugieras sesiones largas ese dia.

4. SE ESPECIFICO. Nombra ejercicios, pesos, reps, RPE.
   "Subile 2.5kg al press banca la proxima" > "considera aumentar la carga".
   "Proba sentadilla con pausa de 2seg al 80% (80kg)" > "cambia el estimulo".

5. PRIORIZA. Si hay algo preocupante (dolor, sueno bajo sostenido,
   alejandose del objetivo), mencionalo PRIMERO. Si hay algo positivo
   (PR, buena constancia, cerca de la meta), mencionalo tambien.

6. CORRELACIONA DATOS. "Rindio menos hoy, puede ser por las 5hs de sueno."
   "El volumen subio 15% en 3 semanas, considerar si es sostenible."
   "El peso subio pero la grasa bajo \u2014 esta ganando musculo, va bien."

7. CONSIDERA LA FASE Y SU TIMING. Si la fase actual esta por terminar
   segun la duracion planificada, mencionalo: "Estas en semana 3 de 4 del
   bloque de fuerza, la proxima semana arrancaria la transicion a potencia."

8. FORMATO DE SALIDA: Devolv\xE9 SOLO un objeto JSON v\xE1lido con este schema exacto
   (sin texto fuera del JSON, sin markdown, sin code fences):

   {
     "resumen": "una oraci\xF3n (m\xE1x 25 palabras) que sintetice el estado del alumno hoy",
     "preocupaciones": ["bullet concreto 1", "bullet concreto 2"],
     "positivos": ["bullet concreto 1"],
     "sugerencias": ["acci\xF3n espec\xEDfica con ejercicio/peso/reps/RPE", "acci\xF3n 2"],
     "nota": "opcional \u2014 texto breve de cierre o null"
   }

   Reglas del JSON:
   - "resumen" y "sugerencias" son obligatorios. "sugerencias" debe tener al menos 1 item.
   - "preocupaciones" y "positivos" pueden ser arrays vac\xEDos [] si no hay nada relevante.
   - M\xE1ximo 4 bullets por array. Cada bullet: una oraci\xF3n, directa, sin "considera"/"tal vez".
   - "nota" puede ser null si no hace falta. Usala solo para contexto extra, no para otra sugerencia.
   - Hablale al PT como un colega, sin disclaimers m\xE9dicos ni relleno.

9. Si no hay perfil de planificacion (bloque "planning" vacio o con valores default),
   da sugerencias mas genericas basandote en los datos de progreso y entrenamiento.
   Esto es aceptable pero mencionalo en "nota".`;
function normalizeAnalysisJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    const normalized = {
      resumen: typeof parsed.resumen === "string" ? parsed.resumen : "",
      preocupaciones: Array.isArray(parsed.preocupaciones) ? parsed.preocupaciones.filter((x) => typeof x === "string" && x.trim()) : [],
      positivos: Array.isArray(parsed.positivos) ? parsed.positivos.filter((x) => typeof x === "string" && x.trim()) : [],
      sugerencias: Array.isArray(parsed.sugerencias) ? parsed.sugerencias.filter((x) => typeof x === "string" && x.trim()) : [],
      nota: typeof parsed.nota === "string" && parsed.nota.trim() ? parsed.nota : null
    };
    if (!normalized.resumen && normalized.sugerencias.length === 0) {
      throw new Error("empty required fields");
    }
    return JSON.stringify(normalized);
  } catch {
    return JSON.stringify({
      resumen: raw.slice(0, 500),
      preocupaciones: [],
      positivos: [],
      sugerencias: [],
      nota: null
    });
  }
}
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
      profileRes,
      goalsRes,
      anthroRes,
      sessionsRes,
      wellnessRes,
      nutritionRes
    ] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),
      supabase.from("student_plan_profiles").select("*").eq("student_id", studentId).maybeSingle(),
      supabase.from("client_goals").select("*").eq("student_id", studentId).eq("status", "active").limit(3),
      supabase.from("client_anthropometry").select("*").eq("student_id", studentId).order("measured_at", { ascending: false }).limit(5),
      supabase.from("workout_sessions").select("*").eq("student_id", studentId).eq("status", "completed").order("session_date", { ascending: false }).limit(8),
      supabase.from("wellness_checkins").select("*").eq("student_id", studentId).order("checkin_date", { ascending: false }).limit(7),
      supabase.from("nutrition_plans").select("*").eq("student_id", studentId).eq("status", "active").limit(1)
    ]);
    const student = studentRes.data;
    const profile = profileRes.data;
    const sessions = sessionsRes.data ?? [];
    let planning = {};
    if (profile) {
      let phaseWeek = null;
      if (profile.phase_start_date && profile.phase_duration_weeks) {
        const startDate = new Date(profile.phase_start_date);
        const now = /* @__PURE__ */ new Date();
        const weekNum = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1e3)) + 1;
        phaseWeek = `${Math.min(weekNum, profile.phase_duration_weeks)} de ${profile.phase_duration_weeks}`;
      }
      planning = {
        student_type: profile.student_type,
        sport: profile.sport,
        sport_season: profile.sport_season,
        experience: profile.experience_level,
        age: profile.age,
        sex: profile.biological_sex,
        injuries: profile.injuries_limitations,
        objective: profile.primary_objective,
        secondary_objective: profile.secondary_objective,
        goal: profile.numeric_goal,
        timeframe: profile.goal_timeframe,
        current_phase: profile.current_phase,
        phase_week: phaseWeek,
        next_phase: profile.next_phase,
        periodization: profile.periodization_model,
        progression_method: profile.progression_method,
        rep_range: profile.rep_range,
        special_techniques: profile.special_techniques,
        methodology_notes: profile.methodology_notes,
        nutrition: profile.nutrition_strategy,
        nutrition_detail: profile.nutrition_detail,
        lifestyle: profile.lifestyle_factors,
        equipment: profile.equipment_restrictions,
        schedule: profile.schedule_considerations,
        available_days: profile.available_days,
        sessions_per_week: profile.sessions_per_week,
        session_duration_min: profile.session_duration_min
      };
    }
    const measurements = (anthroRes.data ?? []).map((a) => ({
      date: a.measured_at,
      weight: a.weight_kg,
      fat_pct: a.body_fat_pct,
      muscle_kg: a.muscle_mass_kg
    }));
    const sessionExerciseMap = /* @__PURE__ */ new Map();
    const allExIds = [];
    for (const sess of sessions) {
      const { data: exercises } = await supabase.from("workout_session_exercises").select("*, workout_exercises(exercise_name, exercise_order)").eq("session_id", sess.id);
      sessionExerciseMap.set(sess.id, exercises ?? []);
      for (const e of exercises ?? []) allExIds.push(e.id);
    }
    let allSets = [];
    if (allExIds.length > 0) {
      for (let i = 0; i < allExIds.length; i += 50) {
        const chunk = allExIds.slice(i, i + 50);
        const { data } = await supabase.from("session_sets").select("*").in("session_exercise_id", chunk).order("set_number", { ascending: true });
        allSets = allSets.concat(data ?? []);
      }
    }
    const setsByExId = /* @__PURE__ */ new Map();
    for (const s of allSets) {
      const arr = setsByExId.get(s.session_exercise_id) ?? [];
      arr.push(s);
      setsByExId.set(s.session_exercise_id, arr);
    }
    const prMap = /* @__PURE__ */ new Map();
    const exerciseTimeline = /* @__PURE__ */ new Map();
    for (const sess of sessions) {
      const exercises = sessionExerciseMap.get(sess.id) ?? [];
      for (const ex of exercises) {
        const name = ex.workout_exercises?.exercise_name ?? "";
        if (!name) continue;
        const exSets = setsByExId.get(ex.id) ?? [];
        for (const s of exSets) {
          const weight = s.weight_kg ?? 0;
          const existing = prMap.get(name);
          if (!existing || weight > existing.weight) {
            prMap.set(name, { exercise: name, weight, date: sess.session_date });
          }
          const timeline = exerciseTimeline.get(name) ?? [];
          timeline.push({
            date: sess.session_date,
            weight,
            reps: s.reps_done ?? 0,
            completed: s.completed
          });
          exerciseTimeline.set(name, timeline);
        }
      }
    }
    const progressing = [];
    const stagnant = [];
    for (const [name, timeline] of exerciseTimeline.entries()) {
      if (timeline.length < 2) continue;
      const byDate = /* @__PURE__ */ new Map();
      for (const t of timeline) {
        const cur = byDate.get(t.date) ?? 0;
        if (t.weight > cur) byDate.set(t.date, t.weight);
      }
      const dates = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (dates.length < 2) continue;
      const first = dates[0][1];
      const last = dates[dates.length - 1][1];
      if (last > first) {
        progressing.push({ exercise: name, from: first, to: last, period: `${dates.length} sesiones` });
      } else if (last === first && dates.length >= 3) {
        stagnant.push({ exercise: name, weight: last, sessions_stuck: dates.length });
      }
    }
    const weeklyVolume = [];
    const fourWeeksAgo = /* @__PURE__ */ new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentCompletedSessions = sessions.filter(
      (s) => new Date(s.session_date) >= fourWeeksAgo
    );
    const weekMap = /* @__PURE__ */ new Map();
    for (const s of recentCompletedSessions) {
      const d = new Date(s.session_date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + (s.total_volume ?? 0));
    }
    for (const [week, volume] of [...weekMap.entries()].sort()) {
      weeklyVolume.push({ week, volume });
    }
    const sessionsLast4Weeks = recentCompletedSessions.length;
    const weeksWithData = weekMap.size || 1;
    const progress = {
      student_name: student ? `${student.nombre ?? ""} ${student.apellido ?? ""}`.trim() : "Alumno",
      measurements,
      personal_records: Array.from(prMap.values()).filter((p) => p.weight > 0).slice(0, 8),
      weekly_volume: weeklyVolume,
      sessions_last_4_weeks: sessionsLast4Weeks,
      sessions_per_week_avg: Math.round(sessionsLast4Weeks / weeksWithData * 10) / 10,
      sessions_per_week_planned: profile?.sessions_per_week ?? null,
      progressing: progressing.slice(0, 5),
      stagnant: stagnant.slice(0, 5)
    };
    let currentSession = null;
    const recentSessionsSummary = [];
    const exerciseHistory = /* @__PURE__ */ new Map();
    for (const sess of sessions) {
      const exercises = sessionExerciseMap.get(sess.id) ?? [];
      const sortedExercises = [...exercises].sort(
        (a, b) => (a.workout_exercises?.exercise_order ?? 0) - (b.workout_exercises?.exercise_order ?? 0)
      );
      const exerciseData = sortedExercises.map((ex) => {
        const exSets = setsByExId.get(ex.id) ?? [];
        const name = ex.workout_exercises?.exercise_name ?? "Ejercicio";
        return {
          name,
          sets: exSets.map((s) => ({
            weight: s.weight_kg ?? 0,
            reps: s.reps_done ?? 0,
            completed: s.completed
          })),
          max_weight: Math.max(0, ...exSets.map((s) => s.weight_kg ?? 0))
        };
      });
      if (sessionId && sess.id === sessionId) {
        let routineName;
        if (sess.workout_plan_id) {
          const { data: plan } = await supabase.from("workout_plans").select("name").eq("id", sess.workout_plan_id).single();
          routineName = plan?.name;
        }
        const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const sessDate = new Date(sess.session_date);
        currentSession = {
          date: sess.session_date,
          day_of_week: dayNames[sessDate.getDay()],
          routine_name: routineName,
          exercises: exerciseData,
          total_volume: sess.total_volume ?? 0,
          pt_notes: sess.pt_notes ?? null
        };
        for (const ex of exerciseData) {
          const history = [];
          for (const prevSess of sessions) {
            if (prevSess.id === sess.id) continue;
            const prevExercises = sessionExerciseMap.get(prevSess.id) ?? [];
            const match = prevExercises.find(
              (pe) => pe.workout_exercises?.exercise_name === ex.name
            );
            if (match) {
              const prevSets = setsByExId.get(match.id) ?? [];
              const maxW = Math.max(0, ...prevSets.map((s) => s.weight_kg ?? 0));
              const setsStr = prevSets.map((s) => s.reps_done ?? 0).join(",");
              history.push({
                date: prevSess.session_date,
                weight: maxW,
                sets: setsStr,
                completed: prevSets.every((s) => s.completed)
              });
            }
          }
          if (history.length > 0) {
            exerciseHistory.set(ex.name, history.slice(0, 3));
          }
        }
      } else {
        const highlights = exerciseData.slice(0, 3).map((e) => {
          const topSet = e.sets[0];
          return topSet ? `${e.name} ${topSet.weight}kg\xD7${topSet.reps}` : e.name;
        }).join(", ");
        recentSessionsSummary.push({
          date: sess.session_date,
          routine: null,
          highlights,
          volume: sess.total_volume ?? 0
        });
      }
    }
    const training = {
      current_session: currentSession,
      recent_sessions: recentSessionsSummary.slice(0, 5)
    };
    if (exerciseHistory.size > 0) {
      training.exercise_history = Object.fromEntries(exerciseHistory);
    }
    const checkins = (wellnessRes.data ?? []).map((c) => ({
      date: c.checkin_date,
      energy: c.energy,
      sleep_quality: c.sleep_quality,
      mood: c.mood,
      soreness: c.soreness,
      note: c.notes ?? null
    }));
    const weeklyAvg = {};
    if (checkins.length > 0) {
      const keys = ["energy", "sleep_quality", "mood", "soreness"];
      for (const key of keys) {
        const vals = checkins.map((c) => c[key]).filter((v) => v != null);
        weeklyAvg[key] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
      }
    }
    const flags = [];
    if (weeklyAvg.sleep_quality && weeklyAvg.sleep_quality < 2.5) {
      flags.push(`Sueno bajo esta semana (prom ${weeklyAvg.sleep_quality})`);
    }
    if (weeklyAvg.energy && weeklyAvg.energy < 2.5) {
      flags.push(`Energia baja esta semana (prom ${weeklyAvg.energy})`);
    }
    if (weeklyAvg.soreness && weeklyAvg.soreness > 3.5) {
      flags.push(`Dolor muscular alto esta semana (prom ${weeklyAvg.soreness})`);
    }
    const todayCheckin = checkins[0];
    if (todayCheckin?.note) {
      flags.push(`Nota del alumno: "${todayCheckin.note}"`);
    }
    const activePlan = nutritionRes.data?.[0];
    const nutritionData = activePlan ? {
      calories: activePlan.calories_target,
      protein: activePlan.protein_g,
      carbs: activePlan.carbs_g,
      fat: activePlan.fat_g
    } : null;
    const wellbeing = {
      recent_checkins: checkins,
      weekly_avg: Object.keys(weeklyAvg).length > 0 ? weeklyAvg : null,
      nutrition: nutritionData,
      flags
    };
    return { planning, progress, training, wellbeing };
  },
  async generateAnalysis(gymId, studentId, sessionId) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY no esta configurada en el servidor");
    }
    const weekCount = await this.countThisWeek(studentId);
    if (weekCount >= MAX_ANALYSES_PER_WEEK) {
      throw new Error(`Limite de ${MAX_ANALYSES_PER_WEEK} analisis por semana alcanzado para este alumno`);
    }
    const context = await this.gatherContext(gymId, studentId, sessionId);
    const userMessage = `Analiza los siguientes datos del alumno y dame tu resumen con sugerencias:

${JSON.stringify(context, null, 2)}`;
    const groq = new Groq({ apiKey });
    const model = "llama-3.1-8b-instant";
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      max_tokens: 700,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    const rawContent = response.choices[0]?.message?.content ?? "";
    const content = normalizeAnalysisJson(rawContent);
    const usage = response.usage;
    return {
      content,
      tokens_input: usage?.prompt_tokens ?? 0,
      tokens_output: usage?.completion_tokens ?? 0,
      model,
      context_json: context
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
      tokens_used: result.tokens_input + result.tokens_output,
      context_json: result.context_json
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

// server/routes/planProfiles.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { data, error } = await supabase.from("student_plan_profiles").select("*").eq("student_id", studentId).maybeSingle();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router9.put("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const body = req.body;
    const payload = {
      ...body,
      student_id: studentId,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { data, error } = await supabase.from("student_plan_profiles").upsert(payload, { onConflict: "student_id" }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router9.delete("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { error } = await supabase.from("student_plan_profiles").delete().eq("student_id", studentId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var planProfiles_default = router9;

// server/routes/outreach.ts
import { Router as Router10 } from "express";

// server/services/OutreachService.ts
var TABLE2 = "outreach_daily_logs";
function mapRow3(row) {
  return {
    id: row.id,
    date: row.date,
    messages_sent: Number(row.messages_sent ?? 0),
    replies_received: Number(row.replies_received ?? 0),
    conversations_started: Number(row.conversations_started ?? 0),
    demos_scheduled: Number(row.demos_scheduled ?? 0),
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
var OutreachService = {
  async getRange(from, to) {
    let q = supabase.from(TABLE2).select("*").order("date", { ascending: false });
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapRow3);
  },
  async getByDate(date) {
    const { data, error } = await supabase.from(TABLE2).select("*").eq("date", date).maybeSingle();
    if (error) throw error;
    return data ? mapRow3(data) : null;
  },
  async upsertDay(date, input) {
    const payload = {
      date,
      messages_sent: Math.max(0, Math.floor(Number(input.messages_sent ?? 0))),
      replies_received: Math.max(0, Math.floor(Number(input.replies_received ?? 0))),
      conversations_started: Math.max(0, Math.floor(Number(input.conversations_started ?? 0))),
      demos_scheduled: Math.max(0, Math.floor(Number(input.demos_scheduled ?? 0))),
      notes: input.notes ?? null
    };
    const { data, error } = await supabase.from(TABLE2).upsert(payload, { onConflict: "date" }).select("*").single();
    if (error) throw error;
    return mapRow3(data);
  },
  async deleteDay(date) {
    const { error } = await supabase.from(TABLE2).delete().eq("date", date);
    if (error) throw error;
  }
};

// server/routes/outreach.ts
var router10 = Router10();
router10.get("/", async (req, res) => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    const logs = await OutreachService.getRange(from, to);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router10.get("/:date", async (req, res) => {
  try {
    const log = await OutreachService.getByDate(req.params.date);
    if (!log) return res.status(404).json({ error: "Not found" });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router10.put("/:date", async (req, res) => {
  try {
    const log = await OutreachService.upsertDay(req.params.date, req.body ?? {});
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router10.delete("/:date", async (req, res) => {
  try {
    await OutreachService.deleteDay(req.params.date);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var outreach_default = router10;

// server/routes/activity.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.post("/log", async (req, res) => {
  try {
    const { gym_id, event_type, event_data, user_id } = req.body ?? {};
    if (!gym_id || !event_type) {
      return res.status(400).json({ error: "gym_id y event_type son requeridos" });
    }
    const allowed = ["login", "onboarding_step_completed"];
    if (!allowed.includes(event_type)) {
      return res.status(400).json({ error: `event_type '${event_type}' no permitido desde el cliente` });
    }
    const row = await ActivityEventsService.log({ gym_id, event_type, event_data, user_id });
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router11.get("/funnel", async (_req, res) => {
  try {
    const funnel = await ActivityEventsService.getFunnel();
    res.json(funnel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router11.get("/retention", async (req, res) => {
  try {
    const weeks = Math.max(1, Math.min(26, Number(req.query.weeks) || 8));
    const cohorts = await ActivityEventsService.getRetention(weeks);
    res.json(cohorts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router11.get("/gym/:gymId", async (req, res) => {
  try {
    const events = await ActivityEventsService.getForGym(req.params.gymId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var activity_default = router11;

// server/routes/running.ts
import { Router as Router12 } from "express";

// server/services/RunningSessionService.ts
function isoMonday(d) {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = out.getUTCDay();
  const diff = (dow + 6) % 7;
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
var RunningSessionService = {
  async getForStudent(studentId, opts = {}) {
    let q = supabase.from("running_sessions").select("*").eq("student_id", studentId).order("session_date", { ascending: false }).order("created_at", { ascending: false });
    if (opts.from) q = q.gte("session_date", opts.from);
    if (opts.to) q = q.lte("session_date", opts.to);
    if (opts.limit && opts.limit > 0) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async getById(id) {
    const { data, error } = await supabase.from("running_sessions").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
  async create(input) {
    const payload = {
      gym_id: input.gym_id,
      student_id: input.student_id,
      session_date: input.session_date,
      distance_km: input.distance_km,
      duration_seconds: input.duration_seconds,
      avg_hr_bpm: input.avg_hr_bpm ?? null,
      perceived_effort: input.perceived_effort ?? null,
      session_type: input.session_type,
      notes: input.notes ?? null,
      logged_by: input.logged_by ?? "pt"
    };
    const { data, error } = await supabase.from("running_sessions").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },
  async update(id, patch) {
    const allowed = {};
    if (patch.session_date !== void 0) allowed.session_date = patch.session_date;
    if (patch.distance_km !== void 0) allowed.distance_km = patch.distance_km;
    if (patch.duration_seconds !== void 0) allowed.duration_seconds = patch.duration_seconds;
    if (patch.avg_hr_bpm !== void 0) allowed.avg_hr_bpm = patch.avg_hr_bpm;
    if (patch.perceived_effort !== void 0) allowed.perceived_effort = patch.perceived_effort;
    if (patch.session_type !== void 0) allowed.session_type = patch.session_type;
    if (patch.notes !== void 0) allowed.notes = patch.notes;
    allowed.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    const { data, error } = await supabase.from("running_sessions").update(allowed).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from("running_sessions").delete().eq("id", id);
    if (error) throw error;
  },
  async getWeeklyTotals(studentId, weeks = 8) {
    const today = /* @__PURE__ */ new Date();
    const currentMonday = isoMonday(today);
    const startMonday = new Date(currentMonday);
    startMonday.setUTCDate(startMonday.getUTCDate() - (weeks - 1) * 7);
    const fromIso = fmtDate(startMonday);
    const { data, error } = await supabase.from("running_sessions").select("session_date, distance_km, duration_seconds").eq("student_id", studentId).gte("session_date", fromIso);
    if (error) throw error;
    const buckets = /* @__PURE__ */ new Map();
    for (let i = 0; i < weeks; i++) {
      const wk = new Date(startMonday);
      wk.setUTCDate(wk.getUTCDate() + i * 7);
      const key = fmtDate(wk);
      buckets.set(key, { week_start: key, km: 0, minutes: 0, sessions: 0 });
    }
    for (const row of data || []) {
      const d = /* @__PURE__ */ new Date(`${row.session_date}T00:00:00Z`);
      const key = fmtDate(isoMonday(d));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.km += Number(row.distance_km) || 0;
      bucket.minutes += (Number(row.duration_seconds) || 0) / 60;
      bucket.sessions += 1;
    }
    return Array.from(buckets.values()).map((b) => ({
      ...b,
      km: Math.round(b.km * 100) / 100,
      minutes: Math.round(b.minutes * 10) / 10
    })).sort((a, b) => a.week_start.localeCompare(b.week_start));
  }
};

// server/routes/running.ts
var router12 = Router12();
var VALID_DISCIPLINES = ["gym", "running"];
router12.get("/students/:id/disciplines", async (req, res) => {
  try {
    const list = await StudentDisciplinesService.listForStudent(req.params.id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.post("/students/:id/disciplines", async (req, res) => {
  try {
    const { gym_id, discipline } = req.body;
    if (!gym_id) return res.status(400).json({ error: "gym_id is required" });
    if (!VALID_DISCIPLINES.includes(discipline)) {
      return res.status(400).json({ error: `discipline must be one of: ${VALID_DISCIPLINES.join(", ")}` });
    }
    const row = await StudentDisciplinesService.add(gym_id, req.params.id, discipline);
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.delete("/students/:id/disciplines/:discipline", async (req, res) => {
  try {
    const { discipline } = req.params;
    if (!VALID_DISCIPLINES.includes(discipline)) {
      return res.status(400).json({ error: `discipline must be one of: ${VALID_DISCIPLINES.join(", ")}` });
    }
    await StudentDisciplinesService.remove(req.params.id, discipline);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.get("/students/:id/sessions", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : void 0;
    const sessions = await RunningSessionService.getForStudent(req.params.id, {
      from: req.query.from,
      to: req.query.to,
      limit: Number.isFinite(limit) ? limit : void 0
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.get("/students/:id/sessions/weekly", async (req, res) => {
  try {
    const weeks = req.query.weeks ? Math.max(1, Math.min(52, Number(req.query.weeks))) : 8;
    const totals = await RunningSessionService.getWeeklyTotals(req.params.id, weeks);
    res.json(totals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.post("/sessions", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.gym_id || !body.student_id || !body.session_date) {
      return res.status(400).json({ error: "gym_id, student_id, session_date are required" });
    }
    if (!(Number(body.distance_km) > 0)) {
      return res.status(400).json({ error: "distance_km must be > 0" });
    }
    if (!(Number(body.duration_seconds) > 0)) {
      return res.status(400).json({ error: "duration_seconds must be > 0" });
    }
    const session = await RunningSessionService.create(body);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.put("/sessions/:id", async (req, res) => {
  try {
    const patch = req.body || {};
    if (patch.distance_km !== void 0 && !(Number(patch.distance_km) > 0)) {
      return res.status(400).json({ error: "distance_km must be > 0" });
    }
    if (patch.duration_seconds !== void 0 && !(Number(patch.duration_seconds) > 0)) {
      return res.status(400).json({ error: "duration_seconds must be > 0" });
    }
    const session = await RunningSessionService.update(req.params.id, patch);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router12.delete("/sessions/:id", async (req, res) => {
  try {
    await RunningSessionService.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var running_default = router12;

// server/routes/runningLoad.ts
import { Router as Router13 } from "express";

// server/services/RunningLoadService.ts
var HR_REST_DEFAULT = 60;
var CTL_TAU = 42;
var ATL_TAU = 7;
var HISTORY_DAYS = 60;
var WARMUP_DAYS = 30;
var VOLUME_SPIKE_RATIO = 1.1;
var VOLUME_SPIKE_MIN_BASELINE_KM = 5;
var INACTIVE_WARN_DAYS = 7;
var INACTIVE_ALERT_DAYS = 14;
var MONOTONY_MIN_SESSIONS = 4;
var MONOTONY_THRESHOLD = 2;
var TSB_NEGATIVE_THRESHOLD = -30;
function fmtDate2(d) {
  return d.toISOString().slice(0, 10);
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function roundTo(n, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
function computeAgeFromBirthDate(birthDate) {
  const b = /* @__PURE__ */ new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return 0;
  const today = /* @__PURE__ */ new Date();
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < b.getUTCMonth() || today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate();
  if (beforeBirthday) age -= 1;
  return age;
}
function estimateHrMax(age) {
  return Math.round(208 - 0.7 * age);
}
function computeSessionLoad(session, hrMax) {
  const durationMin = (Number(session.duration_seconds) || 0) / 60;
  if (durationMin <= 0) return 0;
  const hr = session.avg_hr_bpm != null ? Number(session.avg_hr_bpm) : null;
  if (hrMax && hr && hr > 0) {
    const hrR = clamp((hr - HR_REST_DEFAULT) / (hrMax - HR_REST_DEFAULT), 0, 1);
    return durationMin * hrR * 0.64 * Math.exp(1.92 * hrR);
  }
  const km = Number(session.distance_km) || 0;
  return km * 6;
}
function buildDailyLoads(sessions, hrMax, historyDays = HISTORY_DAYS, warmupDays = WARMUP_DAYS) {
  const byDate = /* @__PURE__ */ new Map();
  for (const s of sessions) {
    const date = String(s.session_date).slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + computeSessionLoad(s, hrMax));
  }
  const today = /* @__PURE__ */ new Date();
  const totalDays = historyDays + warmupDays;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  let ctl = 0;
  let atl = 0;
  const series = [];
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const key = fmtDate2(day);
    const load = byDate.get(key) ?? 0;
    ctl = ctl + (load - ctl) / CTL_TAU;
    atl = atl + (load - atl) / ATL_TAU;
    const tsb = ctl - atl;
    series.push({
      date: key,
      load: roundTo(load, 1),
      ctl: roundTo(ctl, 1),
      atl: roundTo(atl, 1),
      tsb: roundTo(tsb, 1)
    });
  }
  return series.slice(-historyDays);
}
function summarizeKmLastNDays(sessions, n, today) {
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - n);
  const cutoffStr = fmtDate2(cutoff);
  let km = 0;
  for (const s of sessions) {
    if (String(s.session_date) >= cutoffStr) km += Number(s.distance_km) || 0;
  }
  return km;
}
function computeAlerts(history, sessions) {
  const alerts = [];
  const today = /* @__PURE__ */ new Date();
  const last7 = summarizeKmLastNDays(sessions, 7, today);
  const last35 = summarizeKmLastNDays(sessions, 35, today);
  const baselineKmPerWeek = (last35 - last7) / 4;
  if (baselineKmPerWeek >= VOLUME_SPIKE_MIN_BASELINE_KM && last7 > baselineKmPerWeek * VOLUME_SPIKE_RATIO) {
    const deltaPct = Math.round((last7 / baselineKmPerWeek - 1) * 100);
    alerts.push({
      kind: "volume_spike",
      severity: deltaPct >= 25 ? "alert" : "warn",
      message: `Subida de volumen de ${deltaPct}% (${roundTo(last7, 1)} km vs baseline ${roundTo(baselineKmPerWeek, 1)} km/sem).`,
      metadata: {
        delta_pct: deltaPct,
        last7_km: roundTo(last7, 1),
        baseline_km: roundTo(baselineKmPerWeek, 1)
      }
    });
  }
  if (sessions.length === 0) {
    alerts.push({
      kind: "inactive",
      severity: "warn",
      message: "Todav\xEDa no hay corridas registradas.",
      metadata: { days_since: -1 }
    });
  } else {
    const lastDate = String(sessions[0].session_date).slice(0, 10);
    const last = /* @__PURE__ */ new Date(`${lastDate}T00:00:00Z`);
    const daysSince = Math.floor((today.getTime() - last.getTime()) / (1e3 * 60 * 60 * 24));
    if (daysSince > INACTIVE_WARN_DAYS) {
      alerts.push({
        kind: "inactive",
        severity: daysSince >= INACTIVE_ALERT_DAYS ? "alert" : "warn",
        message: `Sin correr hace ${daysSince} d\xEDas.`,
        metadata: { days_since: daysSince, last_session_date: lastDate }
      });
    }
  }
  const last7Loads = history.slice(-7).map((d) => d.load).filter((l) => l > 0);
  if (last7Loads.length >= MONOTONY_MIN_SESSIONS) {
    const mean = last7Loads.reduce((a, b) => a + b, 0) / last7Loads.length;
    const variance = last7Loads.reduce((a, b) => a + (b - mean) ** 2, 0) / last7Loads.length;
    const std = Math.sqrt(variance);
    if (std > 0) {
      const monotony = mean / std;
      if (monotony > MONOTONY_THRESHOLD) {
        alerts.push({
          kind: "monotony",
          severity: "warn",
          message: `Monoton\xEDa alta (${roundTo(monotony, 2)}) \u2014 poca variabilidad de carga, consider\xE1 alternar intensidades.`,
          metadata: { monotony: roundTo(monotony, 2), sessions_in_week: last7Loads.length }
        });
      }
    }
  }
  const todayDay = history[history.length - 1];
  if (todayDay && todayDay.tsb < TSB_NEGATIVE_THRESHOLD) {
    alerts.push({
      kind: "tsb_negative",
      severity: todayDay.tsb < -50 ? "alert" : "warn",
      message: `Fatiga acumulada (TSB ${todayDay.tsb}). Consider\xE1 una semana de descarga.`,
      metadata: { tsb: todayDay.tsb, ctl: todayDay.ctl, atl: todayDay.atl }
    });
  }
  return alerts;
}
async function fetchStudentBirthDate(studentId) {
  const { data, error } = await supabase.from("students").select("birth_date").eq("id", studentId).maybeSingle();
  if (error) throw error;
  return data?.birth_date ?? null;
}
async function fetchSessions(studentId) {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (HISTORY_DAYS + WARMUP_DAYS));
  const cutoffStr = fmtDate2(cutoff);
  const { data, error } = await supabase.from("running_sessions").select("*").eq("student_id", studentId).gte("session_date", cutoffStr).order("session_date", { ascending: false });
  if (error) throw error;
  return data || [];
}
var RunningLoadService = {
  computeAgeFromBirthDate,
  estimateHrMax,
  computeSessionLoad,
  buildDailyLoads,
  computeAlerts,
  async getSummary(studentId) {
    const birthDate = await fetchStudentBirthDate(studentId);
    const age = birthDate ? computeAgeFromBirthDate(birthDate) : null;
    const hrMax = age && age > 0 ? estimateHrMax(age) : null;
    const sessions = await fetchSessions(studentId);
    const history = buildDailyLoads(sessions, hrMax);
    const alerts = computeAlerts(history, sessions);
    const lastDay = history[history.length - 1] ?? { ctl: 0, atl: 0, tsb: 0 };
    return {
      has_birth_date: !!birthDate,
      age,
      hr_max: hrMax,
      current: { ctl: lastDay.ctl, atl: lastDay.atl, tsb: lastDay.tsb },
      history,
      alerts
    };
  },
  async getGymAlerts(gymId) {
    const { data: discRows, error: discErr } = await supabase.from("student_disciplines").select("student_id").eq("discipline", "running");
    if (discErr) throw discErr;
    const runnerIds = Array.from(new Set((discRows || []).map((r) => r.student_id)));
    if (runnerIds.length === 0) return [];
    const { data: studentRows, error: studErr } = await supabase.from("students").select("id, nombre, apellido").eq("gym_id", gymId).in("id", runnerIds);
    if (studErr) throw studErr;
    const students = studentRows || [];
    const summaries = await Promise.all(
      students.map(async (s) => {
        try {
          const sum = await this.getSummary(s.id);
          return { student: s, alerts: sum.alerts };
        } catch (err) {
          console.error(`[runningLoad] getSummary failed for ${s.id}`, err);
          return { student: s, alerts: [] };
        }
      })
    );
    const out = [];
    for (const { student, alerts } of summaries) {
      for (const a of alerts) {
        if (a.severity === "info") continue;
        out.push({
          ...a,
          student_id: student.id,
          student_name: `${student.nombre ?? ""} ${student.apellido ?? ""}`.trim() || "Sin nombre"
        });
      }
    }
    const sevOrder = { alert: 0, warn: 1, info: 2 };
    out.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || a.kind.localeCompare(b.kind));
    return out;
  }
};

// server/routes/runningLoad.ts
var router13 = Router13();
router13.get("/gym/:gymId/alerts", async (req, res) => {
  try {
    const alerts = await RunningLoadService.getGymAlerts(req.params.gymId);
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router13.get("/:studentId", async (req, res) => {
  try {
    const summary = await RunningLoadService.getSummary(req.params.studentId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var runningLoad_default = router13;

// server/routes/strava.ts
import { Router as Router14 } from "express";
var router14 = Router14();
function portalUrl() {
  return process.env.PORTAL_PUBLIC_URL || "https://entren.app";
}
router14.get("/authorize", async (req, res) => {
  try {
    const studentId = String(req.query.student_id || "").trim();
    if (!studentId) return res.status(400).json({ error: "student_id is required" });
    const url = StravaService.buildAuthUrl(studentId);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/callback", async (req, res) => {
  const success = `${portalUrl()}/portal?strava=success`;
  const failure = (reason) => `${portalUrl()}/portal?strava=error&reason=${encodeURIComponent(reason)}`;
  if (req.query.error) {
    return res.redirect(302, failure(String(req.query.error)));
  }
  const code = String(req.query.code || "").trim();
  const state = String(req.query.state || "").trim();
  if (!code || !state) return res.redirect(302, failure("missing_params"));
  try {
    const result = await StravaService.handleCallback(code, state);
    if (result.ok === true) return res.redirect(302, success);
    return res.redirect(302, failure(result.reason));
  } catch (err) {
    console.error("[strava] callback failed", err);
    return res.redirect(302, failure("server_error"));
  }
});
router14.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  try {
    if (mode === "subscribe" && token === StravaService.webhookVerifyToken() && challenge) {
      return res.json({ "hub.challenge": String(challenge) });
    }
    return res.status(403).json({ error: "verification_failed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router14.post("/webhook", async (req, res) => {
  const event = req.body || {};
  res.status(200).end();
  try {
    if (event.object_type !== "activity") return;
    const ownerId = Number(event.owner_id);
    const activityId = Number(event.object_id);
    if (!ownerId || !activityId) return;
    if (event.aspect_type === "create" || event.aspect_type === "update") {
      await StravaService.importActivity(ownerId, activityId);
    } else if (event.aspect_type === "delete") {
      await StravaService.deleteImportedActivity(ownerId, activityId);
    }
  } catch (err) {
    console.error("[strava] webhook processing failed", err);
  }
});
router14.get("/connection/:studentId", async (req, res) => {
  try {
    const conn = await StravaService.getConnectionStatus(req.params.studentId);
    res.json(conn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.delete("/connection/:studentId", async (req, res) => {
  try {
    await StravaService.disconnect(req.params.studentId);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/env", (_req, res) => {
  res.json(StravaService.envSummary());
});
var strava_default = router14;

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
app.use("/api/plan-profiles", planProfiles_default);
app.use("/api/outreach", outreach_default);
app.use("/api/activity", activity_default);
app.use("/api/running/load", runningLoad_default);
app.use("/api/running", running_default);
app.use("/api/strava", strava_default);
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
