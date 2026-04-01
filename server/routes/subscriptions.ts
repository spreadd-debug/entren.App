import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '../services/SubscriptionService';

const router = Router();

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── Billing payments (fixed paths must come BEFORE /:gymId) ───────────────────

// GET /api/subscriptions/billing?gymId=...
router.get('/billing', async (req, res) => {
  try {
    const gymId = req.query.gymId as string | undefined;
    const payments = await SubscriptionService.getBillingPayments(gymId);
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/billing
router.post('/billing', async (req, res) => {
  try {
    const payment = await SubscriptionService.recordBillingPayment(req.body);
    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Gym subscriptions ─────────────────────────────────────────────────────────

// POST /api/subscriptions/gyms — create new gym + initial trial subscription + auth user
router.post('/gyms', async (req, res) => {
  try {
    const { name, owner_email, owner_phone, plan_tier = 'starter', trial_days = 30, gym_type = 'gym', monthly_price, password } = req.body;
    if (!name || !owner_email) {
      return res.status(400).json({ error: 'name y owner_email son requeridos' });
    }

    // 1. Create gym + subscription
    const sub = await SubscriptionService.createGym(name, owner_email, plan_tier, Number(trial_days), owner_phone, gym_type, monthly_price != null ? Number(monthly_price) : null);

    // 2. If password provided, create Supabase Auth user (from SuperAdmin)
    if (password) {
      const supabaseAdmin = getAdminClient();
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: owner_email,
        password,
        user_metadata: {
          gym_id: sub.gym_id,
          role: 'admin',
          ...(gym_type === 'personal_trainer' ? { gym_type: 'personal_trainer' } : {}),
          must_change_password: true,
        },
        email_confirm: true,
      });
      if (authError) {
        // Gym was created but auth failed — return warning
        return res.status(201).json({ ...sub, auth_warning: authError.message });
      }
    }

    res.status(201).json(sub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subscriptions — list all (superadmin)
router.get('/', async (_req, res) => {
  try {
    const subscriptions = await SubscriptionService.getAll();
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subscriptions/:gymId
router.get('/:gymId', async (req, res) => {
  try {
    const sub = await SubscriptionService.getByGymId(req.params.gymId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json(sub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/subscriptions/:gymId — full/partial update (superadmin)
router.put('/:gymId', async (req, res) => {
  try {
    const updated = await SubscriptionService.upsert(req.params.gymId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/:gymId/activate
router.post('/:gymId/activate', async (req, res) => {
  try {
    const { period_end, plan_tier } = req.body;
    if (!period_end) return res.status(400).json({ error: 'period_end is required' });
    const updated = await SubscriptionService.activate(req.params.gymId, period_end, plan_tier);
    res.json(updated);
  } catch (error: any) {
    const status = error.message?.includes('no tiene pagos registrados') ? 422 : 500;
    res.status(status).json({ error: error.message });
  }
});

// POST /api/subscriptions/:gymId/suspend
router.post('/:gymId/suspend', async (req, res) => {
  try {
    const updated = await SubscriptionService.suspend(req.params.gymId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/:gymId/cancel
router.post('/:gymId/cancel', async (req, res) => {
  try {
    const updated = await SubscriptionService.cancel(req.params.gymId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/:gymId/trial
router.post('/:gymId/trial', async (req, res) => {
  try {
    const { trial_days = 30 } = req.body;
    const updated = await SubscriptionService.startTrial(req.params.gymId, Number(trial_days));
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/:gymId/extend
router.post('/:gymId/extend', async (req, res) => {
  try {
    const { period_end } = req.body;
    if (!period_end) return res.status(400).json({ error: 'period_end is required' });
    const updated = await SubscriptionService.extend(req.params.gymId, period_end);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/:gymId/past-due
router.post('/:gymId/past-due', async (req, res) => {
  try {
    const updated = await SubscriptionService.markPastDue(req.params.gymId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
