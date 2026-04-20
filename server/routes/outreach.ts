import { Router } from 'express';
import { OutreachService } from '../services/OutreachService';

const router = Router();

// GET /api/outreach?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const logs = await OutreachService.getRange(from, to);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/outreach/:date  (YYYY-MM-DD)
router.get('/:date', async (req, res) => {
  try {
    const log = await OutreachService.getByDate(req.params.date);
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/outreach/:date  — upsert por fecha
router.put('/:date', async (req, res) => {
  try {
    const log = await OutreachService.upsertDay(req.params.date, req.body ?? {});
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/outreach/:date
router.delete('/:date', async (req, res) => {
  try {
    await OutreachService.deleteDay(req.params.date);
    res.status(204).end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
