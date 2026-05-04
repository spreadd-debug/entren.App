import { Router } from 'express';
import { FxRateService } from '../services/FxRateService';

const router = Router();

// GET /api/personal/fx/latest
// Devuelve todas las cotizaciones actuales (oficial, blue, mep, ccl, tarjeta, ...).
router.get('/latest', async (_req, res) => {
  try {
    const rates = await FxRateService.getLatest();
    res.json(rates);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'fx_failed' });
  }
});

// GET /api/personal/fx/history?name=blue&days=30
router.get('/history', async (req, res) => {
  try {
    const name = String(req.query.name || 'blue');
    const days = Number(req.query.days) || 30;
    const history = await FxRateService.getHistory(name, days);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'fx_failed' });
  }
});

export default router;
