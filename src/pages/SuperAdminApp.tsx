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
  TrendingUp,
  Building2,
  Plus,
} from 'lucide-react';
import { GymSubscription, GymBillingPayment, GymSubscriptionStatus, GymPlanTier } from '../../shared/types';
import { api } from '../services/api';
import { SuperAdminShell, SAView } from '../components/SuperAdminShell';

// ── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GymSubscriptionStatus, { label: string; color: string; icon: React.FC<any> }> = {
  trial:     { label: 'Trial',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',     icon: Clock },
  active:    { label: 'Activo',     color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CheckCircle },
  past_due:  { label: 'Vencido',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: AlertTriangle },
  suspended: { label: 'Suspendido', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',         icon: Pause },
  cancelled: { label: 'Cancelado',  color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', icon: XCircle },
};

const PLAN_LABELS: Record<GymPlanTier, string> = {
  basic:      'Basic',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCurrency(amount: number, currency = 'ARS'): string {
  return `${currency} ${Number(amount).toLocaleString('es-AR')}`;
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

function getRelevantDate(sub: GymSubscription): string | null {
  if (sub.status === 'trial') return sub.trial_ends_at;
  if (sub.status === 'past_due') return sub.grace_period_ends_at;
  return sub.current_period_end;
}

// ── Edit Subscription Modal ───────────────────────────────────────────────────

function EditModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: GymSubscription;
  onClose: () => void;
  onSaved: (updated: GymSubscription) => void;
}) {
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
      const updated = await api.subscriptions.update(sub.gym_id, {
        status: form.status as GymSubscriptionStatus,
        plan_tier: form.plan_tier as GymPlanTier,
        trial_ends_at: form.trial_ends_at || null,
        current_period_end: form.current_period_end || null,
        grace_period_days: Number(form.grace_period_days),
        access_enabled: form.access_enabled,
        notes: form.notes || null,
      });
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
            <div className="flex flex-col justify-end pb-0.5">
              <label
                className="flex items-center gap-2.5 cursor-pointer select-none"
                onClick={() => setForm(f => ({ ...f, access_enabled: !f.access_enabled }))}
              >
                <div className={`relative w-10 h-6 rounded-full transition-colors ${form.access_enabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
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
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold transition-all">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Register Billing Payment Modal ────────────────────────────────────────────

function PaymentModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: GymSubscription;
  onClose: () => void;
  onSaved: (payment: GymBillingPayment, updatedSub: GymSubscription) => void;
}) {
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
    if (!form.amount || Number(form.amount) <= 0) { setError('Ingresá un monto válido.'); return; }
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
              <input type="number" min="0" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Método</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white">
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
              <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Período hasta</label>
              <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Referencia / comprobante</label>
            <input type="text" placeholder="Nro. de transferencia, etc." value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notas</label>
            <input type="text" placeholder="Opcional" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold transition-all">
            {saving ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Gym Modal ─────────────────────────────────────────────────────────────

function NewGymModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (sub: GymSubscription) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    owner_email: '',
    plan_tier: 'basic' as GymPlanTier,
    trial_days: '30',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim() || !form.owner_email.trim()) {
      setError('Nombre y email son requeridos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const sub = await api.subscriptions.createGym({
        name: form.name.trim(),
        owner_email: form.owner_email.trim(),
        plan_tier: form.plan_tier,
        trial_days: Number(form.trial_days),
      });
      onCreated(sub);
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear el gimnasio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Nuevo Gimnasio</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Se creará con un trial de {form.trial_days} días.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Nombre del gimnasio *
            </label>
            <input
              type="text"
              placeholder="Ej: CrossFit Sur"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Email del dueño *
            </label>
            <input
              type="email"
              placeholder="dueño@email.com"
              value={form.owner_email}
              onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Plan inicial</label>
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
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Días de trial</label>
              <input
                type="number"
                min="1"
                max="365"
                value={form.trial_days}
                onChange={e => setForm(f => ({ ...f, trial_days: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleCreate} disabled={saving} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold transition-all">
            {saving ? 'Creando...' : 'Crear gimnasio'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Standalone Billing Payment Modal (with gym selector) ──────────────────────

function StandalonePaymentModal({
  subscriptions,
  onClose,
  onSaved,
}: {
  subscriptions: GymSubscription[];
  onClose: () => void;
  onSaved: (payment: GymBillingPayment, updatedSub: GymSubscription) => void;
}) {
  const [selectedGymId, setSelectedGymId] = useState(subscriptions[0]?.gym_id ?? '');
  const selectedSub = subscriptions.find(s => s.gym_id === selectedGymId);

  if (!selectedSub) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 px-6 py-8 text-center">
          <p className="text-sm text-slate-500">No hay gimnasios registrados para registrar un cobro.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Registrar cobro</h3>
        </div>

        <div className="px-6 pt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Gimnasio</label>
          <select
            value={selectedGymId}
            onChange={e => setSelectedGymId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white mb-1"
          >
            {subscriptions.map(s => (
              <option key={s.gym_id} value={s.gym_id}>{s.gym_name}</option>
            ))}
          </select>
        </div>

        {/* Reuse PaymentModal internals via a wrapper */}
        <_PaymentModalBody sub={selectedSub} onClose={onClose} onSaved={onSaved} />
      </div>
    </div>
  );
}

// Shared payment form body (extracted to avoid duplication)
function _PaymentModalBody({
  sub,
  onClose,
  onSaved,
}: {
  sub: GymSubscription;
  onClose: () => void;
  onSaved: (payment: GymBillingPayment, updatedSub: GymSubscription) => void;
}) {
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
    if (!form.amount || Number(form.amount) <= 0) { setError('Ingresá un monto válido.'); return; }
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
      const updatedSub = await api.subscriptions.getByGymId(sub.gym_id);
      onSaved(payment, updatedSub ?? sub);
    } catch (err: any) {
      setError(err?.message ?? 'Error al registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Monto</label>
            <input type="number" min="0" placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Método</label>
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white">
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
            <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Período hasta</label>
            <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Referencia / comprobante</label>
          <input type="text" placeholder="Nro. de transferencia, etc." value={form.reference}
            onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notas</label>
          <input type="text" placeholder="Opcional" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white" />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      <div className="px-6 pb-6 flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold transition-all">
          {saving ? 'Registrando...' : 'Registrar pago'}
        </button>
      </div>
    </>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function SAOverview({
  subscriptions,
  billingPayments,
}: {
  subscriptions: GymSubscription[];
  billingPayments: GymBillingPayment[];
}) {
  const now = new Date();

  const stats = {
    total:     subscriptions.length,
    active:    subscriptions.filter(s => s.status === 'active').length,
    trial:     subscriptions.filter(s => s.status === 'trial').length,
    past_due:  subscriptions.filter(s => s.status === 'past_due').length,
    suspended: subscriptions.filter(s => s.status === 'suspended').length,
    cancelled: subscriptions.filter(s => s.status === 'cancelled').length,
  };

  const problems = stats.past_due + stats.suspended + stats.cancelled;

  const revenueThisMonth = billingPayments
    .filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const revenueTotal = billingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Upcoming expirations: next 30 days
  const upcoming = subscriptions
    .filter(s => {
      const d = getRelevantDate(s);
      if (!d) return false;
      const diff = new Date(d).getTime() - now.getTime();
      return diff > 0 && diff <= 30 * 86_400_000;
    })
    .sort((a, b) => {
      const da = getRelevantDate(a) ?? '';
      const db = getRelevantDate(b) ?? '';
      return da.localeCompare(db);
    });

  const recentPayments = [...billingPayments].slice(0, 5);

  return (
    <div className="space-y-8 pb-10 max-w-5xl">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: stats.total,  color: 'text-slate-800 dark:text-slate-200' },
          { label: 'Activos',   value: stats.active, color: 'text-green-600 dark:text-green-400' },
          { label: 'Trial',     value: stats.trial,  color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Problemas', value: problems,     color: problems > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400' },
          { label: 'Rev. mes',  value: `$${(revenueThisMonth / 1000).toFixed(0)}k`, color: 'text-cyan-600 dark:text-cyan-400', isText: true },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4">
            <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-widest">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Ingresos</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Este mes</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {fmtCurrency(revenueThisMonth)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Total acumulado</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {fmtCurrency(revenueTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming expirations */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Calendar size={15} className="text-amber-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Próximos vencimientos
            <span className="ml-2 text-xs font-semibold text-slate-400">(30 días)</span>
          </h3>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 dark:text-slate-600 text-center">
            No hay vencimientos próximos.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map(sub => {
              const d = getRelevantDate(sub);
              const daysLeft = d ? Math.ceil((new Date(d).getTime() - now.getTime()) / 86_400_000) : null;
              return (
                <div key={sub.gym_id} className="px-6 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{sub.gym_name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{sub.owner_email}</p>
                  </div>
                  <StatusBadge status={sub.status} />
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmtDate(d)}</p>
                    {daysLeft !== null && (
                      <p className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-500' : 'text-amber-500'}`}>
                        {daysLeft}d restantes
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent billing payments */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <DollarSign size={15} className="text-green-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Cobros recientes</h3>
        </div>
        {recentPayments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 dark:text-slate-600 text-center">Sin cobros registrados.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentPayments.map(p => (
              <div key={p.id} className="px-6 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.gym_name ?? '—'}</p>
                  <p className="text-xs text-slate-400">{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmtCurrency(p.amount, p.currency)}</p>
                  <p className="text-xs text-slate-400 capitalize">{p.payment_method}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gyms View ─────────────────────────────────────────────────────────────────

function GymRow({
  sub,
  payments,
  onEdit,
  onRegisterPayment,
  onQuickAction,
  loadingGymId,
}: {
  sub: GymSubscription;
  payments: GymBillingPayment[];
  onEdit: () => void;
  onRegisterPayment: () => void;
  onQuickAction: (gymId: string, action: string) => void;
  loadingGymId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = loadingGymId === sub.gym_id;
  const gymPayments = payments.filter(p => p.gym_id === sub.gym_id);
  const relevantDate = getRelevantDate(sub);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{sub.gym_name}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{sub.owner_email}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <StatusBadge status={sub.status} />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{PLAN_LABELS[sub.plan_tier]}</span>
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

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onRegisterPayment} disabled={isLoading} title="Registrar cobro"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors">
            <DollarSign size={15} />
          </button>
          <button onClick={onEdit} disabled={isLoading} title="Editar"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors">
            <Edit3 size={15} />
          </button>
          {sub.status !== 'suspended' && sub.status !== 'cancelled' ? (
            <button onClick={() => onQuickAction(sub.gym_id, 'suspend')} disabled={isLoading} title="Suspender"
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Pause size={15} />
            </button>
          ) : (
            <button onClick={() => onQuickAction(sub.gym_id, 'trial')} disabled={isLoading} title="Reactivar como trial"
              className="p-2 rounded-xl text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors">
              <Play size={15} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Historial de cobros ({gymPayments.length})
          </p>
          {gymPayments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-600">Sin cobros registrados.</p>
          ) : (
            <div className="space-y-2">
              {gymPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-4">
                  <span className="font-semibold shrink-0">{fmtCurrency(p.amount, p.currency)}</span>
                  <span className="text-slate-400 shrink-0">{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</span>
                  <span className="capitalize text-slate-400 shrink-0">{p.payment_method}</span>
                  <span className="text-slate-300 dark:text-slate-600 shrink-0">{fmtDate(p.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => onQuickAction(sub.gym_id, 'past-due')} disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
              Marcar vencido
            </button>
            <button onClick={() => onQuickAction(sub.gym_id, 'cancel')} disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
              Cancelar suscripción
            </button>
          </div>

          {sub.notes && (
            <p className="mt-3 text-xs text-slate-400 italic border-t border-slate-100 dark:border-slate-800 pt-3">
              {sub.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SAGyms({
  subscriptions,
  billingPayments,
  onUpdateSubscription,
  onAddBillingPayment,
  onGymCreated,
}: {
  subscriptions: GymSubscription[];
  billingPayments: GymBillingPayment[];
  onUpdateSubscription: (updated: GymSubscription) => void;
  onAddBillingPayment: (payment: GymBillingPayment, updatedSub: GymSubscription) => void;
  onGymCreated: (sub: GymSubscription) => void;
}) {
  const [editingSub, setEditingSub] = useState<GymSubscription | null>(null);
  const [paymentSub, setPaymentSub] = useState<GymSubscription | null>(null);
  const [loadingGymId, setLoadingGymId] = useState<string | null>(null);
  const [showNewGym, setShowNewGym] = useState(false);

  const handleQuickAction = async (gymId: string, action: string) => {
    setLoadingGymId(gymId);
    try {
      let updated: GymSubscription;
      if (action === 'suspend') {
        updated = await api.subscriptions.suspend(gymId);
      } else if (action === 'cancel') {
        if (!confirm('¿Cancelar la suscripción de este gimnasio?')) return;
        updated = await api.subscriptions.cancel(gymId);
      } else if (action === 'trial') {
        updated = await api.subscriptions.startTrial(gymId, 30);
      } else if (action === 'past-due') {
        updated = await api.subscriptions.markPastDue(gymId);
      } else {
        const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10);
        updated = await api.subscriptions.activate(gymId, nextMonth);
      }
      onUpdateSubscription(updated);
    } finally {
      setLoadingGymId(null);
    }
  };

  return (
    <div className="space-y-3 pb-10 max-w-4xl">
      {/* Toolbar */}
      <div className="flex justify-end mb-1">
        <button
          onClick={() => setShowNewGym(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-500/25"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nuevo Gimnasio
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-sm">
          <Building2 size={32} className="mx-auto mb-3 opacity-30" />
          No hay gimnasios registrados todavía.
        </div>
      ) : (
        subscriptions.map(sub => (
          <GymRow
            key={sub.gym_id}
            sub={sub}
            payments={billingPayments}
            onEdit={() => setEditingSub(sub)}
            onRegisterPayment={() => setPaymentSub(sub)}
            onQuickAction={handleQuickAction}
            loadingGymId={loadingGymId}
          />
        ))
      )}

      {showNewGym && (
        <NewGymModal
          onClose={() => setShowNewGym(false)}
          onCreated={sub => { onGymCreated(sub); setShowNewGym(false); }}
        />
      )}

      {editingSub && (
        <EditModal
          sub={editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={updated => { onUpdateSubscription(updated); setEditingSub(null); }}
        />
      )}

      {paymentSub && (
        <PaymentModal
          sub={paymentSub}
          onClose={() => setPaymentSub(null)}
          onSaved={(payment, updatedSub) => { onAddBillingPayment(payment, updatedSub); setPaymentSub(null); }}
        />
      )}
    </div>
  );
}

// ── Billing View ──────────────────────────────────────────────────────────────

function SABilling({
  payments,
  subscriptions,
  onAddBillingPayment,
}: {
  payments: GymBillingPayment[];
  subscriptions: GymSubscription[];
  onAddBillingPayment: (payment: GymBillingPayment, updatedSub: GymSubscription) => void;
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const METHOD_LABELS: Record<string, string> = {
    transfer: 'Transferencia',
    cash: 'Efectivo',
    mercadopago: 'MercadoPago',
    other: 'Otro',
  };

  return (
    <div className="max-w-4xl pb-10">
      {/* Toolbar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-500/25"
        >
          <Plus size={14} strokeWidth={2.5} />
          Registrar Cobro
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {payments.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-slate-400 dark:text-slate-600">
            Sin cobros registrados.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Header */}
            <div className="px-6 py-3 grid grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-800/50">
              {['Gimnasio', 'Período', 'Monto', 'Método', 'Fecha'].map(h => (
                <span key={h} className="text-xs font-bold text-slate-400 uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {payments.map(p => (
              <div key={p.id} className="px-6 py-3.5 grid grid-cols-5 gap-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.gym_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {fmtDate(p.period_start)} → {fmtDate(p.period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    {fmtCurrency(p.amount, p.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  </p>
                  {p.reference && (
                    <p className="text-[10px] text-slate-400 truncate">{p.reference}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400">{fmtDate(p.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPaymentModal && (
        <StandalonePaymentModal
          subscriptions={subscriptions}
          onClose={() => setShowPaymentModal(false)}
          onSaved={(payment, updatedSub) => { onAddBillingPayment(payment, updatedSub); setShowPaymentModal(false); }}
        />
      )}
    </div>
  );
}

// ── SuperAdminApp (main export) ───────────────────────────────────────────────

export function SuperAdminApp() {
  const [currentView, setCurrentView] = useState<SAView>('overview');
  const [subscriptions, setSubscriptions] = useState<GymSubscription[]>([]);
  const [billingPayments, setBillingPayments] = useState<GymBillingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleUpdateSubscription = (updated: GymSubscription) => {
    setSubscriptions(prev => prev.map(s => s.gym_id === updated.gym_id ? updated : s));
  };

  const handleAddBillingPayment = (payment: GymBillingPayment, updatedSub: GymSubscription) => {
    setBillingPayments(prev => [payment, ...prev]);
    handleUpdateSubscription(updatedSub);
  };

  const handleGymCreated = (sub: GymSubscription) => {
    setSubscriptions(prev => [sub, ...prev]);
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={20} className="animate-spin text-slate-400" />
        </div>
      );
    }

    switch (currentView) {
      case 'overview':
        return <SAOverview subscriptions={subscriptions} billingPayments={billingPayments} />;
      case 'gyms':
        return (
          <SAGyms
            subscriptions={subscriptions}
            billingPayments={billingPayments}
            onUpdateSubscription={handleUpdateSubscription}
            onAddBillingPayment={handleAddBillingPayment}
            onGymCreated={handleGymCreated}
          />
        );
      case 'billing':
        return (
          <SABilling
            payments={billingPayments}
            subscriptions={subscriptions}
            onAddBillingPayment={handleAddBillingPayment}
          />
        );
    }
  };

  return (
    <SuperAdminShell currentView={currentView} onNavigate={setCurrentView}>
      <div className="flex items-center justify-between mb-6">
        <div /> {/* spacer */}
        <button
          onClick={fetchAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>
      {renderView()}
    </SuperAdminShell>
  );
}
