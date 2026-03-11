
import { Router } from 'express';
import { BillingReminderService } from '../services/BillingReminderService';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    const logs = await BillingReminderService.getLogs(gymId);
    const lastRun = logs.length > 0 ? logs[0].created_at : null;
    
    res.json({
      lastRun,
      nextRun: lastRun ? new Date(new Date(lastRun).getTime() + 86400000).toISOString() : null,
      lastResult: null // Could be stored in a separate table if needed
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    const logs = await BillingReminderService.getLogs(gymId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run', async (req, res) => {
  try {
    const gymId = req.body.gymId || '11111111-1111-1111-1111-111111111111';
    const result = await BillingReminderService.runDailyCheck(gymId);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
