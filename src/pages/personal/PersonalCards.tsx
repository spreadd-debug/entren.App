import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { MobileHeader, Card, Fab, BottomSheet, PillChip, MoneyInput } from '../../components/personal/ui';
import { CreditCardVisual } from '../../components/personal/money/CreditCardVisual';
import { CardStack } from '../../components/personal/money/CardStack';
import { CARD_PRESETS } from '../../components/personal/money/cardPresets';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import {
  PersonalCreditCardsService,
  PersonalAccountsService,
} from '../../services/PersonalTrackerService';
import { PersonalCreditCard, PersonalAccount } from '../../../shared/types';

interface CardForm {
  name: string;
  bank: string;
  last_4: string;
  closing_day: string;
  due_day: string;
  credit_limit: string;
  pay_from_account_id: string;
  color_a: string;
  color_b: string;
  image_url: string;
}

const EMPTY: CardForm = {
  name: '',
  bank: '',
  last_4: '',
  closing_day: '25',
  due_day: '5',
  credit_limit: '',
  pay_from_account_id: '',
  color_a: '#6366F1',
  color_b: '#A855F7',
  image_url: '',
};

const GRADIENT_PRESETS: { name: string; a: string; b: string }[] = [
  { name: 'Violet',  a: '#6366F1', b: '#A855F7' },
  { name: 'Sunset',  a: '#F43F5E', b: '#EC4899' },
  { name: 'Aurora',  a: '#10B981', b: '#3B82F6' },
  { name: 'Coral',   a: '#F59E0B', b: '#EC4899' },
  { name: 'Ocean',   a: '#0EA5E9', b: '#8B5CF6' },
  { name: 'Forest',  a: '#14B8A6', b: '#22C55E' },
  { name: 'Carbon',  a: '#1F2937', b: '#0F172A' },
];

