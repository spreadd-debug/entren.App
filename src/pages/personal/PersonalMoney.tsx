import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Wallet, Trash2, Tag, CreditCard as CreditCardIcon } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { MobileHeader, Card, Fab, PillChip } from '../../components/personal/ui';
import { AccountStack } from '../../components/personal/money/AccountStack';
import { CreditCardVisual } from '../../components/personal/money/CreditCardVisual';
import { TransactionWizard, WizardKind, WizardResult } from '../../components/personal/money/TransactionWizard';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import {
  PersonalAccountsService,
  PersonalCategoriesService,
  PersonalTransactionsService,
  PersonalCreditCardsService,
} from '../../services/PersonalTrackerService';
import { api } from '../../services/api';
import {
  PersonalAccount,
  PersonalCategory,
  PersonalTransaction,
  PersonalCreditCard,
} from '../../../shared/types';

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfMonthN(monthsBack: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - monthsBack, 1);
}

function fmtAmount(n: number): string {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const PersonalMoney: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = usePersonalProfile();

  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [cards, setCards] = useState<PersonalCreditCard[]>([]);
  const [categories, setCategories] = useState<PersonalCategory[]>([]);
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [fxRates, setFxRates] = useState<{ name: string; sell: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'spending' | 'earning'>('spending');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKind, setWizardKind] = useState<WizardKind>('expense');
  const [activeAccountIdx, setActiveAccountIdx] = useState(0);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [acc, ccs, cats, txs, fx] = await Promise.all([
        PersonalAccountsService.list(profile.id),
        PersonalCreditCardsService.list(profile.id),
        PersonalCategoriesService.ensureDefaults(profile.id),
        PersonalTransactionsService.list(profile.id, { from: startOfMonthN(5).toISOString() }, 500),
        api.fx.getLatest(),
      ]);
      setAccounts(acc);
      setCards(ccs);
      setCategories(cats);
      setTransactions(txs);
      setFxRates(fx);
    } catch (err) {
      console.error('[money] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setWizardKind('expense');
      setWizardOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Cotización default → conversión a ARS
  const fxRate = useMemo(() => {
    const preferred = profile?.preferred_fx_name ?? 'blue';
    return fxRates.find(r => r.name === preferred)?.sell ?? null;
  }, [fxRates, profile?.preferred_fx_name]);

  // Total combinado en ARS sumando todas las cuentas convertidas.
  const totalArs = useMemo(() => {
    return accounts.reduce((sum, a) => {
      const bal = Number(a.current_balance) || 0;
      if (a.currency === 'ARS') return sum + bal;
      if (fxRate && a.currency === 'USD') return sum + bal * fxRate;
      return sum; // si no podemos convertir, no la sumamos al total
    }, 0);
  }, [accounts, fxRate]);

  // Chart de últimos 6 meses (en ARS, convertido)
  const monthlyChart = useMemo(() => {
    const buckets: { label: string; spending: number; earning: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfMonthN(i);
      const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const label = start.toLocaleDateString('es-AR', { month: 'short' });
      let spending = 0, earning = 0;
      for (const t of transactions) {
        const tDate = new Date(t.occurred_at);
        if (tDate < start || tDate >= next) continue;
        const amount = Number(t.amount);
        const inArs = t.currency === 'ARS' ? amount : (fxRate ? amount * fxRate : amount);
        if (t.kind === 'expense') spending += inArs;
        else if (t.kind === 'income') earning += inArs;
      }
      buckets.push({ label, spending: Math.round(spending), earning: Math.round(earning) });
    }
    return buckets;
  }, [transactions, fxRate]);

  const txsThisMonth = useMemo(
    () => transactions.filter(t => new Date(t.occurred_at) >= new Date(startOfMonthIso())),
    [transactions],
  );

  const monthSpending = useMemo(
    () => txsThisMonth
      .filter(t => t.kind === 'expense')
      .reduce((s, t) => s + (t.currency === 'ARS' ? Number(t.amount) : (fxRate ? Number(t.amount) * fxRate : Number(t.amount))), 0),
    [txsThisMonth, fxRate],
  );

  const monthEarning = useMemo(
    () => txsThisMonth
      .filter(t => t.kind === 'income')
      .reduce((s, t) => s + (t.currency === 'ARS' ? Number(t.amount) : (fxRate ? Number(t.amount) * fxRate : Number(t.amount))), 0),
    [txsThisMonth, fxRate],
  );

  // Wizard handlers
  const openWizard = (kind: WizardKind) => {
    setWizardKind(kind);
    setWizardOpen(true);
  };

  const handleWizardSubmit = async (r: WizardResult) => {
    if (!profile) return;
    try {
      if (r.kind === 'transfer') {
        await PersonalTransactionsService.createTransfer({
          profile_id: profile.id,
          from_account_id: r.account_id!,
          to_account_id: r.to_account_id!,
          amount: r.amount,
          to_amount: r.to_amount ?? null,
          fx_rate: r.fx_rate ?? null,
          occurred_at: r.occurred_at,
          description: r.description || null,
        });
      } else if (r.credit_card_id) {
        await PersonalTransactionsService.create({
          profile_id: profile.id,
          credit_card_id: r.credit_card_id,
          category_id: r.category_id,
          kind: 'expense',
          amount: r.amount,
          currency: r.card_currency!,
          occurred_at: r.occurred_at,
          description: r.description,
        });
      } else {
        await PersonalTransactionsService.create({
          profile_id: profile.id,
          account_id: r.account_id!,
          category_id: r.category_id,
          kind: r.kind,
          amount: r.amount,
          currency: r.currency,
          occurred_at: r.occurred_at,
          description: r.description,
        });
      }
      setWizardOpen(false);
      refresh();
    } catch (err: any) {
      console.error('[money] create failed', err);
      alert(`No se pudo guardar: ${err?.message ?? 'Error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción? El balance de la cuenta se ajusta.')) return;
    try {
      await PersonalTransactionsService.delete(id);
      refresh();
    } catch (err) {
      console.error('[money] delete failed', err);
    }
  };

  return (
    <>
      <MobileHeader
        title="Finanzas"
        large
        onBack={() => navigate(-1)}
        rightSlot={
          <button
            type="button"
            onClick={() => navigate('/admin/personal/accounts')}
            className="px-3 h-9 rounded-full bg-white/60 hover:bg-white text-[var(--color-ink)] text-xs font-medium flex items-center gap-1.5"
          >
            <Wallet size={14} />
            Cuentas
          </button>
        }
      />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && accounts.length === 0 && (
          <Card className="mt-4" tone="tinted">
            <h3 className="font-serif text-xl text-[var(--color-ink)]">Empezá creando tus cuentas</h3>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1.5">
              Sumá las cuentas donde tenés plata: efectivo, banco, Mercado Pago, USD…
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin/personal/accounts')}
              className="mt-4 w-full py-2.5 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium"
            >
              Crear primera cuenta
            </button>
          </Card>
        )}

        {!loading && accounts.length > 0 && (
          <>
            {/* Hero: total combinado */}
            <div className="mt-2 mb-4 px-1">
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                Total · convertido a ARS ({profile?.preferred_fx_name ?? 'blue'}
                {fxRate ? ` · $${fxRate.toLocaleString('es-AR')}` : ''})
              </p>
              <p className="font-serif text-[3rem] leading-none text-[var(--color-ink)] mt-1">
                ${fmtAmount(totalArs)}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-ink-muted)]">
                <span className="flex items-center gap-1">
                  <ArrowDownLeft size={12} className="text-emerald-600" /> +{fmtAmount(monthEarning)}
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-rose-600" /> -{fmtAmount(monthSpending)}
                </span>
                <span className="opacity-60">este mes</span>
              </div>
            </div>

            {/* Account stack */}
            <AccountStack accounts={accounts} activeIndex={activeAccountIdx} onActiveChange={setActiveAccountIdx} onSelect={() => navigate('/admin/personal/accounts')} />

            {/* Tarjetas */}
            <div className="flex items-center justify-between mt-6 mb-2 px-1">
              <h3 className="font-serif text-xl text-[var(--color-ink)]">Tarjetas</h3>
              <button
                type="button"
                onClick={() => navigate('/admin/personal/cards')}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Ver todas
              </button>
            </div>
            {cards.length === 0 ? (
              <Card tone="tinted" padding="sm" onClick={() => navigate('/admin/personal/cards')}>
                <div className="flex items-center gap-3">
                  <CreditCardIcon size={16} className="text-[var(--color-ink-muted)]" />
                  <p className="text-sm text-[var(--color-ink)]">Agregar tu primera tarjeta de crédito</p>
                </div>
              </Card>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex gap-3">
                {cards.map(c => (
                  <div
                    key={c.id}
                    className="shrink-0 w-44 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => navigate(`/admin/personal/cards/${c.id}`)}
                  >
                    <CreditCardVisual card={c} variant="compact" />
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <QuickAction
                icon={<ArrowUpRight size={16} strokeWidth={2.25} />}
                label="Gasto"
                color="rose"
                onClick={() => openWizard('expense')}
              />
              <QuickAction
                icon={<ArrowDownLeft size={16} strokeWidth={2.25} />}
                label="Ingreso"
                color="emerald"
                onClick={() => openWizard('income')}
              />
              <QuickAction
                icon={<ArrowRightLeft size={16} strokeWidth={2.25} />}
                label="Transferir"
                color="blue"
                onClick={() => openWizard('transfer')}
              />
            </div>

            {/* Chart */}
            <Card className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-xl text-[var(--color-ink)]">Últimos 6 meses</h3>
                <div className="flex gap-1.5">
                  <PillChip variant={chartMode === 'spending' ? 'selected' : 'outline'} onClick={() => setChartMode('spending')}>Gastos</PillChip>
                  <PillChip variant={chartMode === 'earning' ? 'selected' : 'outline'} onClick={() => setChartMode('earning')}>Ingresos</PillChip>
                </div>
              </div>
              <div className="h-32 -mx-2">
                <ResponsiveContainer>
                  <BarChart data={monthlyChart} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
                    <Tooltip
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 8, fontSize: 11, color: 'white' }}
                      formatter={(v: any) => [`$${Number(v).toLocaleString('es-AR')}`, chartMode === 'spending' ? 'Gastos' : 'Ingresos']}
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    />
                    <Bar dataKey={chartMode} radius={[8, 8, 8, 8]}>
                      {monthlyChart.map((_, i) => (
                        <Cell key={i} fill={i === monthlyChart.length - 1
                          ? (chartMode === 'spending' ? '#F43F5E' : '#10B981')
                          : '#E5DBC6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Transactions del mes */}
            <h3 className="font-serif text-xl text-[var(--color-ink)] mt-6 mb-2 px-1">Movimientos</h3>
            <div className="space-y-2">
              {txsThisMonth.length === 0 && (
                <p className="text-center text-sm text-[var(--color-ink-muted)] py-6 italic">Sin movimientos este mes</p>
              )}
              {txsThisMonth.slice(0, 30).map(t => {
                const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;
                const card = t.credit_card_id ? cards.find(c => c.id === t.credit_card_id) : null;
                const cat = categories.find(c => c.id === t.category_id);
                const isIn = t.kind === 'income' || t.kind === 'transfer_in';
                const sign = isIn ? '+' : '−';
                const color = t.kind === 'expense' ? '#F43F5E' : t.kind === 'income' ? '#10B981' : '#3B82F6';
                const icon = card ? <CreditCardIcon size={14} /> :
                  t.kind === 'expense' ? <ArrowUpRight size={14} /> :
                  t.kind === 'income' ? <ArrowDownLeft size={14} /> :
                  <ArrowRightLeft size={14} />;
                return (
                  <Card key={t.id} padding="sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: (cat?.color ?? color) + '22', color: cat?.color ?? color }}
                      >
                        {cat ? <Tag size={15} /> : icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight truncate">
                          {t.description || cat?.name || (t.kind === 'transfer_out' ? 'Transferencia' : t.kind === 'transfer_in' ? 'Transferencia' : 'Sin descripción')}
                        </h4>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 truncate">
                          {card ? `💳 ${card.name}` : account?.name ?? '—'}
                          {cat ? ` · ${cat.name}` : ''}
                          {' · '}
                          {new Date(t.occurred_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-serif text-lg leading-none" style={{ color }}>
                          {sign} {fmtAmount(Number(t.amount))}
                        </p>
                        <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5">{t.currency}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {accounts.length > 0 && <Fab onClick={() => openWizard('expense')} icon={<Plus size={24} strokeWidth={2} />} />}

      <TransactionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        accounts={accounts}
        cards={cards}
        categories={categories}
        defaultKind={wizardKind}
        defaultFxRate={fxRate}
      />
    </>
  );
};

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; color: 'rose' | 'emerald' | 'blue'; onClick: () => void }> = ({ icon, label, color, onClick }) => {
  const ringColors = {
    rose:    'bg-rose-100 text-rose-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue:    'bg-blue-100 text-blue-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white shadow-sm active:scale-[0.98] transition-transform"
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center ${ringColors[color]}`}>
        {icon}
      </span>
      <span className="text-sm font-medium text-[var(--color-ink)]">{label}</span>
    </button>
  );
};
