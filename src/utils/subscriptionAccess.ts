import { GymSubscription, GymPlanTier } from '../../shared/types';

type PlanFeature = 'whatsapp_reminders';

const FEATURE_PLANS: Record<PlanFeature, GymPlanTier[]> = {
  whatsapp_reminders: ['pro', 'business'],
};

/**
 * Returns true if the gym's current plan includes the requested feature.
 * Trial and Starter plans return false for Pro/Business-only features.
 */
export function hasPlanFeature(
  subscription: GymSubscription | null,
  feature: PlanFeature
): boolean {
  if (!subscription) return false;
  return FEATURE_PLANS[feature]?.includes(subscription.plan_tier) ?? false;
}

export type AccessReason = 'active' | 'trial' | 'grace' | 'suspended' | 'cancelled' | 'expired';

export interface SubscriptionAccessResult {
  canAccess: boolean;
  reason: AccessReason;
  warning?: string;
}

/**
 * Central access logic: determines if a gym can use the app based on
 * its subscription record. Returns access status + optional warning banner.
 *
 * If no subscription record exists (null), access is granted to avoid
 * breaking gyms that haven't been migrated yet.
 */
export function getSubscriptionAccess(sub: GymSubscription | null): SubscriptionAccessResult {
  if (!sub) return { canAccess: true, reason: 'active' };

  // Manual override takes absolute priority
  if (!sub.access_enabled) {
    return {
      canAccess: false,
      reason: sub.status === 'cancelled' ? 'cancelled' : 'suspended',
    };
  }

  const now = new Date();

  switch (sub.status) {
    case 'trial': {
      const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
      if (!trialEnd || now <= trialEnd) {
        const daysLeft = trialEnd
          ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000)
          : null;
        const warning =
          daysLeft !== null && daysLeft <= 5
            ? `Período de prueba: quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`
            : undefined;
        return { canAccess: true, reason: 'trial', warning };
      }
      return { canAccess: false, reason: 'expired' };
    }

    case 'active':
      return { canAccess: true, reason: 'active' };

    case 'past_due': {
      const graceEnd = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : null;
      if (graceEnd && now <= graceEnd) {
        const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / 86_400_000);
        return {
          canAccess: true,
          reason: 'grace',
          warning: `Suscripción vencida. Período de gracia: ${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}.`,
        };
      }
      return { canAccess: false, reason: 'expired' };
    }

    case 'suspended':
      return { canAccess: false, reason: 'suspended' };

    case 'cancelled':
      return { canAccess: false, reason: 'cancelled' };

    default:
      return { canAccess: false, reason: 'suspended' };
  }
}
