
import { Router } from 'express';
import { StudentService } from '../services/StudentService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    const students = await StudentService.getAll(gymId);
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    const student = await StudentService.getById(req.params.id, gymId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const student = await StudentService.create(req.body);
    res.status(201).json(student);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('[PUT /students/:id] id:', req.params.id, 'body:', JSON.stringify(req.body));
    const student = await StudentService.update(req.params.id, req.body);
    console.log('[PUT /students/:id] result:', JSON.stringify(student));
    res.json(student);
  } catch (error: any) {
    console.error('[PUT /students/:id] ERROR:', error.message, error);
    res.status(500).json({ error: error.message, details: error.details ?? null });
  }
});

router.post('/:id/regenerate-code', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || req.body.gymId || '11111111-1111-1111-1111-111111111111';
    const newCode = await StudentService.regenerateAccessCode(req.params.id, gymId);
    res.json({ access_code: newCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const gymId = req.query.gymId as string || '11111111-1111-1111-1111-111111111111';
    await StudentService.delete(req.params.id, gymId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
