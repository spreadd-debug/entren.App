import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Wallet, Trash2, Tag, CreditCard as CreditCardIcon } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { MobileHeader, Card, Fab, BottomSheet, PillChip } from '../../components/personal/ui';
import { AccountStack } from '../../components/personal/money/AccountStack';
import { CreditCardVisual } from '../../components/personal/money/CreditCardVisual';
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

type TxFormKind = 'expense' | 'income' | 'transfer';

interface TxForm {
  kind: TxFormKind;
  account_id: string;
  credit_card_id: string;        // si está seteado, la compra va a tarjeta (kind=expense)
  use_credit_card: boolean;      // toggle UI
  card_currency: string;         // moneda de la compra cuando es con tarjeta (ARS/USD)
  to_account_id: string;
  category_id: string | null;
  amount: string;
  to_amount: string;
  fx_rate: string;
  occurred_at: string;
  description: string;
}

const EMPTY_FORM: TxForm = {
  kind: 'expense',
  account_id: '',
  credit_card_id: '',
  use_credit_card: false,
  card_currency: 'ARS',
  to_account_id: '',
  category_id: null,
  amount: '',
  to_amount: '',
  fx_rate: '',
  occurred_at: new Date().toISOString().slice(0, 16),
  description: '',
};

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
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TxForm>(EMPTY_FORM);
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
      setFormOpen(true);
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

  // Form handlers
  const openForm = (kind: TxFormKind) => {
    setForm({ ...EMPTY_FORM, kind, account_id: accounts[0]?.id ?? '', to_account_id: accounts[1]?.id ?? '' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    const amount = Number(form.amount);
    if (!(amount > 0)) { alert('Ingresá un monto válido'); return; }
    if (!form.account_id) { alert('Elegí una cuenta'); return; }

    try {
      if (form.kind === 'transfer') {
        if (!form.to_account_id) { alert('Elegí cuenta destino'); return; }
        if (form.account_id === form.to_account_id) { alert('Origen y destino no pueden ser la misma'); return; }
        await PersonalTransactionsService.createTransfer({
          profile_id: profile.id,
          from_account_id: form.account_id,
          to_account_id: form.to_account_id,
          amount,
          to_amount: form.to_amount ? Number(form.to_amount) : null,
          fx_rate: form.fx_rate ? Number(form.fx_rate) : null,
          occurred_at: new Date(form.occurred_at).toISOString(),
          description: form.description || null,
        });
      } else if (form.kind === 'expense' && form.use_credit_card) {
        const card = cards.find(c => c.id === form.credit_card_id);
        if (!card) { alert('Elegí una tarjeta'); return; }
        await PersonalTransactionsService.create({
          profile_id: profile.id,
          credit_card_id: card.id,
          category_id: form.category_id,
          kind: 'expense',
          amount,
          currency: form.card_currency,
          occurred_at: new Date(form.occurred_at).toISOString(),
          description: form.description || null,
        });
      } else {
        const account = accounts.find(a => a.id === form.account_id);
        if (!account) { alert('Cuenta inexistente'); return; }
        await PersonalTransactionsService.create({
          profile_id: profile.id,
          account_id: form.account_id,
          category_id: form.category_id,
          kind: form.kind,
          amount,
          currency: account.currency,
          occurred_at: new Date(form.occurred_at).toISOString(),
          description: form.description || null,
        });
      }
      setForm(EMPTY_FORM);
      setFormOpen(false);
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

  const filteredCategories = categories.filter(c => c.kind === (form.kind === 'transfer' ? 'expense' : form.kind));

  const fromAccount = accounts.find(a => a.id === form.account_id);
  const toAccount = accounts.find(a => a.id === form.to_account_id);
  const transferCrossCurrency = form.kind === 'transfer' && fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

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
                onClick={() => openForm('expense')}
              />
              <QuickAction
                icon={<ArrowDownLeft size={16} strokeWidth={2.25} />}
                label="Ingreso"
                color="emerald"
                onClick={() => openForm('income')}
              />
              <QuickAction
                icon={<ArrowRightLeft size={16} strokeWidth={2.25} />}
                label="Transferir"
                color="blue"
                onClick={() => openForm('transfer')}
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

      {accounts.length > 0 && <Fab onClick={() => openForm('expense')} icon={<Plus size={24} strokeWidth={2} />} />}

      <BottomSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.kind === 'expense' ? 'Nuevo gasto' : form.kind === 'income' ? 'Nuevo ingreso' : 'Transferencia'}
      >
        <div className="space-y-4 mt-2">
          {/* Tabs */}
          <div className="flex gap-2">
            {(['expense', 'income', 'transfer'] as TxFormKind[]).map(k => (
              <PillChip
                key={k}
                variant={form.kind === k ? 'selected' : 'outline'}
                onClick={() => setForm({ ...form, kind: k })}
              >
                {k === 'expense' ? 'Gasto' : k === 'income' ? 'Ingreso' : 'Transferir'}
              </PillChip>
            ))}
          </div>

          {/* Toggle "con tarjeta" — solo para gastos y si hay tarjetas creadas */}
          {form.kind === 'expense' && cards.length > 0 && (
            <label className="flex items-center justify-between gap-3 px-1">
              <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                ¿Lo pagás con tarjeta de crédito?
              </span>
              <input
                type="checkbox"
                checked={form.use_credit_card}
                onChange={e => setForm({ ...form, use_credit_card: e.target.checked, credit_card_id: e.target.checked ? (form.credit_card_id || cards[0].id) : '' })}
                className="w-5 h-5 accent-[var(--color-ink)]"
              />
            </label>
          )}

          {form.kind === 'expense' && form.use_credit_card ? (
            <>
              <Field
                label="Tarjeta"
                asSelect
                value={form.credit_card_id}
                onChange={v => setForm({ ...form, credit_card_id: v })}
                options={cards.map(c => ({ value: c.id, label: c.name }))}
              />
              <div>
                <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Moneda de la compra</label>
                <div className="flex gap-1.5">
                  {['ARS', 'USD'].map(c => (
                    <PillChip
                      key={c}
                      variant={form.card_currency === c ? 'selected' : 'outline'}
                      onClick={() => setForm({ ...form, card_currency: c })}
                    >
                      {c}
                    </PillChip>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
                  Va al resumen {form.card_currency} de esta tarjeta.
                </p>
              </div>
            </>
          ) : (
            <Field
              label={form.kind === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
              asSelect
              value={form.account_id}
              onChange={v => setForm({ ...form, account_id: v })}
              options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
            />
          )}

          {form.kind === 'transfer' && (
            <Field
              label="Cuenta destino"
              asSelect
              value={form.to_account_id}
              onChange={v => setForm({ ...form, to_account_id: v })}
              options={accounts.filter(a => a.id !== form.account_id).map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
            />
          )}

          <Field label={form.kind === 'transfer' && fromAccount ? `Monto (${fromAccount.currency})` : 'Monto'} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="0" />

          {transferCrossCurrency && (
            <>
              <Field label={`Monto destino (${toAccount!.currency})`} type="number" value={form.to_amount} onChange={v => setForm({ ...form, to_amount: v })} placeholder="opcional" />
              <Field label={`Tipo de cambio (${fromAccount!.currency} → ${toAccount!.currency})`} type="number" value={form.fx_rate} onChange={v => setForm({ ...form, fx_rate: v })} placeholder={fxRate ? String(fxRate) : 'opcional'} />
              <p className="text-[11px] text-[var(--color-ink-muted)] -mt-2">
                Si dejás vacíos los 2, se usa el monto origen 1:1. Si llenás el cambio, calculamos el destino.
              </p>
            </>
          )}

          {form.kind !== 'transfer' && (
            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Categoría</label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filteredCategories.map(c => (
                  <PillChip
                    key={c.id}
                    variant={form.category_id === c.id ? 'selected' : 'outline'}
                    onClick={() => setForm({ ...form, category_id: c.id })}
                  >
                    {c.name}
                  </PillChip>
                ))}
              </div>
            </div>
          )}

          <Field label="Fecha y hora" type="datetime-local" value={form.occurred_at} onChange={v => setForm({ ...form, occurred_at: v })} />
          <Field label="Descripción" type="text" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="opcional" />

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 mt-2 rounded-full bg-[var(--color-ink)] text-white font-medium"
          >
            Guardar
          </button>
        </div>
      </BottomSheet>
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

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  asSelect?: boolean;
  options?: { value: string; label: string }[];
}

const Field: React.FC<FieldProps> = ({ label, type = 'text', value, onChange, placeholder, asSelect, options }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">{label}</span>
    {asSelect ? (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40 appearance-none"
      >
        <option value="">— elegir —</option>
        {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
      />
    )}
  </label>
);
