import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { MobileHeader, Card, Fab, BottomSheet, PillChip } from '../../components/personal/ui';
import { AccountCard } from '../../components/personal/money/AccountCard';
import { ACCOUNT_KIND_LABELS, ACCOUNT_KIND_DESCRIPTIONS } from '../../components/personal/money/accountKindLabels';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { PersonalAccountsService } from '../../services/PersonalTrackerService';
import { PersonalAccount, AccountKind } from '../../../shared/types';

interface AccountForm {
  name: string;
  kind: AccountKind;
  currency: string;
  initial_balance: string;
  color_a: string;
  color_b: string;
}

const EMPTY: AccountForm = {
  name: '',
  kind: 'cash',
  currency: 'ARS',
  initial_balance: '',
  color_a: '',
  color_b: '',
};

const PRESETS: { name: string; color_a: string; color_b: string }[] = [
  { name: 'Aurora',     color_a: '#10B981', color_b: '#3B82F6' },
  { name: 'Sunset',     color_a: '#F59E0B', color_b: '#EC4899' },
  { name: 'Violet',     color_a: '#6366F1', color_b: '#A855F7' },
  { name: 'Ocean',      color_a: '#0EA5E9', color_b: '#8B5CF6' },
  { name: 'Forest',     color_a: '#14B8A6', color_b: '#22C55E' },
  { name: 'Crimson',    color_a: '#F43F5E', color_b: '#7C3AED' },
  { name: 'Slate',      color_a: '#475569', color_b: '#0F172A' },
];

export const PersonalAccounts: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AccountForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setAccounts(await PersonalAccountsService.list(profile.id, true));
    } catch (err) {
      console.error('[accounts] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (a: PersonalAccount) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      kind: a.kind,
      currency: a.currency,
      initial_balance: String(a.current_balance ?? ''),
      color_a: a.color_a ?? '',
      color_b: a.color_b ?? '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.name.trim()) { alert('Ponele un nombre'); return; }
    try {
      if (editingId) {
        await PersonalAccountsService.update(editingId, {
          name: form.name.trim(),
          kind: form.kind,
          currency: form.currency,
          color_a: form.color_a || null,
          color_b: form.color_b || null,
        });
      } else {
        await PersonalAccountsService.create({
          profile_id: profile.id,
          name: form.name.trim(),
          kind: form.kind,
          currency: form.currency,
          current_balance: form.initial_balance ? Number(form.initial_balance) : 0,
          color_a: form.color_a || null,
          color_b: form.color_b || null,
        });
      }
      setForm(EMPTY);
      setEditingId(null);
      setFormOpen(false);
      refresh();
    } catch (err: any) {
      console.error('[accounts] save failed', err);
      alert(`No se pudo guardar: ${err?.message ?? 'Error'}`);
    }
  };

  const handleArchive = async (a: PersonalAccount) => {
    if (!confirm(`${a.archived ? 'Restaurar' : 'Archivar'} cuenta "${a.name}"?`)) return;
    await PersonalAccountsService.archive(a.id, !a.archived);
    refresh();
  };

  const active = accounts.filter(a => !a.archived);
  const archived = accounts.filter(a => a.archived);

  return (
    <>
      <MobileHeader title="Cuentas" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && active.length === 0 && (
          <Card className="mt-4" tone="tinted">
            <p className="text-sm text-[var(--color-ink)]">
              Sumá tus cuentas: efectivo, banco, Mercado Pago, USD, inversiones.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 w-full py-2.5 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium"
            >
              Crear primera cuenta
            </button>
          </Card>
        )}

        {!loading && active.length > 0 && (
          <div className="mt-2 space-y-3">
            {active.map(a => (
              <div key={a.id} className="space-y-1.5">
                <AccountCard account={a} variant="compact" onClick={() => openEdit(a)} />
                <button
                  type="button"
                  onClick={() => handleArchive(a)}
                  className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-rose-600 ml-1"
                >
                  Archivar
                </button>
              </div>
            ))}
          </div>
        )}

        {archived.length > 0 && (
          <>
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mt-8 mb-2 px-1">Archivadas</h3>
            <div className="space-y-2 opacity-60">
              {archived.map(a => (
                <Card key={a.id} padding="sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif text-base text-[var(--color-ink)]">{a.name}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">{a.currency} · {ACCOUNT_KIND_LABELS[a.kind]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(a)}
                      className="text-xs px-3 py-1 rounded-full border border-[var(--color-ink)]/15 text-[var(--color-ink)]"
                    >
                      Restaurar
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Fab onClick={openCreate} icon={<Plus size={24} strokeWidth={2} />} ariaLabel="Nueva cuenta" />

      <BottomSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingId(null); }}
        title={editingId ? 'Editar cuenta' : 'Nueva cuenta'}
      >
        <div className="space-y-4 mt-2">
          <Field label="Nombre" type="text" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Mercado Pago" />

          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Tipo</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map(k => (
                <PillChip
                  key={k}
                  variant={form.kind === k ? 'selected' : 'outline'}
                  onClick={() => setForm({ ...form, kind: k })}
                >
                  {ACCOUNT_KIND_LABELS[k]}
                </PillChip>
              ))}
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-2 italic">
              {ACCOUNT_KIND_DESCRIPTIONS[form.kind]}
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Moneda</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['ARS', 'USD', 'EUR'].map(c => (
                <PillChip
                  key={c}
                  variant={form.currency === c ? 'selected' : 'outline'}
                  onClick={() => setForm({ ...form, currency: c })}
                >
                  {c}
                </PillChip>
              ))}
            </div>
          </div>

          {!editingId && (
            <Field
              label="Saldo inicial (opcional)"
              type="number"
              value={form.initial_balance}
              onChange={v => setForm({ ...form, initial_balance: v })}
              placeholder="0"
            />
          )}

          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Gradient</label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {PRESETS.map(p => {
                const selected = form.color_a === p.color_a && form.color_b === p.color_b;
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-label={p.name}
                    onClick={() => setForm({ ...form, color_a: p.color_a, color_b: p.color_b })}
                    className={`aspect-square rounded-full ring-2 ${selected ? 'ring-[var(--color-ink)]' : 'ring-transparent'} active:scale-95 transition-transform`}
                    style={{ background: `linear-gradient(135deg, ${p.color_a}, ${p.color_b})` }}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--color-ink-muted)] mt-1.5">Si dejás vacío, asignamos uno por tipo y moneda.</p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 mt-2 rounded-full bg-[var(--color-ink)] text-white font-medium"
          >
            {editingId ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
        </div>
      </BottomSheet>
    </>
  );
};

const Field: React.FC<{ label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, type, value, onChange, placeholder }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
    />
  </label>
);
