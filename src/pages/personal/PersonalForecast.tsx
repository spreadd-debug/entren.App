import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { MobileHeader, Card, MoneyInput } from '../../components/personal/ui';
import { HideBalanceToggle } from '../../components/personal/money/HideBalanceToggle';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useHideBalances } from '../../hooks/useHideBalances';
import {
  PersonalAccountsService,
  PersonalCardStatementsService,
  PersonalTransactionsService,
} from '../../services/PersonalTrackerService';
import { api } from '../../services/api';
import {
  PersonalAccount,
  PersonalCardStatement,
  PersonalTransaction,
} from '../../../shared/types';

function fmt(n: number): string {
  return Math.abs(Math.round(n)).toLocaleString('es-AR');
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export const PersonalForecast: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  const { mask } = useHideBalances();

  // Inputs persistentes — el user los setea una vez y se respetan mes a mes.
  // Si querés ajustar en un mes específico, simplemente los sobrescribís.
  const [expectedIncome, setExpectedIncome] = usePersistentState<string>('v1:forecast:income', '');
  const [savingsTarget, setSavingsTarget] = usePersistentState<string>('v1:forecast:savings', '');

  // Data — cacheada SWR.
  const [accounts, setAccounts] = usePersistentState<PersonalAccount[]>('v1:forecast:accounts', []);
  const [statements, setStatements] = usePersistentState<PersonalCardStatement[]>('v1:forecast:statements', []);
  const [monthTxs, setMonthTxs] = usePersistentState<PersonalTransaction[]>('v1:forecast:monthTxs', []);
  const [fxRate, setFxRate] = usePersistentState<number | null>('v1:forecast:fx', null);

  const refresh = async () => {
    if (!profile) return;
    try {
      const [accs, stmts, txs, fx] = await Promise.all([
        PersonalAccountsService.list(profile.id),
        PersonalCardStatementsService.listForProfile(profile.id),
        PersonalTransactionsService.list(profile.id, { from: startOfMonth().toISOString() }, 500),
        api.fx.getLatest(),
      ]);
      setAccounts(accs);
      setStatements(stmts);
      setMonthTxs(txs);
      const preferred = profile.preferred_fx_name ?? 'blue';
      setFxRate(fx.find(r => r.name === preferred)?.sell ?? null);
    } catch (err) {
      console.error('[forecast] load failed', err);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id]);

  const toArs = (amount: number, currency: string): number => {
    if (currency === 'ARS') return amount;
    if (currency === 'USD' && fxRate) return amount * fxRate;
    return 0;
  };

  // ── 1. Disponible hoy ──
  // Total de cuentas gastables (excluye savings). Convertido a ARS.
  const spendableNow = useMemo(() => {
    return accounts.filter(a => !a.is_savings).reduce((sum, a) => {
      return sum + toArs(Number(a.current_balance), a.currency);
    }, 0);
  }, [accounts, fxRate]);

  // ── 2. Resúmenes de tarjeta a pagar este mes ──
  // Statements con due_date dentro del mes actual y que todavía no están
  // 'paid'. Restamos paid_amount para no contar lo que ya pagaste parcialmente.
  const cardDueThisMonth = useMemo(() => {
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();
    return statements.reduce((sum, s) => {
      if (s.status === 'paid') return sum;
      const due = new Date(s.due_date + 'T00:00:00');
      if (due < monthStart || due > monthEnd) return sum;
      const remaining = Math.max(0, Number(s.total_amount) - Number(s.paid_amount));
      return sum + toArs(remaining, s.currency);
    }, 0);
  }, [statements, fxRate]);

  // ── 3. Ingresos esperados (input) ──
  const incomeExpected = Number(expectedIncome) || 0;

  // ── 4. Reserva de ahorro (input) ──
  const savingsReserve = Number(savingsTarget) || 0;

  // ── Resultado: libre para gastar discrecional ──
  // Plata que VAS a tener disponible al cierre del mes, ya restando lo que
  // querés guardar como ahorro y los compromisos conocidos.
  const projectedEndOfMonth = spendableNow + incomeExpected - cardDueThisMonth;
  const freeToSpend = projectedEndOfMonth - savingsReserve;

  // Lo gastado / ingresado del mes desde cuentas (referencia al ritmo).
  const monthCashFlow = useMemo(() => {
    let spent = 0, earned = 0;
    for (const t of monthTxs) {
      if (t.kind === 'transfer_in' || t.kind === 'transfer_out') continue;
      if (!t.account_id) continue; // sólo flow real de cash, no compras con tarjeta
      const ars = toArs(Number(t.amount), t.currency);
      if (t.kind === 'expense') spent += ars;
      else if (t.kind === 'income') earned += ars;
    }
    return { spent, earned };
  }, [monthTxs, fxRate]);

  // % del mes transcurrido (referencia visual)
  const monthProgress = useMemo(() => {
    const start = startOfMonth().getTime();
    const end = endOfMonth().getTime();
    const now = Date.now();
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  }, []);

  // ¿Vas bien? Si el % gastado del libre es menor al % del mes, sobra margen.
  const freeUsedPct = freeToSpend > 0 ? Math.min(100, (monthCashFlow.spent / freeToSpend) * 100) : 0;
  const goingFast = freeUsedPct > monthProgress + 10;

  return (
    <>
      <MobileHeader
        title="Plan del mes"
        large
        onBack={() => navigate(-1)}
        rightSlot={<HideBalanceToggle />}
      />

      <div className="px-5 pb-32">
        {/* Hero */}
        <Card tone="ink" className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.18em] opacity-60 font-semibold">
            Libre para gastar
          </p>
          <p className="font-serif text-5xl mt-1.5">
            <span className={freeToSpend >= 0 ? '' : 'text-rose-300'}>
              ${mask(fmt(freeToSpend))}
            </span>
          </p>
          <p className="text-[11px] opacity-60 mt-2">
            Hasta el {endOfMonth().toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}, después de pagar lo que debés y guardar tu reserva.
          </p>

          {freeToSpend > 0 && (
            <>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="opacity-60">Gastado del mes</span>
                  <span className="font-semibold">${mask(fmt(monthCashFlow.spent))}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${freeUsedPct}%`,
                      background: goingFast ? '#FB7185' : '#34D399',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] opacity-60 mt-1.5">
                  <span>{Math.round(freeUsedPct)}% del libre</span>
                  <span>{Math.round(monthProgress)}% del mes</span>
                </div>
                {goingFast && (
                  <p className="text-[11px] text-rose-300 mt-2">
                    ⚠️ Vas a un ritmo de gasto mayor al que aguanta tu margen libre. Aflojá un poco.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Breakdown */}
        <h3 className="font-serif text-xl text-[var(--color-ink)] mt-6 mb-2 px-1">Composición</h3>
        <div className="space-y-2 mb-6">
          <BreakdownRow
            icon={<Wallet size={16} strokeWidth={1.85} />}
            label="Disponible hoy"
            value={`$${mask(fmt(spendableNow))}`}
            tone="neutral"
          />
          <BreakdownRow
            icon={<TrendingUp size={16} strokeWidth={1.85} />}
            label="Ingresos esperados"
            value={`+$${mask(fmt(incomeExpected))}`}
            tone="positive"
          />
          <BreakdownRow
            icon={<CreditCardIcon size={16} strokeWidth={1.85} />}
            label="Resúmenes a pagar"
            value={`−$${mask(fmt(cardDueThisMonth))}`}
            tone="negative"
            sub={cardDueThisMonth > 0 ? 'Tarjetas con vencimiento este mes' : undefined}
          />
          <BreakdownRow
            icon={<PiggyBank size={16} strokeWidth={1.85} />}
            label="Reserva de ahorro"
            value={`−$${mask(fmt(savingsReserve))}`}
            tone="reserved"
          />
          <BreakdownRow
            icon={<TrendingDown size={16} strokeWidth={1.85} />}
            label="Libre para gastar"
            value={`$${mask(fmt(freeToSpend))}`}
            tone="hero"
          />
        </div>

        {/* Inputs editables */}
        <h3 className="font-serif text-xl text-[var(--color-ink)] mt-6 mb-2 px-1">Tus parámetros</h3>
        <Card padding="md" className="mb-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">
              Ingresos esperados este mes
            </span>
            <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
              <MoneyInput
                value={expectedIncome}
                onChange={setExpectedIncome}
                size="md"
                inputClassName="px-0"
                placeholder="Sueldo, freelance, etc."
              />
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
              Sumá todo lo que esperás cobrar este mes. Lo podés sobrescribir cada mes.
            </p>
          </label>
        </Card>

        <Card padding="md" className="mb-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">
              Cuánto querés guardar
            </span>
            <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
              <MoneyInput
                value={savingsTarget}
                onChange={setSavingsTarget}
                size="md"
                inputClassName="px-0"
                placeholder="0"
              />
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
              Reserva fija para ahorro este mes. Se descuenta del libre antes de mostrarte cuánto te queda.
            </p>
          </label>
        </Card>

        {/* Hint útil */}
        <p className="text-[11px] text-[var(--color-ink-muted)] mt-4 px-1 italic">
          Los pagos automáticos (gym, Netflix…) ya están contemplados: se materializan como cargos en el resumen de tu tarjeta y entran en "Resúmenes a pagar".
        </p>
      </div>
    </>
  );
};

const BreakdownRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'neutral' | 'positive' | 'negative' | 'reserved' | 'hero';
  sub?: string;
}> = ({ icon, label, value, tone, sub }) => {
  const valueColor =
    tone === 'positive' ? 'text-emerald-600' :
    tone === 'negative' ? 'text-rose-600' :
    tone === 'reserved' ? 'text-violet-600' :
    tone === 'hero'     ? 'text-[var(--color-ink)] font-semibold' :
    'text-[var(--color-ink)]';
  const iconBg =
    tone === 'positive' ? 'bg-emerald-100 text-emerald-700' :
    tone === 'negative' ? 'bg-rose-100 text-rose-700' :
    tone === 'reserved' ? 'bg-violet-100 text-violet-700' :
    tone === 'hero'     ? 'bg-[var(--color-ink)] text-white' :
    'bg-[var(--color-ink)]/8 text-[var(--color-ink)]';
  return (
    <div className={`rounded-2xl bg-white border px-3.5 py-3 flex items-center gap-3 ${tone === 'hero' ? 'border-[var(--color-ink)]/30' : 'border-[var(--color-ink)]/8'}`}>
      <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${tone === 'hero' ? 'font-semibold' : 'font-medium'} text-[var(--color-ink)]`}>{label}</p>
        {sub && <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5">{sub}</p>}
      </div>
      <p className={`font-serif text-base shrink-0 ${valueColor}`}>{value}</p>
    </div>
  );
};
