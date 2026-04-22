import { Router } from 'express';
import { StudentDisciplinesService } from '../services/StudentDisciplinesService';
import { RunningSessionService } from '../services/RunningSessionService';
import { StudentDiscipline } from '../../shared/types';

const router = Router();

const VALID_DISCIPLINES: StudentDiscipline[] = ['gym', 'running'];

// ── Disciplines ──────────────────────────────────────────────────────────────

// GET /api/running/students/:id/disciplines
router.get('/students/:id/disciplines', async (req, res) => {
  try {
    const list = await StudentDisciplinesService.listForStudent(req.params.id);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/running/students/:id/disciplines  body: { gym_id, discipline }
router.post('/students/:id/disciplines', async (req, res) => {
  try {
    const { gym_id, discipline } = req.body;
    if (!gym_id) return res.status(400).json({ error: 'gym_id is required' });
    if (!VALID_DISCIPLINES.includes(discipline)) {
      return res.status(400).json({ error: `discipline must be one of: ${VALID_DISCIPLINES.join(', ')}` });
    }
    const row = await StudentDisciplinesService.add(gym_id, req.params.id, discipline);
    res.status(201).json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/running/students/:id/disciplines/:discipline
router.delete('/students/:id/disciplines/:discipline', async (req, res) => {
  try {
    const { discipline } = req.params;
    if (!VALID_DISCIPLINES.includes(discipline as StudentDiscipline)) {
      return res.status(400).json({ error: `discipline must be one of: ${VALID_DISCIPLINES.join(', ')}` });
    }
    await StudentDisciplinesService.remove(req.params.id, discipline as StudentDiscipline);
    res.status(204).end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Running sessions ─────────────────────────────────────────────────────────

// GET /api/running/students/:id/sessions?from=&to=&limit=
router.get('/students/:id/sessions', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const sessions = await RunningSessionService.getForStudent(req.params.id, {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/running/students/:id/sessions/weekly?weeks=8
router.get('/students/:id/sessions/weekly', async (req, res) => {
  try {
    const weeks = req.query.weeks ? Math.max(1, Math.min(52, Number(req.query.weeks))) : 8;
    const totals = await RunningSessionService.getWeeklyTotals(req.params.id, weeks);
    res.json(totals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/running/sessions
router.post('/sessions', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.gym_id || !body.student_id || !body.session_date) {
      return res.status(400).json({ error: 'gym_id, student_id, session_date are required' });
    }
    if (!(Number(body.distance_km) > 0)) {
      return res.status(400).json({ error: 'distance_km must be > 0' });
    }
    if (!(Number(body.duration_seconds) > 0)) {
      return res.status(400).json({ error: 'duration_seconds must be > 0' });
    }
    const session = await RunningSessionService.create(body);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/running/sessions/:id
router.put('/sessions/:id', async (req, res) => {
  try {
    const patch = req.body || {};
    if (patch.distance_km !== undefined && !(Number(patch.distance_km) > 0)) {
      return res.status(400).json({ error: 'distance_km must be > 0' });
    }
    if (patch.duration_seconds !== undefined && !(Number(patch.duration_seconds) > 0)) {
      return res.status(400).json({ error: 'duration_seconds must be > 0' });
    }
    const session = await RunningSessionService.update(req.params.id, patch);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/running/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    await RunningSessionService.delete(req.params.id);
    res.status(204).end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
