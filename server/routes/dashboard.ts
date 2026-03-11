
import { Router } from 'express';
import { DashboardService } from '../services/DashboardService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    const stats = await DashboardService.getStats(gymId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
