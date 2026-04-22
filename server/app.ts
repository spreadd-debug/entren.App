import "dotenv/config";
import express from "express";
import cors from "cors";
import studentRoutes from './routes/students';
import planRoutes from './routes/plans';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';
import automationRoutes from './routes/automation';
import subscriptionRoutes from './routes/subscriptions';
import outreachRoutes from './routes/outreach';
import activityRoutes from './routes/activity';
import runningRoutes from './routes/running';
import stravaRoutes from './routes/strava';
import aiRoutes from './routes/ai';
import { StudentService } from "./services/StudentService";
import { PlanService } from "./services/PlanService";
import { PaymentService } from "./services/PaymentService";
import { BillingReminderService } from "./services/BillingReminderService";

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/running', runningRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/ai', aiRoutes);

// Legacy/Combined data endpoint
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
      students,
      payments,
      plans,
      reminderLogs: logs,
      reminderRules: rules,
      messageTemplates: templates,
      automationStatus: {
        lastRun: logs.length > 0 ? logs[0].created_at : null,
        nextRun: null,
        lastResult: null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