export const PersonalCards: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = usePersonalProfile();
  const [cards, setCards] = useState<PersonalCreditCard[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CardForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [cs, accs] = await Promise.all([
        PersonalCreditCardsService.list(profile.id),
        PersonalAccountsService.list(profile.id),
      ]);
      setCards(cs);
      setAccounts(accs);
    } catch (err) {
      console.error('[cards] load failed', err);
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

  const openEdit = (c: PersonalCreditCard) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      bank: c.bank ?? '',
      last_4: c.last_4 ?? '',
      closing_day: String(c.closing_day),
      due_day: String(c.due_day),
      credit_limit: c.credit_limit != null ? String(c.credit_limit) : '',
      pay_from_account_id: c.pay_from_account_id ?? '',
      color_a: c.color_a ?? '#6366F1',
      color_b: c.color_b ?? '#A855F7',
      image_url: c.image_url ?? '',
    });
    setFormOpen(true);
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!profile) return;
    setUploadingImage(true);
    try {
      // Generamos un id temporal si todavía no se guardó la card.
      const targetId = editingId ?? `draft-${Date.now()}`;
      const url = await PersonalCreditCardsService.uploadImage(profile.id, targetId, file);
      setForm(f => ({ ...f, image_url: url }));
    } catch (err: any) {
      console.error('[cards] upload failed', err);
      alert(`No se pudo subir la imagen: ${err?.message ?? 'Error'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.name.trim()) { alert('Ponele nombre a la tarjeta'); return; }
    const closingDay = Number(form.closing_day);
    const dueDay = Number(form.due_day);
    if (!(closingDay >= 1 && closingDay <= 31)) { alert('Día de cierre inválido (1-31)'); return; }
    if (!(dueDay >= 1 && dueDay <= 31)) { alert('Día de vencimiento inválido (1-31)'); return; }

    try {
      const payload = {
        name: form.name.trim(),
        bank: form.bank.trim() || null,
        last_4: form.last_4.trim() || null,
        closing_day: closingDay,
        due_day: dueDay,
        credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
        pay_from_account_id: form.pay_from_account_id || null,
        color_a: form.color_a,
        color_b: form.color_b,
        image_url: form.image_url || null,
      };
      if (editingId) {
        await PersonalCreditCardsService.update(editingId, payload);
      } else {
        await PersonalCreditCardsService.create({ profile_id: profile.id, ...payload });
      }
      setForm(EMPTY);
      setEditingId(null);
      setFormOpen(false);
      refresh();
    } catch (err: any) {
      console.error('[cards] save failed', err);
      alert(`No se pudo guardar: ${err?.message ?? 'Error'}`);
    }
  };

  const holderName = profile?.display_name || null;

  return (
    <>
      <MobileHeader title="Tarjetas" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && cards.length === 0 && (
          <Card className="mt-4" tone="tinted">
            <p className="text-sm text-[var(--color-ink)]">
              Sumá tus tarjetas de crédito. Cada una tiene su día de cierre y vencimiento.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 w-full py-2.5 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium"
            >
              Agregar primera tarjeta
            </button>
          </Card>
        )}

        {!loading && cards.length > 0 && (
          <>
            <div className="mt-2 mb-6">
              <CardStack cards={cards} holderName={holderName} onSelect={(c) => navigate(`/admin/personal/cards/${c.id}`)} />
            </div>

            <h3 className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mt-8 mb-2 px-1">Listado</h3>
            <div className="space-y-2">
              {cards.map(c => (
                <Card key={c.id} padding="sm" onClick={() => navigate(`/admin/personal/cards/${c.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-16">
                      <CreditCardVisual card={c} variant="compact" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight truncate">{c.name}</h4>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 truncate">
                        {c.bank ?? '—'} · cierre {String(c.closing_day).padStart(2, '0')} / venc {String(c.due_day).padStart(2, '0')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2"
                    >
                      Editar
                    </button>
                    <ChevronRight size={16} className="text-[var(--color-ink-muted)]" />
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Fab onClick={openCreate} icon={<Plus size={24} strokeWidth={2} />} ariaLabel="Nueva tarjeta" />

      <BottomSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingId(null); }}
        title={editingId ? 'Editar tarjeta' : 'Nueva tarjeta'}
      >
        <div className="space-y-4 mt-2">
          {/* Preview en vivo */}
          <div>
            <CreditCardVisual
              card={{
                name: form.name || 'Mi tarjeta',
                bank: form.bank || null,
                last_4: form.last_4 || null,
                closing_day: Number(form.closing_day) || 0,
                due_day: Number(form.due_day) || 0,
                color_a: form.color_a,
                color_b: form.color_b,
                image_url: form.image_url || null,
              }}
              holderName={holderName}
              variant="hero"
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-full bg-[var(--color-cream-200)] text-[var(--color-ink)] text-xs font-medium cursor-pointer">
                {uploadingImage ? 'Subiendo…' : (form.image_url ? 'Cambiar foto' : 'Subir foto de la tarjeta')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }}
                />
              </label>
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                  className="text-xs text-[var(--color-ink-muted)] hover:text-rose-600"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          {/* Picker de bancos: autocompleta nombre + colores + logo del visual */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Banco / billetera</label>
            <div className="flex flex-wrap gap-1.5">
              {CARD_PRESETS.map(p => {
                const selected = form.bank.trim().toLowerCase() === p.bank.toLowerCase();
                return (
                  <PillChip
                    key={p.bank}
                    variant={selected ? 'selected' : 'outline'}
                    onClick={() => setForm({
                      ...form,
                      bank: p.bank,
                      color_a: p.color_a,
                      color_b: p.color_b,
                    })}
                  >
                    {p.label}
                  </PillChip>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-2">
              Elegí uno o escribí abajo a mano si tu banco no está en la lista.
            </p>
          </div>

          <Field label="Nombre" type="text" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Visa Galicia" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Banco" type="text" value={form.bank} onChange={v => setForm({ ...form, bank: v })} placeholder="Galicia" />
            <Field label="Últimos 4" type="text" value={form.last_4} onChange={v => setForm({ ...form, last_4: v.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cierre (día)" type="number" value={form.closing_day} onChange={v => setForm({ ...form, closing_day: v })} placeholder="25" />
            <Field label="Vencimiento (día)" type="number" value={form.due_day} onChange={v => setForm({ ...form, due_day: v })} placeholder="5" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Límite de crédito (opcional)</label>
            <div className="rounded-2xl bg-white border border-[var(--color-ink)]/10 px-4 py-1">
              <MoneyInput
                value={form.credit_limit}
                onChange={v => setForm({ ...form, credit_limit: v })}
                size="md"
                inputClassName="px-0"
                placeholder="por ej. 1.500.000"
              />
            </div>
          </div>
          <p className="text-[11px] text-[var(--color-ink-muted)] -mt-2">
            La tarjeta acepta compras en pesos y dólares — al cargar cada gasto elegís la moneda.
          </p>

          <Field
            label="Cuenta para pagar el resumen"
            asSelect
            value={form.pay_from_account_id}
            onChange={v => setForm({ ...form, pay_from_account_id: v })}
            options={[{ value: '', label: '— elegir al pagar —' }, ...accounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))]}
          />

          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Color</label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {GRADIENT_PRESETS.map(p => {
                const selected = form.color_a === p.a && form.color_b === p.b;
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-label={p.name}
                    onClick={() => setForm({ ...form, color_a: p.a, color_b: p.b })}
                    className={`aspect-square rounded-full ring-2 ${selected ? 'ring-[var(--color-ink)]' : 'ring-transparent'} active:scale-95 transition-transform`}
                    style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 mt-2 rounded-full bg-[var(--color-ink)] text-white font-medium"
          >
            {editingId ? 'Guardar cambios' : 'Crear tarjeta'}
          </button>
        </div>
      </BottomSheet>
    </>
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
