import { Router } from 'express';
import { supabase } from '../db/supabase';

const router = Router();

// GET /api/plan-profiles/:studentId
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { data, error } = await supabase
      .from('student_plan_profiles')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/plan-profiles/:studentId — upsert (create or update)
router.put('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const body = req.body;

    const payload = {
      ...body,
      student_id: studentId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('student_plan_profiles')
      .upsert(payload, { onConflict: 'student_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/plan-profiles/:studentId
router.delete('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { error } = await supabase
      .from('student_plan_profiles')
      .delete()
      .eq('student_id', studentId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
