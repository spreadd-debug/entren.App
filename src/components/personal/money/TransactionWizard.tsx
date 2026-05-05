import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Wallet, CreditCard as CreditCardIcon, Check, X } from 'lucide-react';
import { MoneyInput, PillChip } from '../ui';
import { AccountCard } from './AccountCard';
import { CreditCardVisual } from './CreditCardVisual';
import {
  PersonalAccount,
  PersonalCategory,
  PersonalCreditCard,
} from '../../../../shared/types';

export type WizardKind = 'expense' | 'income' | 'transfer';

export interface WizardResult {
  kind: WizardKind;
  amount: number;
  currency: string;
  // expense/income con cuenta
  account_id?: string;
  // expense con tarjeta
  credit_card_id?: string;
  card_currency?: string;
  // cuotas (sólo válido cuando credit_card_id está seteado y total >= 2)
  installment_total?: number | null;
  installment_current?: number | null;
  // débito automático recurrente: se crea la sub + la primera tx del mes.
  recurring_enabled?: boolean;
  recurring_day?: number;
  // transferencia
  to_account_id?: string;
  to_amount?: number | null;
  fx_rate?: number | null;
  // shared
  category_id?: string | null;
  occurred_at: string;
  description?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: WizardResult) => Promise<void>;
  accounts: PersonalAccount[];
  cards: PersonalCreditCard[];
  categories: PersonalCategory[];
  defaultKind?: WizardKind;
  defaultFxRate?: number | null;
}

type Step = 1 | 2 | 3;

interface State {
  kind: WizardKind;
  amount: string;          // raw string (digits only or with decimal point)
  // origen: solo uno de estos seteado al final
  account_id: string;
  credit_card_id: string;
  card_currency: string;   // ARS/USD para compras con tarjeta
  // cuotas
  installment_enabled: boolean;
  installment_total: number;     // 2..N
  installment_current: number;   // 1..installment_total
  // recurrente — excluyente con cuotas
  recurring_enabled: boolean;
  recurring_day: number;         // 1..28
  // transferencia
  to_account_id: string;
  to_amount: string;
  fx_rate: string;
  // detalle
  category_id: string | null;
  description: string;
  occurred_at: string;
}

