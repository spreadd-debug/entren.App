import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Edit3,
} from 'lucide-react';
import { GymSubscription, GymBillingPayment, GymSubscriptionStatus, GymPlanTier } from '../../shared/types';
import { api } from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GymSubscriptionStatus, { label: string; color: string; icon: React.FC<any> }> = {
  trial:     { label: 'Trial',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',    icon: Clock },
  active:    { label: 'Activo',    color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CheckCircle },
  past_due:  { label: 'Vencido',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: AlertTriangle },
  suspended: { label: 'Suspendido', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',        icon: Pause },
  cancelled: { label: 'Cancelado', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', icon: XCircle },
};

const PLAN_LABELS: Record<GymPlanTier, string> = {
  starter:  'Starter',
  pro:      'Pro',
  business: 'Business',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ status }: { status: GymSubscriptionStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.color}`}>
      <Icon size={11} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ── Edit Subscription Modal ───────────────────────────────────────────────────

interface EditModalProps {
  sub: GymSubscription;
  onClose: () => void;
  onSaved: (updated: GymSubscription) => void;
}

function EditModal({ sub, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    status: sub.status,
    plan_tier: sub.plan_tier,
    trial_ends_at: sub.trial_ends_at?.slice(0, 10) ?? '',
    current_period_end: sub.current_period_end?.slice(0, 10) ?? '',
    grace_period_days: String(sub.grace_period_days),
    access_enabled: sub.access_enabled,
    notes: sub.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<GymSubscription> = {
        status: form.status as GymSubscriptionStatus,
        plan_tier: form.plan_tier as GymPlanTier,
        trial_ends_at: form.trial_ends_at || null,
        current_period_end: form.current_period_end || null,
        grace_period_days: Number(form.grace_period_days),
        access_enabled: form.access_enabled,
        notes: form.notes || null,
      };
      const updated = await api.subscriptions.update(sub.gym_id, payload);
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Editar suscripción</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sub.gym_name}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Estado</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as GymSubscriptionStatus }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                {(Object.keys(STATUS_CONFIG) as GymSubscriptionStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Plan</label>
              <select
                value={form.plan_tier}
                onChange={e => setForm(f => ({ ...f, plan_tier: e.target.value as GymPlanTier }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                {(Object.keys(PLAN_LABELS) as GymPlanTier[]).map(t => (
                  <option key={t} value={t}>{PLAN_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Fin de trial</label>
              <input
                type="date"
                value={form.trial_ends_at}
                onChange={e => setForm(f => ({ ...f, trial_ends_at: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Fin de período</label>
              <input
                type="date"
                value={form.current_period_end}
                onChange={e => setForm(f => ({ ...f, current_period_end: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Días de gracia</label>
              <input
                type="number"
                min="0"
                value={form.grace_period_days}
                onChange={e => setForm(f => ({ ...f, grace_period_days: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, access_enabled: !f.access_enabled }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.access_enabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.access_enabled ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Acceso habilitado</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notas internas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Observaciones sobre este gimnasio..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Register Billing Payment Modal ────────────────────────────────────────────

interface PaymentModalProps {
  sub: GymSubscription;
  onClose: () => void;
  onSaved: (payment: GymBillingPayment, updatedSub: GymSubscription) => void;
}

function PaymentModal({ sub, onClose, onSaved }: PaymentModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    amount: '',
    currency: 'ARS',
    period_start: today,
    period_end: nextMonth,
    payment_method: 'transfer',
    reference: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payment = await api.subscriptions.recordBillingPayment({
        gym_id: sub.gym_id,
        amount: Number(form.amount),
        currency: form.currency,
        period_start: form.period_start,
        period_end: form.period_end,
        payment_method: form.payment_method,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });
      // Fetch updated subscription
      const updatedSub = await api.subscriptions.getByGymId(sub.gym_id);
      onSaved(payment, updatedSub ?? sub);
    } catch (err: any) {
      setError(err?.message ?? 'Error al registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Registrar pago</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sub.gym_name}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Monto</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Método</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="mercadopago">MercadoPago</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Período desde</label>
              <input
                type="date"
                value={form.period_start}
                onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Período hasta</label>
              <input
                type="date"
                value={form.period_end}
                onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Referencia / comprobante</label>
            <input
              type="text"
              placeholder="Nro. de transferencia, etc."
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notas</label>
            <input
              type="text"
              placeholder="Opcional"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold transition-all"
          >
            {saving ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gym Row ───────────────────────────────────────────────────────────────────

interface GymRowProps {
  key?: React.Key;
  sub: GymSubscription;
  payments: GymBillingPayment[];
  onEdit: () => void;
  onRegisterPayment: () => void;
  onQuickAction: (gymId: string, action: 'activate' | 'suspend' | 'cancel' | 'trial' | 'past-due') => Promise<void> | void;
  loadingAction: string | null;
}

function GymRow({ sub, payments, onEdit, onRegisterPayment, onQuickAction, loadingAction }: GymRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = loadingAction === sub.gym_id;

  const gymPayments = payments.filter(p => p.gym_id === sub.gym_id);

  const relevantDate =
    sub.status === 'trial' ? sub.trial_ends_at :
    sub.status === 'past_due' ? sub.grace_period_ends_at :
    sub.current_period_end;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Main row */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{sub.gym_name}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{sub.owner_email}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <StatusBadge status={sub.status} />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {PLAN_LABELS[sub.plan_tier]}
            </span>
            {relevantDate && (
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Calendar size={10} />
                {fmtDate(relevantDate)}
              </span>
            )}
            {!sub.access_enabled && (
              <span className="text-xs font-bold text-red-500">Acceso bloqueado</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRegisterPayment}
            disabled={isLoading}
            title="Registrar pago"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
          >
            <DollarSign size={15} />
          </button>
          <button
            onClick={onEdit}
            disabled={isLoading}
            title="Editar suscripción"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
          >
            <Edit3 size={15} />
          </button>
          {sub.status !== 'suspended' && sub.status !== 'cancelled' ? (
            <button
              onClick={() => onQuickAction(sub.gym_id, 'suspend')}
              disabled={isLoading}
              title="Suspender"
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Pause size={15} />
            </button>
          ) : (
            <button
              onClick={() => onQuickAction(sub.gym_id, 'trial')}
              disabled={isLoading}
              title="Reactivar como trial"
              className="p-2 rounded-xl text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
            >
              <Play size={15} />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded: payment history */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Historial de pagos ({gymPayments.length})
          </p>
          {gymPayments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-600">Sin pagos registrados.</p>
          ) : (
            <div className="space-y-2">
              {gymPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">
                    {p.currency} {Number(p.amount).toLocaleString('es-AR')}
                  </span>
                  <span>{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</span>
                  <span className="capitalize text-slate-400">{p.payment_method}</span>
                  <span className="text-slate-300 dark:text-slate-600">{fmtDate(p.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions row */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => onQuickAction(sub.gym_id, 'past-due')}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              Marcar vencido
            </button>
            <button
              onClick={() => onQuickAction(sub.gym_id, 'cancel')}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              Cancelar suscripción
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function SuperAdminView() {
  const [subscriptions, setSubscriptions] = useState<GymSubscription[]>([]);
  const [billingPayments, setBillingPayments] = useState<GymBillingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<GymSubscription | null>(null);
  const [paymentSub, setPaymentSub] = useState<GymSubscription | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [subs, payments] = await Promise.all([
      api.subscriptions.getAll(),
      api.subscriptions.getBillingPayments(),
    ]);
    setSubscriptions(subs);
    setBillingPayments(payments);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleQuickAction = async (
    gymId: string,
    action: 'activate' | 'suspend' | 'cancel' | 'trial' | 'past-due'
  ) => {
    setLoadingAction(gymId);
    try {
      let updated: GymSubscription;
      if (action === 'activate') {
        const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10);
        updated = await api.subscriptions.activate(gymId, nextMonth);
      } else if (action === 'suspend') {
        updated = await api.subscriptions.suspend(gymId);
      } else if (action === 'cancel') {
        if (!confirm('¿Cancelar la suscripción de este gimnasio?')) return;
        updated = await api.subscriptions.cancel(gymId);
      } else if (action === 'trial') {
        updated = await api.subscriptions.startTrial(gymId, 30);
      } else {
        updated = await api.subscriptions.markPastDue(gymId);
      }
      setSubscriptions(prev => prev.map(s => s.gym_id === gymId ? updated : s));
    } finally {
      setLoadingAction(null);
    }
  };

  // Stats summary
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    past_due: subscriptions.filter(s => s.status === 'past_due').length,
    suspended: subscriptions.filter(s => s.status === 'suspended' || s.status === 'cancelled').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Panel Superadmin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestión de suscripciones de gimnasios</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Activos', value: stats.active, color: 'text-green-600 dark:text-green-400' },
          { label: 'Trial', value: stats.trial, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Problemas', value: stats.past_due + stats.suspended, color: 'text-red-600 dark:text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Gym list */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-sm">Cargando...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-sm">
          No hay gimnasios registrados todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => (
            <GymRow
              key={sub.gym_id}
              sub={sub}
              payments={billingPayments}
              onEdit={() => setEditingSub(sub)}
              onRegisterPayment={() => setPaymentSub(sub)}
              onQuickAction={handleQuickAction}
              loadingAction={loadingAction}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingSub && (
        <EditModal
          sub={editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={updated => {
            setSubscriptions(prev => prev.map(s => s.gym_id === updated.gym_id ? updated : s));
            setEditingSub(null);
          }}
        />
      )}

      {/* Payment modal */}
      {paymentSub && (
        <PaymentModal
          sub={paymentSub}
          onClose={() => setPaymentSub(null)}
          onSaved={(payment, updatedSub) => {
            setBillingPayments(prev => [payment, ...prev]);
            setSubscriptions(prev => prev.map(s => s.gym_id === updatedSub.gym_id ? updatedSub : s));
            setPaymentSub(null);
          }}
        />
      )}
    </div>
  );
}
