import { PersonalAccount } from '../../../../shared/types';

// Cuando el usuario no setea color_a/color_b explícito, derivamos un gradient
// agradable a partir de kind+currency. Mantiene consistencia visual sin
// obligarlo a elegir cada vez que crea una cuenta.
const FALLBACK_BY_KIND: Record<string, [string, string]> = {
  cash:       ['#10B981', '#3B82F6'],
  bank:       ['#6366F1', '#A855F7'],
  wallet:     ['#F59E0B', '#EC4899'],
  investment: ['#0EA5E9', '#8B5CF6'],
  other:      ['#475569', '#0F172A'],
};

const FALLBACK_BY_CURRENCY: Record<string, [string, string]> = {
  USD: ['#22C55E', '#0EA5E9'],
  EUR: ['#6366F1', '#22D3EE'],
  ARS: ['#F59E0B', '#EC4899'],
};

export function accountGradient(account: PersonalAccount): [string, string] {
  if (account.color_a && account.color_b) return [account.color_a, account.color_b];
  return (
    FALLBACK_BY_CURRENCY[account.currency] ??
    FALLBACK_BY_KIND[account.kind] ??
    FALLBACK_BY_KIND.other
  );
}

export function gradientCss([a, b]: [string, string]): string {
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

// Para los blobs decorativos sobre fondo blanco/cream.
export function gradientRadialCss([a, b]: [string, string]): string {
  return `radial-gradient(circle at 0% 0%, ${a} 0%, ${b} 70%)`;
}
