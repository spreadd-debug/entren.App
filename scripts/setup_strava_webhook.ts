// ══════════════════════════════════════════════════════════════════════════════
// Bootstrap del webhook de Strava
//
// Strava limita a 1 push subscription por app, así que este script se corre
// UNA SOLA VEZ por entorno (producción). Crea la subscription apuntando al
// /api/strava/webhook deployado.
//
// Uso:
//   npx tsx scripts/setup_strava_webhook.ts          # crea (o muestra existente)
//   npx tsx scripts/setup_strava_webhook.ts --delete # borra la subscription actual
//
// Env vars requeridas:
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN
//   PORTAL_PUBLIC_URL (para construir el callback_url)
// ══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';

const STRAVA_API = 'https://www.strava.com/api/v3/push_subscriptions';

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[setup] missing env var ${name}`);
    process.exit(1);
  }
  return v;
}

async function listSubscriptions(): Promise<Array<{ id: number; callback_url: string }>> {
  const params = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    client_secret: env('STRAVA_CLIENT_SECRET'),
  });
  const res = await fetch(`${STRAVA_API}?${params.toString()}`);
  if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createSubscription(callbackUrl: string): Promise<{ id: number }> {
  const body = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    client_secret: env('STRAVA_CLIENT_SECRET'),
    callback_url: callbackUrl,
    verify_token: env('STRAVA_WEBHOOK_VERIFY_TOKEN'),
  });
  const res = await fetch(STRAVA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deleteSubscription(id: number): Promise<void> {
  const params = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    client_secret: env('STRAVA_CLIENT_SECRET'),
  });
  const res = await fetch(`${STRAVA_API}/${id}?${params.toString()}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`delete failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const wantDelete = process.argv.includes('--delete');
  const portal = env('PORTAL_PUBLIC_URL');
  const callbackUrl = `${portal.replace(/\/$/, '')}/api/strava/webhook`;

  console.log(`[setup] callback_url = ${callbackUrl}`);
  const existing = await listSubscriptions();

  if (wantDelete) {
    if (existing.length === 0) {
      console.log('[setup] no existing subscription to delete');
      return;
    }
    for (const sub of existing) {
      await deleteSubscription(sub.id);
      console.log(`[setup] deleted subscription ${sub.id}`);
    }
    return;
  }

  if (existing.length > 0) {
    console.log('[setup] subscription already exists:');
    for (const sub of existing) console.log(`  - id=${sub.id} url=${sub.callback_url}`);
    console.log('[setup] (run with --delete to remove and recreate)');
    return;
  }

  const created = await createSubscription(callbackUrl);
  console.log(`[setup] subscription created: id=${created.id}`);
  console.log('[setup] Strava ya validó el endpoint y empezará a enviar eventos.');
}

main().catch(err => {
  console.error('[setup] error:', err);
  process.exit(1);
});
