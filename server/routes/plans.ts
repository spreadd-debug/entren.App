
import { Router } from 'express';
import { PlanService } from '../services/PlanService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    const plans = await PlanService.getAll(gymId);
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const plan = await PlanService.create(req.body);
    res.status(201).json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const plan = await PlanService.update(req.params.id, req.body);
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const gymId = req.query.gymId as string | undefined;
    await PlanService.delete(req.params.id, gymId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
