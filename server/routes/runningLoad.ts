import { Router } from 'express';
import { RunningLoadService } from '../services/RunningLoadService';

const router = Router();

// GET /api/running/load/gym/:gymId/alerts
// Importante: declarar ANTES que /:studentId para que no caiga en el catch-all.
router.get('/gym/:gymId/alerts', async (req, res) => {
  try {
    const alerts = await RunningLoadService.getGymAlerts(req.params.gymId);
    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/running/load/:studentId
router.get('/:studentId', async (req, res) => {
  try {
    const summary = await RunningLoadService.getSummary(req.params.studentId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
