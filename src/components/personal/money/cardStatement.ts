import { PersonalCreditCard } from '../../../../shared/types';

// ─── Statement window resolver ──────────────────────────────────────────────
//
// Dado un día de cierre y una fecha de compra, devolvemos el período al que
// pertenece esa compra: { period_start, period_end, due_date }.
//
// Regla:
//   - Si la fecha de compra es <= closing_day del mes corriente → cae en el
//     período que cierra ESTE mes (period_end = closingDay del mes corriente).
//   - Si es > closing_day del mes corriente → cae en el período que cierra
//     el MES SIGUIENTE.
//
// El period_start es el día siguiente al cierre del período anterior.
// El due_date se calcula con el due_day del mes siguiente al period_end.

function clampDay(year: number, month: number, day: number): Date {
  // month: 0..11. Si el día no existe en el mes (ej. 31 en febrero),
  // toma el último día del mes.
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDayOfMonth));
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface StatementWindow {
  period_start: string; // YYYY-MM-DD
  period_end: string;
  due_date: string;
}

export function resolveStatementWindow(
  card: Pick<PersonalCreditCard, 'closing_day' | 'due_day'>,
  occurredAt: Date | string,
): StatementWindow {
  const occurred = typeof occurredAt === 'string' ? new Date(occurredAt) : occurredAt;
  const y = occurred.getFullYear();
  const m = occurred.getMonth();
  const d = occurred.getDate();

  // closingDay del mes corriente
  const closingThisMonth = clampDay(y, m, card.closing_day);
  let periodEnd: Date;
  if (d <= closingThisMonth.getDate()) {
    periodEnd = closingThisMonth;
  } else {
    periodEnd = clampDay(y, m + 1, card.closing_day);
  }

  // periodStart = día siguiente al cierre del período anterior
  const prevClosing = clampDay(periodEnd.getFullYear(), periodEnd.getMonth() - 1, card.closing_day);
  const periodStart = new Date(prevClosing);
  periodStart.setDate(periodStart.getDate() + 1);

  // dueDate = due_day del mes siguiente al period_end
  const dueDate = clampDay(periodEnd.getFullYear(), periodEnd.getMonth() + 1, card.due_day);

  return {
    period_start: toIsoDate(periodStart),
    period_end:   toIsoDate(periodEnd),
    due_date:     toIsoDate(dueDate),
  };
}

export function formatStatementWindow(w: StatementWindow): string {
  const start = new Date(w.period_start);
  const end = new Date(w.period_end);
  const startStr = start.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  const endStr = end.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  return `${startStr} → ${endStr}`;
}

export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// "•••• 1234" — last_4 formateado en pseudo-PAN para el visual de la card.
export function formatLast4(last4: string | null | undefined): string {
  if (!last4) return '•••• ••••';
  return `•••• ${last4.padStart(4, '0').slice(-4)}`;
}
