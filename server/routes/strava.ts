import { Router } from 'express';
import { StravaService } from '../services/StravaService';

const router = Router();

function portalUrl(): string {
  return process.env.PORTAL_PUBLIC_URL || 'https://entren.app';
}

// ── OAuth initiation ─────────────────────────────────────────────────────────

// GET /api/strava/authorize?student_id=
// Devuelve la URL a la que el SPA debe navegar (no hacemos 302 server-side
// para que el cliente controle el flujo y pueda mostrar feedback).
router.get('/authorize', async (req, res) => {
  try {
    const studentId = String(req.query.student_id || '').trim();
    if (!studentId) return res.status(400).json({ error: 'student_id is required' });
    const url = StravaService.buildAuthUrl(studentId);
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/strava/callback?code=&state=&scope=&error=
// Strava redirige aquí después de la autorización. Hacemos el token exchange y
// volvemos al portal con un flag de éxito/error.
router.get('/callback', async (req, res) => {
  const success = `${portalUrl()}/portal?strava=success`;
  const failure = (reason: string) =>
    `${portalUrl()}/portal?strava=error&reason=${encodeURIComponent(reason)}`;

  if (req.query.error) {
    return res.redirect(302, failure(String(req.query.error)));
  }

  const code = String(req.query.code || '').trim();
  const state = String(req.query.state || '').trim();
  if (!code || !state) return res.redirect(302, failure('missing_params'));

  try {
    const result = await StravaService.handleCallback(code, state);
    if (result.ok === true) return res.redirect(302, success);
    return res.redirect(302, failure(result.reason));
  } catch (err: any) {
    console.error('[strava] callback failed', err);
    return res.redirect(302, failure('server_error'));
  }
});

// ── Webhook (Strava → nosotros) ──────────────────────────────────────────────

// GET /api/strava/webhook  → handshake de validación
// Strava llama a este endpoint cuando creamos la subscription para verificar
// que controlamos el dominio. Debemos echar el challenge si el verify_token
// coincide con el que pasamos al crear la subscription.
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    if (mode === 'subscribe' && token === StravaService.webhookVerifyToken() && challenge) {
      return res.json({ 'hub.challenge': String(challenge) });
    }
    return res.status(403).json({ error: 'verification_failed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/strava/webhook  → push de actividad
// Strava espera 200 OK en <2s (reintenta 3 veces si no). Procesamos inline
// porque es 1 fetch + 1 upsert (~500-800ms). Nunca fallamos con 5xx para
// evitar loops de reintento — preferimos perder 1 evento (lo recupera el cron).
router.post('/webhook', async (req, res) => {
  const event = req.body || {};
  // Confirmamos recepción ya — Strava cierra a los 2s y reintenta si tarda.
  res.status(200).end();

  try {
    if (event.object_type !== 'activity') return;
    const ownerId = Number(event.owner_id);
    const activityId = Number(event.object_id);
    if (!ownerId || !activityId) return;

    if (event.aspect_type === 'create' || event.aspect_type === 'update') {
      await StravaService.importActivity(ownerId, activityId);
    } else if (event.aspect_type === 'delete') {
      await StravaService.deleteImportedActivity(ownerId, activityId);
    }
  } catch (err) {
    console.error('[strava] webhook processing failed', err);
  }
});

// ── Connection status (consumido por el portal del alumno) ───────────────────

// GET /api/strava/connection/:studentId
router.get('/connection/:studentId', async (req, res) => {
  try {
    const conn = await StravaService.getConnectionStatus(req.params.studentId);
    res.json(conn);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/strava/connection/:studentId
router.delete('/connection/:studentId', async (req, res) => {
  try {
    await StravaService.disconnect(req.params.studentId);
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/strava/env  → diagnóstico (true/false, no expone valores)
router.get('/env', (_req, res) => {
  res.json(StravaService.envSummary());
});

export default router;