function todayLocalIso(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

const EMPTY_STATE: State = {
  kind: 'expense',
  amount: '',
  account_id: '',
  credit_card_id: '',
  card_currency: 'ARS',
  installment_enabled: false,
  installment_total: 6,
  installment_current: 1,
  recurring_enabled: false,
  recurring_day: new Date().getDate() > 28 ? 28 : new Date().getDate(),
  to_account_id: '',
  to_amount: '',
  fx_rate: '',
  category_id: null,
  description: '',
  occurred_at: todayLocalIso(),
};

export const TransactionWizard: React.FC<Props> = ({
  open, onClose, onSubmit,
  accounts, cards, categories,
  defaultKind = 'expense',
  defaultFxRate,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [state, setState] = useState<State>({ ...EMPTY_STATE, kind: defaultKind });
  const [submitting, setSubmitting] = useState(false);
  // Offset del teclado virtual (iOS) — calculamos cuánto se "comió" la altura
  // del visualViewport para levantar el bottom del panel por encima del teclado.
  // Sin esto, el footer (Siguiente) queda tapado y el step content scrollea raro.
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setStep(1);
      setDirection(1);
      setState({ ...EMPTY_STATE, kind: defaultKind, occurred_at: todayLocalIso() });
      setSubmitting(false);
    }
  }, [open, defaultKind]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC cierra
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Tracking del teclado virtual (iOS / Android) usando VisualViewport API.
  // Si el visualViewport es más chico que window.innerHeight, la diferencia
  // es lo que ocupa el teclado — ese alto se aplica como bottom inset al panel.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, inset));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setKeyboardOffset(0);
    };
  }, [open]);

  const goNext = () => {
    if (step < 3) {
      setDirection(1);
      setStep((step + 1) as Step);
    } else {
      handleConfirm();
    }
  };
  const goPrev = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((step - 1) as Step);
    } else {
      onClose();
    }
  };

  // Validaciones por paso
  const canAdvance = useMemo(() => {
    if (step === 1) {
      return Number(state.amount) > 0;
    }
    if (step === 2) {
      if (state.kind === 'transfer') {
        return state.account_id && state.to_account_id && state.account_id !== state.to_account_id;
      }
      // expense/income con cuenta o tarjeta
      return !!state.account_id || !!state.credit_card_id;
    }
    return true;
  }, [step, state]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const amount = Number(state.amount);
      const useRecurring = !!state.credit_card_id && state.recurring_enabled && state.recurring_day >= 1;
      const useInstallments = !!state.credit_card_id && state.installment_enabled && state.installment_total >= 2 && !useRecurring;
      const result: WizardResult = {
        kind: state.kind,
        amount,
        currency: state.credit_card_id ? state.card_currency : (
          accounts.find(a => a.id === state.account_id)?.currency ?? 'ARS'
        ),
        account_id: state.account_id || undefined,
        credit_card_id: state.credit_card_id || undefined,
        card_currency: state.credit_card_id ? state.card_currency : undefined,
        installment_total: useInstallments ? state.installment_total : null,
        installment_current: useInstallments ? state.installment_current : null,
        recurring_enabled: useRecurring,
        recurring_day: useRecurring ? state.recurring_day : undefined,
        to_account_id: state.to_account_id || undefined,
        to_amount: state.to_amount ? Number(state.to_amount) : null,
        fx_rate: state.fx_rate ? Number(state.fx_rate) : null,
        category_id: state.category_id || null,
        occurred_at: new Date(state.occurred_at).toISOString(),
        description: state.description || null,
      };
      await onSubmit(result);
    } finally {
      setSubmitting(false);
    }
  };

  // Categorías filtradas por kind
  const filteredCategories = categories.filter(c => c.kind === (state.kind === 'transfer' ? 'expense' : state.kind));

  const fromAccount = accounts.find(a => a.id === state.account_id);
  const toAccount = accounts.find(a => a.id === state.to_account_id);
  const transferCrossCurrency = state.kind === 'transfer' && fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  // Currency activa para mostrar al lado del monto en step 1
  const activeCurrency = state.credit_card_id ? state.card_currency : (fromAccount?.currency ?? 'ARS');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            // fixed en mobile (queda anclado al viewport, no scrollea con el inner
            // del PersonalLayout cuando iOS abre el teclado), absolute en desktop
            // (queda dentro del frame iPhone).
            className="fixed md:absolute inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed md:absolute left-0 right-0 top-12 z-50 mx-auto md:mx-0 md:max-w-none max-w-[480px] bg-[var(--color-cream-50)] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
            // bottom dinámico: si hay teclado virtual, se levanta por encima.
            // En desktop keyboardOffset es 0 → bottom: 0px (= bottom-0 visual).
            style={{ bottom: keyboardOffset }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con drag handle + botón cerrar + step indicator */}
            <div className="shrink-0 px-5 pt-3 pb-3">
              <div className="flex items-center justify-center mb-2">
                <span className="w-10 h-1.5 rounded-full bg-[var(--color-ink)]/15" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-[var(--color-ink)] shadow-sm"
                  aria-label="Atrás"
                >
                  {step === 1 ? <X size={18} /> : <ChevronLeft size={20} />}
                </button>
                <div className="flex-1 flex items-center gap-1.5">
                  {[1, 2, 3].map(s => (
                    <span
                      key={s}
                      className={`h-1 rounded-full flex-1 transition-all ${
                        s < step ? 'bg-[var(--color-ink)]' :
                        s === step ? 'bg-[var(--color-ink)]' :
                        'bg-[var(--color-ink)]/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                  {step}/3
                </span>
              </div>
            </div>

            {/* Steps con transición horizontal */}
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 40 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="absolute inset-0 overflow-y-auto px-5 pb-32"
                >
                  {step === 1 && (
                    <Step1Amount state={state} setState={setState} activeCurrency={activeCurrency} />
                  )}
                  {step === 2 && (
                    <Step2Source
                      state={state}
                      setState={setState}
                      accounts={accounts}
                      cards={cards}
                      defaultFxRate={defaultFxRate}
                      transferCrossCurrency={!!transferCrossCurrency}
                      fromAccount={fromAccount}
                      toAccount={toAccount}
                    />
                  )}
                  {step === 3 && (
                    <Step3Details state={state} setState={setState} categories={filteredCategories} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer con CTA */}
            <div className="shrink-0 px-5 pt-3 pb-6 border-t border-[var(--color-ink)]/5 bg-[var(--color-cream-50)]">
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance || submitting}
                className="w-full py-3.5 rounded-full bg-[var(--color-ink)] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando…' : step < 3 ? (
                  <>Siguiente <ChevronRight size={16} /></>
                ) : (
                  <><Check size={16} /> Confirmar</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── STEP 1: monto + tipo ───────────────────────────────────────────────────
const Step1Amount: React.FC<{ state: State; setState: (s: State) => void; activeCurrency: string }> = ({ state, setState, activeCurrency }) => {
  const KINDS: { key: WizardKind; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
    { key: 'expense',  label: 'Gasto',      icon: <ArrowUpRight   size={16} strokeWidth={2.25} />, color: 'text-rose-600',    bg: 'bg-rose-100' },
    { key: 'income',   label: 'Ingreso',    icon: <ArrowDownLeft  size={16} strokeWidth={2.25} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { key: 'transfer', label: 'Transferir', icon: <ArrowRightLeft size={16} strokeWidth={2.25} />, color: 'text-blue-600',    bg: 'bg-blue-100' },
  ];

  return (
    <div className="pt-2">
      <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Tipo</p>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {KINDS.map(k => {
          const selected = state.kind === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => setState({ ...state, kind: k.key, account_id: '', credit_card_id: '', to_account_id: '', installment_enabled: false })}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                selected
                  ? 'bg-[var(--color-ink)] text-white'
                  : 'bg-white text-[var(--color-ink)] shadow-sm'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? 'bg-white/15' : k.bg + ' ' + k.color}`}>
                {k.icon}
              </span>
              <span className="text-xs font-medium">{k.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mt-8">¿Cuánto?</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-3xl text-[var(--color-ink-muted)]">
          {activeCurrency === 'USD' ? 'US$' : activeCurrency === 'EUR' ? '€' : '$'}
        </span>
        <MoneyInput
          value={state.amount}
          onChange={v => setState({ ...state, amount: v })}
          size="xl"
          autoFocus
          inputClassName="px-0"
        />
      </div>
      <p className="text-[11px] text-[var(--color-ink-muted)] mt-2">
        Empezá tipeando. Se formatea automáticamente.
      </p>
    </div>
  );
};

// ─── STEP 2: origen (cuenta o tarjeta) ──────────────────────────────────────
const Step2Source: React.FC<{
  state: State;
  setState: (s: State) => void;
  accounts: PersonalAccount[];
  cards: PersonalCreditCard[];
  defaultFxRate?: number | null;
  transferCrossCurrency: boolean;
  fromAccount?: PersonalAccount;
  toAccount?: PersonalAccount;
}> = ({ state, setState, accounts, cards, defaultFxRate, transferCrossCurrency, fromAccount, toAccount }) => {

  if (state.kind === 'transfer') {
    return (
      <div className="pt-2 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Desde</p>
          <div className="mt-2 space-y-2">
            {accounts.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setState({ ...state, account_id: a.id })}
                className={`w-full text-left ${state.account_id === a.id ? 'ring-2 ring-[var(--color-ink)]' : ''} rounded-3xl`}
              >
                <AccountCard account={a} variant="compact" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Hacia</p>
          <div className="mt-2 space-y-2">
            {accounts.filter(a => a.id !== state.account_id).map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setState({ ...state, to_account_id: a.id })}
                className={`w-full text-left ${state.to_account_id === a.id ? 'ring-2 ring-[var(--color-ink)]' : ''} rounded-3xl`}
              >
                <AccountCard account={a} variant="compact" />
              </button>
            ))}
          </div>
        </div>

        {transferCrossCurrency && fromAccount && toAccount && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
              Conversión {fromAccount.currency} → {toAccount.currency}
            </p>
            <div>
              <label className="text-xs text-[var(--color-ink-muted)] block mb-1.5">Tipo de cambio (opcional)</label>
              <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
                <MoneyInput
                  value={state.fx_rate}
                  onChange={v => setState({ ...state, fx_rate: v })}
                  placeholder={defaultFxRate ? String(defaultFxRate) : 'opcional'}
                  size="md"
                  inputClassName="px-0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-ink-muted)] block mb-1.5">Monto destino (opcional)</label>
              <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
                <MoneyInput
                  value={state.to_amount}
                  onChange={v => setState({ ...state, to_amount: v })}
                  currency={toAccount.currency}
                  size="md"
                  inputClassName="px-0"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expense / Income: lista de cuentas + tarjetas (solo expense)
  return (
    <div className="pt-2 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={14} className="text-[var(--color-ink-muted)]" />
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Cuentas</p>
        </div>
        <div className="space-y-2">
          {accounts.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => setState({ ...state, account_id: a.id, credit_card_id: '' })}
              className={`w-full text-left ${state.account_id === a.id ? 'ring-2 ring-[var(--color-ink)]' : ''} rounded-3xl`}
            >
              <AccountCard account={a} variant="compact" />
            </button>
          ))}
        </div>
      </div>

      {state.kind === 'expense' && cards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CreditCardIcon size={14} className="text-[var(--color-ink-muted)]" />
            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Tarjetas de crédito</p>
          </div>
          <div className="space-y-2">
            {cards.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setState({ ...state, credit_card_id: c.id, account_id: '' })}
                className={`w-full text-left ${state.credit_card_id === c.id ? 'ring-2 ring-[var(--color-ink)]' : ''} rounded-3xl`}
              >
                <CreditCardVisual card={c} variant="compact" />
              </button>
            ))}
          </div>

          {state.credit_card_id && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-2">Moneda de la compra</p>
              <div className="flex gap-2">
                {['ARS', 'USD'].map(c => (
                  <PillChip
                    key={c}
                    variant={state.card_currency === c ? 'selected' : 'outline'}
                    onClick={() => setState({ ...state, card_currency: c })}
                  >
                    {c}
                  </PillChip>
                ))}
              </div>
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-2">
                Va al resumen {state.card_currency} de esta tarjeta.
              </p>
            </div>
          )}

          {state.credit_card_id && (
            <>
              <InstallmentsBlock state={state} setState={setState} />
              <RecurringBlock state={state} setState={setState} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Recurrente (sub-bloque dentro de Step2) ────────────────────────────────
const RecurringBlock: React.FC<{ state: State; setState: (s: State) => void }> = ({ state, setState }) => {
  // Mutual exclusion: si hay cuotas activas, no podemos también ser recurrente.
  // El toggle apaga el otro al prenderse.
  return (
    <div className="mt-3 rounded-2xl bg-white border border-[var(--color-ink)]/10 p-3.5">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">Pago recurrente mensual</p>
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
            Cargás este mes y queda agendado para los próximos (gym, Netflix…).
          </p>
        </div>
        <input
          type="checkbox"
          checked={state.recurring_enabled}
          onChange={e => setState({
            ...state,
            recurring_enabled: e.target.checked,
            // Excluyente con cuotas
            installment_enabled: e.target.checked ? false : state.installment_enabled,
          })}
          className="w-5 h-5 accent-[var(--color-ink)]"
        />
      </label>

      {state.recurring_enabled && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-1.5">¿Qué día del mes se cobra?</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState({ ...state, recurring_day: Math.max(1, state.recurring_day - 1) })}
              className="w-9 h-9 rounded-full bg-[var(--color-ink)]/5 text-[var(--color-ink)] flex items-center justify-center font-semibold text-lg active:scale-95 transition-transform"
              aria-label="Día anterior"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <p className="font-serif text-2xl text-[var(--color-ink)]">Día {state.recurring_day}</p>
            </div>
            <button
              type="button"
              onClick={() => setState({ ...state, recurring_day: Math.min(28, state.recurring_day + 1) })}
              className="w-9 h-9 rounded-full bg-[var(--color-ink)]/5 text-[var(--color-ink)] flex items-center justify-center font-semibold text-lg active:scale-95 transition-transform"
              aria-label="Día siguiente"
            >
              +
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-2">
            Hoy se carga este gasto. A partir del próximo mes, el día {state.recurring_day} se carga solo al resumen.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Cuotas (sub-bloque dentro de Step2) ────────────────────────────────────
const InstallmentsBlock: React.FC<{ state: State; setState: (s: State) => void }> = ({ state, setState }) => {
  const COMMON_TOTALS = [3, 6, 9, 12, 18, 24];
  const total = state.installment_total;
  const current = Math.min(state.installment_current, total);
  const totalAmount = Number(state.amount) || 0;
  const perCuota = total > 0 ? totalAmount / total : 0;
  const remaining = Math.max(0, total - current + 1);
  const currencySymbol = state.card_currency === 'USD' ? 'US$' : '$';

  return (
    <div className="mt-5 rounded-2xl bg-white border border-[var(--color-ink)]/10 p-3.5">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">En cuotas</p>
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
            Se carga al resumen mes a mes automáticamente.
          </p>
        </div>
        <input
          type="checkbox"
          checked={state.installment_enabled}
          onChange={e => setState({
            ...state,
            installment_enabled: e.target.checked,
            // Excluyente con recurrente
            recurring_enabled: e.target.checked ? false : state.recurring_enabled,
          })}
          className="w-5 h-5 accent-[var(--color-ink)]"
        />
      </label>

      {state.installment_enabled && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-1.5">¿Cuántas cuotas?</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TOTALS.map(n => (
                <PillChip
                  key={n}
                  variant={state.installment_total === n ? 'selected' : 'outline'}
                  onClick={() => setState({ ...state, installment_total: n, installment_current: Math.min(state.installment_current, n) })}
                >
                  {n}
                </PillChip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-1.5">¿Por cuál vas?</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setState({ ...state, installment_current: Math.max(1, current - 1) })}
                className="w-9 h-9 rounded-full bg-[var(--color-ink)]/5 text-[var(--color-ink)] flex items-center justify-center font-semibold text-lg active:scale-95 transition-transform"
                aria-label="Una cuota menos"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <p className="font-serif text-2xl text-[var(--color-ink)]">{current} <span className="text-base text-[var(--color-ink-muted)]">/ {total}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setState({ ...state, installment_current: Math.min(total, current + 1) })}
                className="w-9 h-9 rounded-full bg-[var(--color-ink)]/5 text-[var(--color-ink)] flex items-center justify-center font-semibold text-lg active:scale-95 transition-transform"
                aria-label="Una cuota más"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
              {current === 1
                ? 'Compra nueva — empieza desde la primera.'
                : `Las cuotas 1 a ${current - 1} no se cargan (las pagaste antes).`}
            </p>
          </div>

          {totalAmount > 0 && (
            <div className="rounded-xl bg-[var(--color-cream-100)] px-3 py-2.5">
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                {total} cuotas de <span className="font-semibold text-[var(--color-ink)]">{currencySymbol} {perCuota.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </p>
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                Se van a crear <span className="font-semibold text-[var(--color-ink)]">{remaining}</span> cuotas, una por mes a partir de la fecha que elijas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── STEP 3: detalle ─────────────────────────────────────────────────────────
const Step3Details: React.FC<{ state: State; setState: (s: State) => void; categories: PersonalCategory[] }> = ({ state, setState, categories }) => {
  return (
    <div className="pt-2 space-y-5">
      {state.kind !== 'transfer' && categories.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Categoría</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {categories.map(c => (
              <PillChip
                key={c.id}
                variant={state.category_id === c.id ? 'selected' : 'outline'}
                onClick={() => setState({ ...state, category_id: state.category_id === c.id ? null : c.id })}
              >
                {c.name}
              </PillChip>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Descripción</label>
        <input
          type="text"
          value={state.description}
          onChange={e => setState({ ...state, description: e.target.value })}
          placeholder="opcional · ej. Carrefour, sueldo abril, …"
          className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">
          {state.installment_enabled ? 'Fecha de la compra ORIGINAL' : 'Fecha y hora'}
        </label>
        <input
          type="datetime-local"
          value={state.occurred_at}
          onChange={e => setState({ ...state, occurred_at: e.target.value })}
          className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
        />
        {state.installment_enabled && (
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
            Poné el día en que hiciste la compra (la cuota 1). El sistema ubica las cuotas restantes mes a mes desde esa fecha.
          </p>
        )}
      </div>
    </div>
  );
};
