
import { Router } from 'express';
import { BillingReminderService } from '../services/BillingReminderService';
import { StravaService } from '../services/StravaService';
import { supabase } from '../db/supabase';

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

// Vercel Cron endpoint — called daily by vercel.json schedule
// Protected by CRON_SECRET environment variable
router.post('/cron', async (req, res) => {
  const authHeader = req.headers['authorization'] as string | undefined;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch all gyms with Pro or Business plan that are actively paying
    const { data: subs, error } = await supabase
      .from('gym_subscriptions')
      .select('gym_id')
      .in('plan_tier', ['pro', 'business'])
      .eq('status', 'active')
      .eq('access_enabled', true);

    if (error) throw error;

    const gymIds = (subs || []).map((s: any) => s.gym_id);

    const results = await Promise.allSettled(
      gymIds.map((gymId: string) => BillingReminderService.runDailyCheck(gymId))
    );

    const summary = results.map((r, i) => ({
      gymId: gymIds[i],
      status: r.status,
      ...(r.status === 'fulfilled' ? { result: r.value } : { error: (r as PromiseRejectedResult).reason?.message }),
    }));

    // Red de seguridad para Strava: re-importa actividades de las últimas 24h
    // de cada conexión, por si el webhook perdió algún evento.
    let stravaSync: { checked: number; imported: number } | { error: string };
    try {
      stravaSync = await StravaService.backfillRecentForAllConnections(24);
    } catch (err: any) {
      stravaSync = { error: err?.message || String(err) };
    }

    res.json({ ok: true, ran: gymIds.length, summary, stravaSync });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
