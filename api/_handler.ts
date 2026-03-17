import "dotenv/config";
import express from "express";
import cors from "cors";
import studentRoutes from '../server/routes/students';
import planRoutes from '../server/routes/plans';
import paymentRoutes from '../server/routes/payments';
import dashboardRoutes from '../server/routes/dashboard';
import automationRoutes from '../server/routes/automation';
import subscriptionRoutes from '../server/routes/subscriptions';
import staffRoutes from '../server/routes/staff';
import { StudentService } from "../server/services/StudentService";
import { PlanService } from "../server/services/PlanService";
import { PaymentService } from "../server/services/PaymentService";
import { BillingReminderService } from "../server/services/BillingReminderService";

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/staff', staffRoutes);

app.get("/api/health", async (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const status = {
    env: {
      SUPABASE_URL: supabaseUrl ? `OK (${supabaseUrl.slice(0, 30)}...)` : 'MISSING',
      SUPABASE_KEY: supabaseKey ? `OK (length: ${supabaseKey.length})` : 'MISSING',
    },
    db: null as any,
  };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseUrl!, supabaseKey!);
    const { data, error } = await client.from('gym_subscriptions').select('gym_id').limit(1);
    status.db = error ? { error: error.message } : { ok: true, rows: data?.length ?? 0 };
  } catch (e: any) {
    status.db = { error: e.message };
  }
  res.json(status);
});

app.get("/api/data", async (req, res) => {
  try {
    const gymId = '11111111-1111-1111-1111-111111111111';
    const [students, payments, plans, logs, rules, templates] = await Promise.all([
      StudentService.getAll(gymId),
      PaymentService.getAll(gymId),
      PlanService.getAll(gymId),
      BillingReminderService.getLogs(gymId),
      BillingReminderService.getRules(gymId),
      BillingReminderService.getTemplates(gymId)
    ]);
    res.json({
      students, payments, plans,
      reminderLogs: logs, reminderRules: rules, messageTemplates: templates,
      automationStatus: { lastRun: logs.length > 0 ? logs[0].created_at : null, nextRun: null, lastResult: null }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
