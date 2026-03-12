import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import studentRoutes from './routes/students';
import planRoutes from './routes/plans';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';
import automationRoutes from './routes/automation';
import { StudentService } from "./services/StudentService";
import { PlanService } from "./services/PlanService";
import { PaymentService } from "./services/PaymentService";
import { BillingReminderService } from "./services/BillingReminderService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api/students', studentRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/automation', automationRoutes);

  // Legacy/Combined data endpoint for initial load if needed
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
