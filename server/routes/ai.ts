import { Router } from 'express';
import { AIAnalysisServerService } from '../services/AIAnalysisServerService';
import { supabase } from '../db/supabase';

const router = Router();

// POST /api/ai/analyze — generate AI analysis for a student (post-session or manual)
router.post('/analyze', async (req, res) => {
  try {
    const { gymId, studentId, sessionId } = req.body;

    if (!gymId || !studentId) {
      return res.status(400).json({ error: 'gymId y studentId son requeridos' });
    }

    const result = await AIAnalysisServerService.analyzeAndSave(gymId, studentId, sessionId);
    res.status(201).json(result);
  } catch (error: any) {
    const status = error.message?.includes('Limite de') ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
});

// GET /api/ai/latest?studentId=xxx — get latest analysis for a student
router.get('/latest', async (req, res) => {
  try {
    const studentId = req.query.studentId as string;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId es requerido' });
    }

    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/count-week?studentId=xxx — how many analyses this week
router.get('/count-week', async (req, res) => {
  try {
    const studentId = req.query.studentId as string;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId es requerido' });
    }

    const count = await AIAnalysisServerService.countThisWeek(studentId);
    res.json({ count, limit: 3 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
