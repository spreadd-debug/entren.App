import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MobileHeader, Card, Fab, BottomSheet, PillChip } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import {
  PersonalExpensesService,
  PersonalExpenseCategoriesService,
} from '../../services/PersonalTrackerService';
import { PersonalExpense, PersonalExpenseCategory } from '../../../shared/types';

interface ExpenseForm {
  amount: string;
  category_id: string | null;
  spent_at: string;
  description: string;
}

const EMPTY: ExpenseForm = {
  amount: '',
  category_id: null,
  spent_at: new Date().toISOString().slice(0, 10),
  description: '',
};

function fmtMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export const PersonalExpenses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = usePersonalProfile();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [items, setItems] = useState<PersonalExpense[]>([]);
  const [cats, setCats] = useState<PersonalExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(EMPTY);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const range = monthRange(year, month);
      const [list, categories] = await Promise.all([
        PersonalExpensesService.listInRange(profile.id, range),
        PersonalExpenseCategoriesService.ensureDefaults(profile.id),
      ]);
      setItems(list);
      setCats(categories);
    } catch (err) {
      console.error('[expenses] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id, year, month]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const total = useMemo(
    () => items.reduce((s, e) => s + Number(e.amount ?? 0), 0),
    [items],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    items.forEach(e => {
      const cat = cats.find(c => c.id === e.category_id);
      const key = cat?.id ?? '__none__';
      const name = cat?.name ?? 'Sin categoría';
      const color = cat?.color ?? '#94A3B8';
      const prev = map.get(key) ?? { name, color, total: 0 };
      prev.total += Number(e.amount ?? 0);
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [items, cats]);

  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    const amount = Number(form.amount);
    if (!(amount > 0)) { alert('Monto requerido'); return; }
    try {
      await PersonalExpensesService.create({
        profile_id: profile.id,
        category_id: form.category_id,
        spent_at: form.spent_at,
        amount,
        description: form.description || null,
        currency: profile.currency,
      });
      setForm(EMPTY);
      setFormOpen(false);
      refresh();
    } catch (err) {
      console.error('[expenses] create failed', err);
      alert('No se pudo guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await PersonalExpensesService.delete(id);
    refresh();
  };

  return (
    <>
      <MobileHeader title="Expensas" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        <div className="flex items-center justify-between mt-2">
          <button type="button" onClick={goPrev} className="p-2 rounded-full bg-white/60 hover:bg-white">
            <ChevronLeft size={18} />
          </button>
          <span className="font-serif text-lg text-[var(--color-ink)] capitalize">{fmtMonth(year, month)}</span>
          <button type="button" onClick={goNext} className="p-2 rounded-full bg-white/60 hover:bg-white">
            <ChevronRight size={18} />
          </button>
        </div>

        <Card className="mt-4" tone="ink">
          <p className="text-xs uppercase tracking-wider opacity-60">Total del mes</p>
          <p className="font-serif text-4xl mt-1">
            {profile?.currency ?? 'ARS'}{' '}
            <span className="font-normal">{total.toLocaleString('es-AR')}</span>
          </p>
        </Card>

        {byCategory.length > 0 && (
          <Card className="mt-3">
            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Por categoría</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCategory} dataKey="total" innerRadius={28} outerRadius={50} strokeWidth={0}>
                      {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {byCategory.slice(0, 5).map(c => {
                  const pct = Math.round((c.total / total) * 100);
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-sm text-[var(--color-ink)] flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-[var(--color-ink-muted)]">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        <div className="mt-4 space-y-2">
          {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}
          {!loading && items.length === 0 && (
            <p className="text-center text-sm text-[var(--color-ink-muted)] py-8 italic">Sin gastos este mes</p>
          )}
          {items.map(e => {
            const cat = cats.find(c => c.id === e.category_id);
            return (
              <Card key={e.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: (cat?.color ?? '#E2E8F0') + '22', color: cat?.color ?? '#64748B' }}>
                    <Tag size={16} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight truncate">
                      {e.description || cat?.name || 'Gasto'}
                    </h4>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      {cat?.name ?? '—'} · {new Date(e.spent_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-lg text-[var(--color-ink)]">{Number(e.amount).toLocaleString('es-AR')}</p>
                    <button type="button" onClick={() => handleDelete(e.id)} className="text-[var(--color-ink-muted)] hover:text-rose-600 mt-0.5" aria-label="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Fab onClick={() => setFormOpen(true)} />

      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Nuevo gasto">
        <div className="space-y-4 mt-2">
          <Field label={`Monto (${profile?.currency ?? 'ARS'})`} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="0" />
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Categoría</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {cats.map(c => (
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
          <Field label="Fecha" type="date" value={form.spent_at} onChange={v => setForm({ ...form, spent_at: v })} />
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
