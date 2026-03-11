
import express from "express";
import { createServer as createViteServer } from "vite";
import { MOCK_STUDENTS, MOCK_PAYMENTS, MOCK_PLANS, MOCK_REMINDER_RULES, MOCK_TEMPLATES, MOCK_REMINDER_LOGS } from "./src/data/mock";
import { BillingReminderService } from "./src/services/reminderService";
import { AutomationStatus, ReminderLog } from "./src/types";

// In-memory "database" for simulation
let students = [...MOCK_STUDENTS];
let payments = [...MOCK_PAYMENTS];
let plans = [...MOCK_PLANS];
let reminderRules = [...MOCK_REMINDER_RULES];
let messageTemplates = [...MOCK_TEMPLATES];
let reminderLogs = [...MOCK_REMINDER_LOGS];

let automationStatus: AutomationStatus = {
  lastRun: "2026-03-10T10:00:00Z",
  nextRun: "2026-03-12T10:00:00Z",
  lastResult: {
    totalEvaluated: 5,
    totalEligible: 4,
    totalGenerated: 1,
    totalIgnored: 1
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/data", (req, res) => {
    res.json({
      students,
      payments,
      plans,
      reminderRules,
      messageTemplates,
      reminderLogs,
      automationStatus
    });
  });

  app.get("/api/automation/status", (req, res) => {
    res.json(automationStatus);
  });

  app.post("/api/automation/run", (req, res) => {
    console.log("[SERVER] Running manual automation check...");
    
    const result = BillingReminderService.runDailyReminderCheck(
      students,
      reminderRules,
      messageTemplates,
      reminderLogs,
      plans
    );

    if (result.totalGenerated > 0) {
      // Prepend new logs
      reminderLogs = [...result.logs, ...reminderLogs];
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    automationStatus = {
      lastRun: now.toISOString(),
      nextRun: tomorrow.toISOString(),
      lastResult: {
        totalEvaluated: result.totalEvaluated,
        totalEligible: result.totalEligible,
        totalGenerated: result.totalGenerated,
        totalIgnored: result.totalIgnored
      }
    };

    res.json({
      success: true,
      result: automationStatus.lastResult,
      newLogs: result.logs
    });
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
