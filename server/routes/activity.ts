import { Router } from 'express';
import { ActivityEventsService } from '../services/ActivityEventsService';

const router = Router();

// POST /api/activity/log  — usado desde el cliente para loguear 'login' y 'onboarding_step_completed'
router.post('/log', async (req, res) => {
  try {
    const { gym_id, event_type, event_data, user_id } = req.body ?? {};
    if (!gym_id || !event_type) {
      return res.status(400).json({ error: 'gym_id y event_type son requeridos' });
    }
    const allowed = ['login', 'onboarding_step_completed'];
    if (!allowed.includes(event_type)) {
      return res.status(400).json({ error: `event_type '${event_type}' no permitido desde el cliente` });
    }
    const row = await ActivityEventsService.log({ gym_id, event_type, event_data, user_id });
    res.status(201).json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activity/funnel
router.get('/funnel', async (_req, res) => {
  try {
    const funnel = await ActivityEventsService.getFunnel();
    res.json(funnel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activity/retention?weeks=8
router.get('/retention', async (req, res) => {
  try {
    const weeks = Math.max(1, Math.min(26, Number(req.query.weeks) || 8));
    const cohorts = await ActivityEventsService.getRetention(weeks);
    res.json(cohorts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activity/gym/:gymId
router.get('/gym/:gymId', async (req, res) => {
  try {
    const events = await ActivityEventsService.getForGym(req.params.gymId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
