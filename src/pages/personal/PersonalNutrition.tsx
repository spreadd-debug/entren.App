import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, Sparkles } from 'lucide-react';
import { MobileHeader, Card, Fab, BottomSheet, DateStrip, PillChip } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { PersonalMealsService } from '../../services/PersonalTrackerService';
import { PersonalMealWithFoods, PersonalMealType } from '../../../shared/types';

const MEAL_TYPES: PersonalMealType[] = ['desayuno','media_mañana','almuerzo','merienda','cena','pre_entreno','post_entreno','snack'];
const MEAL_LABELS: Record<PersonalMealType, string> = {
  desayuno: 'Desayuno',
  media_mañana: 'Media mañana',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  pre_entreno: 'Pre-entreno',
  post_entreno: 'Post-entreno',
  snack: 'Snack',
};

interface MealForm {
  meal_type: PersonalMealType;
  name: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  notes: string;
}

const EMPTY: MealForm = {
  meal_type: 'almuerzo',
  name: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  notes: '',
};

function todayIso(): string { return new Date().toISOString().slice(0, 10); }

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export const PersonalNutrition: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = usePersonalProfile();
  const [date, setDate] = useState(todayIso());
  const [meals, setMeals] = useState<PersonalMealWithFoods[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MealForm>(EMPTY);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const list = await PersonalMealsService.listByDate(profile.id, date);
      setMeals(list);
    } catch (err) {
      console.error('[nutrition] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id, date]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories ?? 0),
        protein:  acc.protein  + Number(m.protein_g ?? 0),
        carbs:    acc.carbs    + Number(m.carbs_g ?? 0),
        fat:      acc.fat      + Number(m.fat_g ?? 0),
        fiber:    acc.fiber    + Number(m.fiber_g ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  }, [meals]);

  const handleSubmit = async () => {
    if (!profile) return;
    const cal = Number(form.calories);
    if (!cal && !form.name) { alert('Necesitás al menos nombre o kcal'); return; }
    try {
      await PersonalMealsService.create({
        profile_id: profile.id,
        consumed_at: new Date().toISOString(),
        meal_type: form.meal_type,
        name: form.name || null,
        calories: form.calories ? Number(form.calories) : null,
        protein_g: form.protein_g ? Number(form.protein_g) : null,
        carbs_g:   form.carbs_g   ? Number(form.carbs_g)   : null,
        fat_g:     form.fat_g     ? Number(form.fat_g)     : null,
        notes:     form.notes || null,
      });
      setForm(EMPTY);
      setFormOpen(false);
      refresh();
    } catch (err) {
      console.error('[nutrition] create failed', err);
      alert('No se pudo guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta comida?')) return;
    await PersonalMealsService.delete(id);
    refresh();
  };

  return (
    <>
      <MobileHeader title="Nutrición" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        <DateStrip selected={date} onSelect={setDate} daysBack={10} />

        <Card className="mt-4" tone="ink">
          <p className="text-xs uppercase tracking-wider opacity-60">Total del día</p>
          <p className="font-serif text-4xl mt-1">{totals.calories}<span className="text-base opacity-60 ml-1">kcal</span></p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Macro label="Proteína" value={Math.round(totals.protein)} />
            <Macro label="Carbs"    value={Math.round(totals.carbs)} />
            <Macro label="Grasas"   value={Math.round(totals.fat)} />
          </div>
        </Card>

        <div className="mt-4 space-y-2">
          {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}
          {!loading && meals.length === 0 && (
            <p className="text-center text-sm text-[var(--color-ink-muted)] py-8 italic">
              Sin comidas registradas
            </p>
          )}
          {meals.map(m => (
            <Card key={m.id} padding="sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Sparkles size={16} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="font-serif text-lg text-[var(--color-ink)] leading-tight truncate">
                      {m.name || (m.meal_type ? MEAL_LABELS[m.meal_type as PersonalMealType] : 'Comida')}
                    </h4>
                    <span className="text-xs text-[var(--color-ink-muted)] shrink-0">{fmtTime(m.consumed_at)}</span>
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    {m.calories ?? 0} kcal
                    {m.protein_g ? ` · P ${m.protein_g}g` : ''}
                    {m.carbs_g ? ` · C ${m.carbs_g}g` : ''}
                    {m.fat_g ? ` · G ${m.fat_g}g` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="p-2 text-[var(--color-ink-muted)] hover:text-rose-600"
                  aria-label="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Fab onClick={() => setFormOpen(true)} />

      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Nueva comida">
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Tipo</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MEAL_TYPES.map(mt => (
                <PillChip
                  key={mt}
                  variant={form.meal_type === mt ? 'selected' : 'outline'}
                  onClick={() => setForm({ ...form, meal_type: mt })}
                >
                  {MEAL_LABELS[mt]}
                </PillChip>
              ))}
            </div>
          </div>
          <Field label="Nombre" type="text" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Ej. Pollo + arroz" />
          <Field label="Calorías" type="number" value={form.calories} onChange={v => setForm({ ...form, calories: v })} placeholder="kcal" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="P (g)" type="number" value={form.protein_g} onChange={v => setForm({ ...form, protein_g: v })} />
            <Field label="C (g)" type="number" value={form.carbs_g}   onChange={v => setForm({ ...form, carbs_g: v })} />
            <Field label="G (g)" type="number" value={form.fat_g}     onChange={v => setForm({ ...form, fat_g: v })} />
          </div>
          <Field label="Notas" type="text" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="opcional" />

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

const Macro: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="text-center">
    <p className="font-serif text-2xl">{value}<span className="text-xs opacity-60 ml-0.5">g</span></p>
    <p className="text-[10px] uppercase tracking-wider opacity-60 mt-0.5">{label}</p>
  </div>
);

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
