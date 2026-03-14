import React from 'react';
import { AlertTriangle, Lock, XCircle } from 'lucide-react';
import { GymSubscription } from '../../shared/types';
import { getSubscriptionAccess, AccessReason } from '../utils/subscriptionAccess';

interface Props {
  subscription: GymSubscription | null;
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<Props> = ({ subscription, children }) => {
  const access = getSubscriptionAccess(subscription);

  if (!access.canAccess) {
    return <BlockedScreen reason={access.reason} />;
  }

  return (
    <>
      {access.warning && <WarningBanner message={access.warning} />}
      {children}
    </>
  );
};

// ── Warning banner (shown inside the app for grace / trial expiring) ──────────

function WarningBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-5 py-3 text-sm font-medium">
      <AlertTriangle size={15} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Full-screen blocked state ─────────────────────────────────────────────────

const MESSAGES: Record<AccessReason, { title: string; body: string }> = {
  suspended: {
    title: 'Cuenta suspendida',
    body: 'Tu cuenta fue suspendida temporalmente. Contactá con soporte para reactivarla.',
  },
  cancelled: {
    title: 'Suscripción cancelada',
    body: 'Tu suscripción fue cancelada. Contactá con soporte si querés reactivarla.',
  },
  expired: {
    title: 'Suscripción vencida',
    body: 'Tu período de prueba o suscripción ha vencido. Contactá con soporte para renovar.',
  },
  // These shouldn't render a blocked screen, but included for completeness
  active: { title: '', body: '' },
  trial: { title: '', body: '' },
  grace: { title: '', body: '' },
};

function BlockedScreen({ reason }: { reason: AccessReason }) {
  const msg = MESSAGES[reason] ?? MESSAGES.suspended;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center space-y-5 border border-slate-100 dark:border-slate-800">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center">
            {reason === 'cancelled' ? (
              <XCircle size={30} className="text-red-500" />
            ) : (
              <Lock size={30} className="text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{msg.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{msg.body}</p>
        </div>

        <p className="text-xs text-slate-300 dark:text-slate-700 font-medium tracking-wide">
          entrenApp
        </p>
      </div>
    </div>
  );
}
