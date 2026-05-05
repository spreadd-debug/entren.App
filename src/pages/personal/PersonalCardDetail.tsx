import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, CreditCard as CreditCardIcon, CheckCircle, Clock, Repeat, Plus, Power } from 'lucide-react';
import { MobileHeader, Card, BottomSheet, PillChip, MoneyInput } from '../../components/personal/ui';
import { CreditCardVisual } from '../../components/personal/money/CreditCardVisual';
import { resolveStatementWindow, formatDueDate } from '../../components/personal/money/cardStatement';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { usePersistentState } from '../../hooks/usePersistentState';
import {
  PersonalCreditCardsService,
  PersonalCardStatementsService,
  PersonalAccountsService,
  PersonalTransactionsService,
  PersonalCardSubscriptionsService,
  PersonalCategoriesService,
} from '../../services/PersonalTrackerService';
import { resolveCategoryIcon } from '../../components/personal/money/categoryIcons';
import {
  PersonalCreditCard,
  PersonalCardStatement,
  PersonalAccount,
  PersonalTransaction,
  PersonalCardSubscription,
  PersonalCategory,
} from '../../../shared/types';

type Tab = 'current' | 'next' | 'history';

interface PayForm {
  account_id: string;
  amount: string;
}

function fmt(n: number): string {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function currencySymbol(currency: string): string {
  if (currency === 'USD') return 'US$';
  if (currency === 'EUR') return '€';
  return '$';
}

const STATUS_LABELS: Record<string, string> = {
  open:    'Abierto',
  closed:  'Cerrado · pendiente de pago',
  partial: 'Pagado parcialmente',
  paid:    'Pagado',
};

export const PersonalCardDetail: React.FC = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  // Cache por tarjeta — la key incluye el cardId para no mezclar entre tarjetas.
  const cacheKey = (suffix: string) => `v1:card:${cardId ?? 'unknown'}:${suffix}`;
  const [card, setCard, cardCached] = usePersistentState<PersonalCreditCard | null>(cacheKey('card'), null);
  const [statements, setStatements, stmtsCached] = usePersistentState<PersonalCardStatement[]>(cacheKey('statements'), []);
  const [accounts, setAccounts] = usePersistentState<PersonalAccount[]>('v1:money:accounts', []);
  const [txs, setTxs, txsCached] = usePersistentState<PersonalTransaction[]>(cacheKey('txs'), []);
  const hasAnyCache = cardCached || stmtsCached || txsCached;
  const [loading, setLoading] = useState(!hasAnyCache);
  const [tab, setTab] = useState<Tab>('current');
  const [activeCurrency, setActiveCurrency] = useState<string>('ARS');
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<PayForm>({ account_id: '', amount: '' });
  const [selectedStatement, setSelectedStatement] = useState<PersonalCardStatement | null>(null);
  // Locks anti-doble-tap para los CTAs async — sin esto, dos taps rápidos
  // disparan el submit dos veces y se duplican txs / subs.
  const [savingSub, setSavingSub] = useState(false);
  const [paying, setPaying] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PersonalCardSubscription[]>([]);
  const [categories, setCategories] = useState<PersonalCategory[]>([]);
  const [subOpen, setSubOpen] = useState(false);
  const [subEditing, setSubEditing] = useState<PersonalCardSubscription | null>(null);
  const [subForm, setSubForm] = useState({
    description: '',
    amount: '',
    currency: 'ARS',
    day_of_month: '1',
    category_id: '' as string | '',
  });

  const refresh = async () => {
    if (!profile || !cardId) return;
    if (!hasAnyCache) setLoading(true);
    try {
      // Materializa subs vencidas antes de pedir statements/txs (lazy cron).
      try { await PersonalCardSubscriptionsService.materializeDue(profile.id); }
      catch (err) { console.warn('[card detail] materialize subs failed', err); }

      const [c, sts, accs, subs, cats] = await Promise.all([
        PersonalCreditCardsService.getById(cardId),
        PersonalCardStatementsService.listByCard(cardId, 48),
        PersonalAccountsService.list(profile.id),
        PersonalCardSubscriptionsService.list(profile.id, cardId),
        PersonalCategoriesService.list(profile.id),
      ]);
      setCard(c);
      setStatements(sts);
      setAccounts(accs);
      setSubscriptions(subs);
      setCategories(cats);
      const allTxs = await PersonalTransactionsService.list(profile.id, {}, 1000);
      setTxs(allTxs.filter(t => t.credit_card_id === cardId));
    } catch (err) {
      console.error('[card detail] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id, cardId]);

  const openSubModal = (sub: PersonalCardSubscription | null) => {
    setSubEditing(sub);
    if (sub) {
      setSubForm({
        description: sub.description,
        amount: String(sub.amount),
        currency: sub.currency,
        day_of_month: String(sub.day_of_month),
        category_id: sub.category_id ?? '',
      });
    } else {
      setSubForm({ description: '', amount: '', currency: 'ARS', day_of_month: '1', category_id: '' });
    }
    setSubOpen(true);
  };

  const handleSaveSub = async () => {
    if (!profile || !card) return;
    if (savingSub) return; // anti-doble-tap
    const amount = Number(subForm.amount);
    const day = Number(subForm.day_of_month);
    if (!subForm.description.trim()) { alert('Poné una descripción'); return; }
    if (!(amount > 0)) { alert('Monto inválido'); return; }
    if (!(day >= 1 && day <= 28)) { alert('Día entre 1 y 28'); return; }
    setSavingSub(true);
    try {
      if (subEditing) {
        await PersonalCardSubscriptionsService.update(subEditing.id, {
          description: subForm.description.trim(),
          amount,
          currency: subForm.currency,
          day_of_month: day,
          category_id: subForm.category_id || null,
        });
      } else {
        await PersonalCardSubscriptionsService.create({
          profile_id: profile.id,
          credit_card_id: card.id,
          description: subForm.description.trim(),
          amount,
          currency: subForm.currency,
          day_of_month: day,
          category_id: subForm.category_id || null,
        });
      }
      setSubOpen(false);
      setSubEditing(null);
      await refresh();
    } catch (err: any) {
      console.error('[card detail] save sub failed', err);
      alert(`No se pudo guardar: ${err?.message ?? 'Error'}`);
    } finally {
      setSavingSub(false);
    }
  };

  const handleToggleSub = async (sub: PersonalCardSubscription) => {
    try {
      await PersonalCardSubscriptionsService.update(sub.id, { active: !sub.active });
      refresh();
    } catch (err) {
      console.error('[card detail] toggle sub failed', err);
    }
  };

  const handleDeleteSub = async (sub: PersonalCardSubscription) => {
    if (!confirm(`¿Eliminar el débito automático "${sub.description}"? Las transacciones ya cargadas no se borran.`)) return;
    try {
      await PersonalCardSubscriptionsService.delete(sub.id);
      refresh();
    } catch (err) {
      console.error('[card detail] delete sub failed', err);
    }
  };

  // Currencies activas: las que tienen al menos un statement.
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>(['ARS']); // ARS siempre visible aunque esté vacío
    statements.forEach(s => set.add(s.currency));
    return Array.from(set);
  }, [statements]);

  // Cuando cambian las currencies disponibles, ajustar la activa.
  useEffect(() => {
    if (!availableCurrencies.includes(activeCurrency)) {
      setActiveCurrency(availableCurrencies[0] ?? 'ARS');
    }
  }, [availableCurrencies, activeCurrency]);

  // Statement actual = el que abarca hoy en la moneda activa.
  const currentStatement = useMemo<PersonalCardStatement | null>(() => {
    if (!card) return null;
    const today = new Date();
    const win = resolveStatementWindow(card, today);
    return statements.find(s => s.period_end === win.period_end && s.currency === activeCurrency) ?? null;
  }, [card, statements, activeCurrency]);

  // Próximo statement = el período siguiente al actual, en la moneda activa.
  const nextStatement = useMemo<PersonalCardStatement | null>(() => {
    if (!card) return null;
    const today = new Date();
    const winNow = resolveStatementWindow(card, today);
    const nextRefDate = new Date(winNow.period_end);
    nextRefDate.setDate(nextRefDate.getDate() + 1);
    const winNext = resolveStatementWindow(card, nextRefDate);
    return statements.find(s => s.period_end === winNext.period_end && s.currency === activeCurrency) ?? null;
  }, [card, statements, activeCurrency]);

  // Statements pendientes de pago (cualquier moneda — se muestran arriba).
  const closedPending = useMemo(
    () => statements.filter(s => s.status === 'closed' || s.status === 'partial'),
    [statements],
  );

  // Hist hist por moneda activa
  const historyForCurrency = useMemo(
    () => statements.filter(s => s.currency === activeCurrency),
    [statements, activeCurrency],
  );

  const txsForStatement = (s: PersonalCardStatement | null) => {
    if (!s) return [];
    return txs.filter(t => t.statement_id === s.id);
  };

  const openPay = (s: PersonalCardStatement) => {
    if (!card) return;
    const remaining = Number(s.total_amount) - Number(s.paid_amount);
    // Pre-elegir cuenta: si la default coincide en moneda con el statement, usarla.
    const defaultAcc = accounts.find(a => a.id === card.pay_from_account_id);
    const matchingAcc = accounts.find(a => a.currency === s.currency);
    setPayForm({
      account_id: (defaultAcc?.currency === s.currency ? defaultAcc.id : matchingAcc?.id) ?? accounts[0]?.id ?? '',
      amount: String(remaining > 0 ? remaining.toFixed(2) : ''),
    });
    setSelectedStatement(s);
    setPayOpen(true);
  };

  const handlePay = async () => {
    if (!profile || !selectedStatement) return;
    if (paying) return; // anti-doble-tap
    const amount = Number(payForm.amount);
    if (!(amount > 0)) { alert('Monto inválido'); return; }
    if (!payForm.account_id) { alert('Elegí cuenta'); return; }
    setPaying(true);
    try {
      await PersonalCardStatementsService.pay({
        profile_id: profile.id,
        statement_id: selectedStatement.id,
        from_account_id: payForm.account_id,
        amount,
      });
      setPayOpen(false);
      setSelectedStatement(null);
      await refresh();
    } catch (err: any) {
      console.error('[card detail] pay failed', err);
      alert(`No se pudo pagar: ${err?.message ?? 'Error'}`);
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteTx = async (id: string, groupId?: string | null, total?: number | null) => {
    const msg = groupId && total
      ? `Esta es 1 de ${total} cuotas de la misma compra. Si confirmás se borran TODAS las cuotas y se descuentan de los resúmenes correspondientes. ¿Continuar?`
      : '¿Eliminar esta transacción? Se ajusta el statement.';
    if (!confirm(msg)) return;
    try {
      await PersonalTransactionsService.delete(id);
      refresh();
    } catch (err) {
      console.error('[card detail] delete tx failed', err);
    }
  };

  const holderName = profile?.display_name || null;

  const stmtForTab = tab === 'current' ? currentStatement : tab === 'next' ? nextStatement : null;
  const stmtTxs = txsForStatement(stmtForTab);
  const sym = currencySymbol(activeCurrency);

  return (
    <>
      <MobileHeader title={card?.name ?? 'Tarjeta'} onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && card && (
          <>
            <CreditCardVisual card={card} holderName={holderName} variant="hero" badge={availableCurrencies.length > 1 ? activeCurrency : null} />

            {/* Switcher de moneda — solo si hay más de 1 currency con statements */}
            {availableCurrencies.length > 1 && (
              <div className="flex items-center gap-1.5 mt-4">
                {availableCurrencies.map(c => (
                  <PillChip
                    key={c}
                    variant={activeCurrency === c ? 'selected' : 'outline'}
                    onClick={() => setActiveCurrency(c)}
                  >
                    Resumen {c}
                  </PillChip>
                ))}
              </div>
            )}

            {/* Resumen current de la moneda activa */}
            <Card className="mt-3" tone="ink">
              <p className="text-xs uppercase tracking-wider opacity-60">
                Resumen actual {availableCurrencies.length > 1 ? `(${activeCurrency})` : ''}
              </p>
              <p className="font-serif text-4xl mt-1">
                <span className="opacity-70 text-base mr-1">{sym}</span>
                {fmt(Number(currentStatement?.total_amount ?? 0))}
              </p>
              {currentStatement && (
                <p className="text-xs opacity-70 mt-2">
                  Cierra el {formatDueDate(currentStatement.period_end)} · vence el {formatDueDate(currentStatement.due_date)}
                </p>
              )}
              {!currentStatement && (
                <p className="text-xs opacity-70 mt-2 italic">Sin compras este período en {activeCurrency}.</p>
              )}
            </Card>

            {/* Statements pendientes de pago — TODAS las monedas */}
            {closedPending.length > 0 && (
              <div className="mt-3 space-y-2">
                {closedPending.map(s => {
                  const remaining = Number(s.total_amount) - Number(s.paid_amount);
                  const stmtSym = currencySymbol(s.currency);
                  return (
                    <Card key={s.id} tone="tinted">
                      <div className="flex items-center gap-3">
                        <Clock size={18} className="text-amber-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-base text-[var(--color-ink)] leading-tight">
                            {stmtSym} {fmt(remaining)} a pagar
                            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold ml-2">{s.currency}</span>
                          </p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                            Vence el {formatDueDate(s.due_date)}
                            {s.status === 'partial' && ` · pagado parcial ${stmtSym} ${fmt(Number(s.paid_amount))}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPay(s)}
                          className="px-4 py-2 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium shrink-0"
                        >
                          Pagar
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 mt-6 mb-3">
              <PillChip variant={tab === 'current' ? 'selected' : 'outline'} onClick={() => setTab('current')}>Actual</PillChip>
              <PillChip variant={tab === 'next' ? 'selected' : 'outline'} onClick={() => setTab('next')}>Próximo</PillChip>
              <PillChip variant={tab === 'history' ? 'selected' : 'outline'} onClick={() => setTab('history')}>Histórico</PillChip>
            </div>

            {tab !== 'history' && (
              <>
                {!stmtForTab && (
                  <p className="text-center text-sm text-[var(--color-ink-muted)] py-6 italic">
                    Sin resumen {tab === 'current' ? 'actual' : 'próximo'} en {activeCurrency}
                  </p>
                )}
                {stmtForTab && stmtTxs.length === 0 && (
                  <p className="text-center text-sm text-[var(--color-ink-muted)] py-6 italic">
                    Sin movimientos en este resumen
                  </p>
                )}
                <div className="space-y-2">
                  {stmtTxs.map(t => {
                    const cat = categories.find(c => c.id === t.category_id);
                    const CatIcon = cat ? resolveCategoryIcon(cat.icon) : null;
                    const accent = cat?.color ?? '#F43F5E';
                    return (
                    <Card key={t.id} padding="sm">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ background: accent + '22', color: accent }}
                        >
                          {CatIcon ? <CatIcon size={16} strokeWidth={1.85} /> : <CreditCardIcon size={15} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight truncate">
                            {t.description || 'Compra'}
                          </h4>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                            {new Date(t.occurred_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <p className="font-serif text-lg text-rose-600 shrink-0">
                          − {currencySymbol(t.currency)} {fmt(Number(t.amount))}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteTx(t.id, t.installment_group_id, t.installment_total)}
                          className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600 shrink-0"
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

            {tab === 'history' && (
              <div className="space-y-2">
                {historyForCurrency.length === 0 && (
                  <p className="text-center text-sm text-[var(--color-ink-muted)] py-6 italic">Sin resúmenes históricos en {activeCurrency}</p>
                )}
                {historyForCurrency.map(s => (
                  <Card key={s.id} padding="sm">
                    <div className="flex items-center gap-3">
                      {s.status === 'paid' ? (
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Clock size={18} className="text-[var(--color-ink-muted)] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-base text-[var(--color-ink)] leading-tight">
                          {new Date(s.period_end).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                          {STATUS_LABELS[s.status]} · venció {formatDueDate(s.due_date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-serif text-base text-[var(--color-ink)]">{sym} {fmt(Number(s.total_amount))}</p>
                        {s.paid_amount > 0 && s.status !== 'paid' && (
                          <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5">
                            pagado {sym} {fmt(Number(s.paid_amount))}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagos automáticos — siempre visible, debajo de los tabs */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <Repeat size={14} className="text-[var(--color-ink-muted)]" />
                  <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Pagos automáticos</p>
                </div>
                <button
                  type="button"
                  onClick={() => openSubModal(null)}
                  className="w-7 h-7 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Agregar débito"
                >
                  <Plus size={14} />
                </button>
              </div>

              {subscriptions.length === 0 && (
                <Card tone="tinted">
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    Cargá tus débitos recurrentes (gym, Netflix, servicios). Cada mes se suman solos al resumen el día que vos elijas.
                  </p>
                </Card>
              )}

              <div className="space-y-2">
                {subscriptions.map(sub => (
                  <Card key={sub.id} padding="sm">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleSub(sub)}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                          sub.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--color-ink)]/5 text-[var(--color-ink-muted)]'
                        }`}
                        aria-label={sub.active ? 'Pausar' : 'Reanudar'}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openSubModal(sub)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight truncate">
                          {sub.description}
                        </h4>
                        <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                          Día {sub.day_of_month} · {sub.active ? 'Activo' : 'Pausado'}
                          {sub.last_charged_period && ` · cobrado ${sub.last_charged_period}`}
                        </p>
                      </button>
                      <p className="font-serif text-base text-[var(--color-ink)] shrink-0">
                        {currencySymbol(sub.currency)} {fmt(Number(sub.amount))}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteSub(sub)}
                        className="p-1 text-[var(--color-ink-muted)] hover:text-rose-600 shrink-0"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomSheet
        open={payOpen}
        onClose={() => { setPayOpen(false); setSelectedStatement(null); }}
        title="Pagar resumen"
      >
        {selectedStatement && (
          <div className="space-y-4 mt-2">
            <div className="text-sm text-[var(--color-ink-muted)]">
              Total ({selectedStatement.currency}): <span className="font-semibold text-[var(--color-ink)]">{currencySymbol(selectedStatement.currency)} {fmt(Number(selectedStatement.total_amount))}</span>
              {selectedStatement.paid_amount > 0 && (
                <> · ya pagado <span className="font-semibold text-[var(--color-ink)]">{currencySymbol(selectedStatement.currency)} {fmt(Number(selectedStatement.paid_amount))}</span></>
              )}
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Cuenta que paga</span>
              <select
                value={payForm.account_id}
                onChange={e => setPayForm({ ...payForm, account_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10"
              >
                <option value="">— elegir —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency} {fmt(Number(a.current_balance))})</option>)}
              </select>
              {payForm.account_id && (() => {
                const acc = accounts.find(a => a.id === payForm.account_id);
                if (!acc) return null;
                if (acc.currency !== selectedStatement.currency) {
                  return (
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      ⚠ La cuenta es {acc.currency} y el resumen es {selectedStatement.currency}. Ingresá el monto que sale de la cuenta — el resumen se reduce por el mismo número.
                    </p>
                  );
                }
                return null;
              })()}
            </label>
            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Monto a pagar</label>
              <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
                <MoneyInput
                  value={payForm.amount}
                  onChange={v => setPayForm({ ...payForm, amount: v })}
                  currency={selectedStatement.currency}
                  size="md"
                  inputClassName="px-0"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3 mt-2 rounded-full bg-[var(--color-ink)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paying ? 'Procesando…' : 'Confirmar pago'}
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={subOpen}
        onClose={() => { setSubOpen(false); setSubEditing(null); }}
        title={subEditing ? 'Editar débito automático' : 'Nuevo débito automático'}
      >
        <div className="space-y-4 mt-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Descripción</span>
            <input
              type="text"
              value={subForm.description}
              onChange={e => setSubForm({ ...subForm, description: e.target.value })}
              placeholder="Gym Atalaya, Netflix, Spotify…"
              className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Monto</span>
              <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
                <MoneyInput
                  value={subForm.amount}
                  onChange={v => setSubForm({ ...subForm, amount: v })}
                  size="md"
                  inputClassName="px-0"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Moneda</span>
              <div className="flex gap-2">
                {['ARS', 'USD'].map(c => (
                  <PillChip
                    key={c}
                    variant={subForm.currency === c ? 'selected' : 'outline'}
                    onClick={() => setSubForm({ ...subForm, currency: c })}
                  >
                    {c}
                  </PillChip>
                ))}
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Día del mes (1–28)</span>
            <input
              type="number"
              min={1}
              max={28}
              value={subForm.day_of_month}
              onChange={e => setSubForm({ ...subForm, day_of_month: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40 tabular-nums"
            />
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
              Ese día de cada mes se carga al resumen automáticamente.
            </p>
          </label>

          {categories.filter(c => c.kind === 'expense').length > 0 && (
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Categoría (opcional)</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.filter(c => c.kind === 'expense').map(c => (
                  <PillChip
                    key={c.id}
                    variant={subForm.category_id === c.id ? 'selected' : 'outline'}
                    onClick={() => setSubForm({ ...subForm, category_id: subForm.category_id === c.id ? '' : c.id })}
                  >
                    {c.name}
                  </PillChip>
                ))}
              </div>
            </label>
          )}

          <button
            type="button"
            onClick={handleSaveSub}
            disabled={savingSub}
            className="w-full py-3 mt-2 rounded-full bg-[var(--color-ink)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingSub ? 'Guardando…' : (subEditing ? 'Guardar cambios' : 'Crear débito automático')}
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
