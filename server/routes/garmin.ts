import { Router } from 'express';
import { GarminService } from '../services/GarminService';

const router = Router();

// POST /api/garmin/connect
// Body: { profile_id, email, password }
// Loguea contra Garmin para validar y guarda credenciales encriptadas.
// Después dispara un backfill inicial de 14 días.
router.post('/connect', async (req, res) => {
  const { profile_id, email, password } = req.body || {};
  if (!profile_id || !email || !password) {
    return res.status(400).json({ error: 'profile_id, email and password are required' });
  }
  try {
    const result = await GarminService.connect(String(profile_id), String(email), String(password));
    // Backfill inicial — awaited porque en serverless la función se mata al responder.
    let synced: any = null;
    try { synced = await GarminService.initialBackfill(String(profile_id)); }
    catch (err) { console.error('[garmin] initial backfill failed', err); }
    res.json({ ok: true, display_name: result.display_name, synced });
  } catch (err: any) {
    console.error('[garmin] connect failed', err);
    res.status(400).json({ error: err?.message ?? 'connect_failed' });
  }
});

// GET /api/garmin/connection/:profileId
router.get('/connection/:profileId', async (req, res) => {
  try {
    const status = await GarminService.getStatus(req.params.profileId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/garmin/connection/:profileId
router.delete('/connection/:profileId', async (req, res) => {
  try {
    await GarminService.disconnect(req.params.profileId);
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garmin/sync/:profileId
// Sync on-demand desde la UI. Por default últimos 2 días.
router.post('/sync/:profileId', async (req, res) => {
  try {
    const days = Number(req.body?.days) || 2;
    const result = await GarminService.syncRecent(req.params.profileId, days);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[garmin] sync failed', err);
    res.status(500).json({ error: err?.message ?? 'sync_failed' });
  }
});

export default router;
