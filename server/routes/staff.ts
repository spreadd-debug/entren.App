import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// POST /api/staff — create a staff (trainer) user for a gym
router.post('/', async (req, res) => {
  try {
    const { email, password, name, gym_id } = req.body;
    if (!email || !password || !gym_id) {
      return res.status(400).json({ error: 'email, password y gym_id son requeridos' });
    }
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { gym_id, role: 'staff', name: name ?? '' },
      email_confirm: true,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data.user.id, email: data.user.email, name: name ?? '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staff?gymId=... — list staff for a gym
router.get('/', async (req, res) => {
  try {
    const gymId = req.query.gymId as string;
    if (!gymId) return res.status(400).json({ error: 'gymId requerido' });
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(400).json({ error: error.message });
    const staff = (data.users as any[])
      .filter(u => u.user_metadata?.gym_id === gymId && u.user_metadata?.role === 'staff')
      .map(u => ({ id: u.id, email: u.email ?? '', name: u.user_metadata?.name ?? '' }));
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/staff/:userId
router.delete('/:userId', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(req.params.userId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
