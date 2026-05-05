import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2, CreditCard as CreditCardIcon, X, SlidersHorizontal } from 'lucide-react';
import { MobileHeader, Card, PillChip } from '../../components/personal/ui';
import { HideBalanceToggle } from '../../components/personal/money/HideBalanceToggle';
import { resolveCategoryIcon } from '../../components/personal/money/categoryIcons';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useHideBalances } from '../../hooks/useHideBalances';
import {
  PersonalAccountsService,
  PersonalCategoriesService,
  PersonalCreditCardsService,
  PersonalTransactionsService,
} from '../../services/PersonalTrackerService';
import { api } from '../../services/api';
import {
  PersonalAccount,
  PersonalCategory,
  PersonalCreditCard,
  PersonalTransaction,
} from '../../../shared/types';

type RangeKey = 'week' | 'month' | '90d' | 'year' | 'all';
type KindFilter = 'all' | 'expense' | 'income' | 'transfer';

const RANGE_LABELS: Record<RangeKey, string> = {
  week:  '7 días',
  month: 'Este mes',
  '90d': '90 días',
  year:  'Este año',
  all:   'Todo',
};

function rangeStart(key: RangeKey): Date {
  const d = new Date();
  if (key === 'week')  { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (key === '90d')   { d.setDate(d.getDate() - 90); d.setHours(0, 0, 0, 0); return d; }
  if (key === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (key === 'year')  return new Date(d.getFullYear(), 0, 1);
  return new Date(2000, 0, 1); // 'all'
}

function fmtAmount(n: number): string {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const PersonalMovements: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  const { mask } = useHideBalances();

  // Filtros persistentes — la próxima vez que abrís quedan donde los dejaste.
  const [range, setRange]       = usePersistentState<RangeKey>('v1:movs:range', 'month');
  const [kind, setKind]         = usePersistentState<KindFilter>('v1:movs:kind', 'all');
  const [catFilter, setCatFilter] = usePersistentState<string[]>('v1:movs:cats', []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Data — cacheada para render instantáneo SWR.
  const [transactions, setTransactions] = usePersistentState<PersonalTransaction[]>('v1:movs:txs', []);
  const [accounts, setAccounts]   = usePersistentState<PersonalAccount[]>('v1:movs:accounts', []);
  const [cards, setCards]         = usePersistentState<PersonalCreditCard[]>('v1:movs:cards', []);
  const [categories, setCategories] = usePersistentState<PersonalCategory[]>('v1:movs:categories', []);
  const [fxRate, setFxRate]       = usePersistentState<number | null>('v1:movs:fx', null);

  const refresh = async () => {
    if (!profile) return;
    try {
      const [txs, accs, ccs, cats, fx] = await Promise.all([
        PersonalTransactionsService.list(profile.id, {}, 1000),
        PersonalAccountsService.list(profile.id),
        PersonalCreditCardsService.list(profile.id),
        PersonalCategoriesService.list(profile.id),
        api.fx.getLatest(),
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCards(ccs);
      setCategories(cats);
      const preferred = profile.preferred_fx_name ?? 'blue';
      setFxRate(fx.find(r => r.name === preferred)?.sell ?? null);
    } catch (err) {
      console.error('[movements] load failed', err);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id]);

  // Convierte un monto a ARS usando la rate. Si no podemos, devuelve 0 — no se
  // suma al total. Las txs del usuario son ARS o USD principalmente.
  const toArs = (amount: number, currency: string): number => {
    if (currency === 'ARS') return amount;
    if (currency === 'USD' && fxRate) return amount * fxRate;
    return 0;
  };

  const fromDate = useMemo(() => rangeStart(range), [range]);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // Filtros aplicados en orden: rango → no-futuras → kind → categorías
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const dt = new Date(t.occurred_at);
      if (dt < fromDate || dt > todayEnd) return false;
      if (kind === 'expense'  && t.kind !== 'expense') return false;
      if (kind === 'income'   && t.kind !== 'income')  return false;
      if (kind === 'transfer' && t.kind !== 'transfer_in' && t.kind !== 'transfer_out') return false;
      if (catFilter.length > 0) {
        if (!t.category_id || !catFilter.includes(t.category_id)) return false;
      }
      return true;
    });
  }, [transactions, fromDate, todayEnd, kind, catFilter]);

  // Métricas en ARS — egresos y ingresos sumados aparte para mostrar net.
  // Las transferencias internas no cuentan como ingreso/egreso (son saldo
  // que se mueve entre cuentas tuyas).
  const metrics = useMemo(() => {
    let expense = 0, income = 0, txCount = 0, biggestExpense = 0;
    for (const t of filtered) {
      if (t.kind === 'transfer_in' || t.kind === 'transfer_out') continue;
      txCount++;
      const ars = toArs(Number(t.amount), t.currency);
      if (t.kind === 'expense') {
        expense += ars;
        if (ars > biggestExpense) biggestExpense = ars;
      } else if (t.kind === 'income') {
        income += ars;
      }
    }
    const days = Math.max(1, Math.round((todayEnd.getTime() - fromDate.getTime()) / 86_400_000));
    return {
      expense, income, net: income - expense,
      txCount, biggestExpense,
      avgPerDay: expense / days,
    };
  }, [filtered, fromDate, todayEnd, fxRate]);

  // Breakdown por categoría — sólo de gastos (lo más útil para entender en qué
  // se va la plata). Ordenado desc.
  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of filtered) {
      if (t.kind !== 'expense') continue;
      const key = t.category_id || '__none__';
      totals.set(key, (totals.get(key) ?? 0) + toArs(Number(t.amount), t.currency));
    }
    const arr = Array.from(totals.entries()).map(([catId, total]) => ({
      catId,
      category: catId === '__none__' ? null : categories.find(c => c.id === catId) ?? null,
      total,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [filtered, categories, fxRate]);

  const expenseCategories = useMemo(() => categories.filter(c => c.kind === 'expense'), [categories]);

  const handleDelete = async (id: string, groupId?: string | null, total?: number | null) => {
    const msg = groupId && total
      ? `Esta es 1 de ${total} cuotas de la misma compra. Si confirmás se borran TODAS las cuotas. ¿Continuar?`
      : '¿Eliminar esta transacción? El balance de la cuenta se ajusta.';
    if (!confirm(msg)) return;
    try {
      await PersonalTransactionsService.delete(id);
      await refresh();
    } catch (err) {
      console.error('[movements] delete failed', err);
    }
  };

  const toggleCat = (id: string) => {
    setCatFilter(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const activeFilterCount = (kind === 'all' ? 0 : 1) + catFilter.length;

  return (
    <>
      <MobileHeader
        title="Movimientos"
        large
        onBack={() => navigate(-1)}
        rightSlot={
          <div className="flex items-center gap-1">
            <HideBalanceToggle />
          </div>
        }
      />

      <div className="px-5 pb-32">
        {/* Range chips */}
        <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => (
            <PillChip key={k} variant={range === k ? 'selected' : 'outline'} onClick={() => setRange(k)}>
              {RANGE_LABELS[k]}
            </PillChip>
          ))}
        </div>

        {/* Hero — net del período */}
        <Card tone="ink" className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] opacity-60 font-semibold">Neto · {RANGE_LABELS[range]}</p>
          <p className="font-serif text-4xl mt-1.5">
            <span className={metrics.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {metrics.net >= 0 ? '+' : '−'}${mask(fmtAmount(metrics.net))}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Ingresos</p>
              <p className="font-serif text-xl mt-0.5 text-emerald-300">+${mask(fmtAmount(metrics.income))}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Egresos</p>
              <p className="font-serif text-xl mt-0.5 text-rose-300">−${mask(fmtAmount(metrics.expense))}</p>
            </div>
          </div>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Card padding="sm">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Movs</p>
            <p className="font-serif text-xl text-[var(--color-ink)] mt-0.5">{metrics.txCount}</p>
          </Card>
          <Card padding="sm">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Por día</p>
            <p className="font-serif text-xl text-[var(--color-ink)] mt-0.5">${mask(fmtAmount(Math.round(metrics.avgPerDay)))}</p>
          </Card>
          <Card padding="sm">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Mayor</p>
            <p className="font-serif text-xl text-[var(--color-ink)] mt-0.5">${mask(fmtAmount(Math.round(metrics.biggestExpense)))}</p>
          </Card>
        </div>

        {/* Por categoría */}
        {byCategory.length > 0 && (
          <>
            <h3 className="font-serif text-xl text-[var(--color-ink)] mb-2 px-1">Por categoría</h3>
            <div className="space-y-1.5 mb-5">
              {byCategory.slice(0, 12).map(({ catId, category, total }) => {
                const pct = metrics.expense > 0 ? (total / metrics.expense) * 100 : 0;
                const Icon = category ? resolveCategoryIcon(category.icon) : resolveCategoryIcon('Tag');
                const color = category?.color ?? '#94A3B8';
                return (
                  <div key={catId} className="rounded-2xl bg-white border border-[var(--color-ink)]/8 px-3 py-2.5 relative overflow-hidden">
                    {/* Mini barra de fondo proporcional al % */}
                    <div
                      className="absolute inset-y-0 left-0 pointer-events-none"
                      style={{ width: `${Math.min(100, pct)}%`, background: color + '12' }}
                    />
                    <div className="relative flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: color + '22', color }}
                      >
                        <Icon size={16} strokeWidth={1.85} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                          {category?.name ?? 'Sin categoría'}
                        </p>
                        <p className="text-[10px] text-[var(--color-ink-muted)]">{pct.toFixed(0)}% del total</p>
                      </div>
                      <p className="font-serif text-base text-[var(--color-ink)] shrink-0">
                        ${mask(fmtAmount(Math.round(total)))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Lista de movimientos con filtros adicionales */}
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-serif text-xl text-[var(--color-ink)]">Movimientos</h3>
          <button
            type="button"
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-[var(--color-ink)] text-white'
                : 'bg-white border border-[var(--color-ink)]/15 text-[var(--color-ink)]'
            }`}
          >
            <SlidersHorizontal size={12} />
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {filtersOpen && (
          <Card tone="tinted" className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-1.5">Tipo</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(['all', 'expense', 'income', 'transfer'] as KindFilter[]).map(k => (
                <PillChip key={k} variant={kind === k ? 'selected' : 'outline'} onClick={() => setKind(k)}>
                  {k === 'all' ? 'Todo' : k === 'expense' ? 'Egresos' : k === 'income' ? 'Ingresos' : 'Transferencias'}
                </PillChip>
              ))}
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Categorías</p>
              {catFilter.length > 0 && (
                <button type="button" onClick={() => setCatFilter([])} className="text-[10px] text-[var(--color-ink-muted)] hover:text-rose-600 flex items-center gap-1">
                  <X size={10} /> Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expenseCategories.map(c => (
                <PillChip key={c.id} variant={catFilter.includes(c.id) ? 'selected' : 'outline'} onClick={() => toggleCat(c.id)}>
                  {c.name}
                </PillChip>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-[var(--color-ink-muted)] py-8 italic">
              Sin movimientos con estos filtros
            </p>
          )}
          {filtered.map(t => {
            const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;
            const card = t.credit_card_id ? cards.find(c => c.id === t.credit_card_id) : null;
            const cat = categories.find(c => c.id === t.category_id);
            const isIn = t.kind === 'income' || t.kind === 'transfer_in';
            const sign = isIn ? '+' : '−';
            const baseColor = t.kind === 'expense' ? '#F43F5E' : t.kind === 'income' ? '#10B981' : '#3B82F6';
            const accent = cat?.color ?? baseColor;
            const CatIcon = cat ? resolveCategoryIcon(cat.icon) : null;
            const fallbackIcon = card ? <CreditCardIcon size={15} /> :
              t.kind === 'expense' ? <ArrowUpRight size={15} /> :
              t.kind === 'income' ? <ArrowDownLeft size={15} /> :
              <ArrowRightLeft size={15} />;
            return (
              <Card key={t.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: accent + '22', color: accent }}
                  >
                    {CatIcon ? <CatIcon size={16} strokeWidth={1.85} /> : fallbackIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight truncate">
                      {t.description || cat?.name || (t.kind === 'transfer_in' || t.kind === 'transfer_out' ? 'Transferencia' : 'Sin descripción')}
                    </h4>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 truncate">
                      {(card?.name ?? account?.name ?? '—')} · {new Date(t.occurred_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      {cat && ` · ${cat.name}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-base leading-none" style={{ color: baseColor }}>
                      {sign} {mask(fmtAmount(Number(t.amount)))}
                    </p>
                    <p className="text-[9px] text-[var(--color-ink-muted)] mt-0.5">{t.currency}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id, t.installment_group_id, t.installment_total)}
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
      </div>
    </>
  );
};
