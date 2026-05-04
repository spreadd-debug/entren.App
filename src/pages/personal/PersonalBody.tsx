import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { MobileHeader, Card, Fab, BottomSheet, PillChip } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { PersonalBodyService } from '../../services/PersonalTrackerService';
import { PersonalBodyMetric } from '../../../shared/types';

interface BodyForm {
  measured_at: string;
  weight_kg: string;
  body_fat_pct: string;
  waist_cm: string;
  notes: string;
}

const EMPTY: BodyForm = {
  measured_at: new Date().toISOString().slice(0, 10),
  weight_kg: '',
  body_fat_pct: '',
  waist_cm: '',
  notes: '',
};

type Metric = 'weight' | 'fat' | 'waist';

const METRIC_KEYS: Record<Metric, keyof PersonalBodyMetric> = {
  weight: 'weight_kg',
  fat: 'body_fat_pct',
  waist: 'waist_cm',
};

const METRIC_LABELS: Record<Metric, string> = {
  weight: 'Peso',
  fat: '% Grasa',
  waist: 'Cintura',
};

const METRIC_UNITS: Record<Metric, string> = {
  weight: 'kg',
  fat: '%',
  waist: 'cm',
};

export const PersonalBody: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, update: updateProfile } = usePersonalProfile();
  const [items, setItems] = useState<PersonalBodyMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<Metric>('weight');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<BodyForm>(EMPTY);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setItems(await PersonalBodyService.list(profile.id, 90));
    } catch (err) {
      console.error('[body] load failed', err);
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

  const series = useMemo(() => {
    const key = METRIC_KEYS[metric];
    return [...items]
      .reverse()
      .filter(i => i[key] != null)
      .map(i => ({ date: i.measured_at, value: Number(i[key]) }));
  }, [items, metric]);

  const latest = series.length > 0 ? series[series.length - 1].value : null;
  const monthAgo = series.length > 1 ? series[Math.max(0, series.length - 30)].value : null;
  const delta = latest != null && monthAgo != null ? latest - monthAgo : null;

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.weight_kg && !form.body_fat_pct && !form.waist_cm) {
      alert('Cargá al menos una métrica');
      return;
    }
    try {
      await PersonalBodyService.create({
        profile_id: profile.id,
        measured_at: form.measured_at,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null,
        waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
        notes: form.notes || null,
      });
      // Mantener weight_kg del perfil sincronizado con la última medición — lo
      // usa el cálculo de kcal en el import de Strava.
      if (form.weight_kg) {
        await updateProfile({ weight_kg: Number(form.weight_kg) });
      }
      setForm(EMPTY);
      setFormOpen(false);
      refresh();
    } catch (err) {
      console.error('[body] create failed', err);
      alert('No se pudo guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta medición?')) return;
    await PersonalBodyService.delete(id);
    refresh();
  };

  return (
    <>
      <MobileHeader title="Body" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        <div className="flex items-center gap-2 mt-2">
          {(['weight','fat','waist'] as Metric[]).map(m => (
            <PillChip key={m} variant={metric === m ? 'selected' : 'outline'} onClick={() => setMetric(m)}>
              {METRIC_LABELS[m]}
            </PillChip>
          ))}
        </div>

        <Card className="mt-4" tone="ink">
          <p className="text-xs uppercase tracking-wider opacity-60">{METRIC_LABELS[metric]} actual</p>
          {latest != null ? (
            <p className="font-serif text-5xl mt-1">
              {latest.toFixed(1)}
              <span className="text-base opacity-60 ml-1">{METRIC_UNITS[metric]}</span>
            </p>
          ) : (
            <p className="font-serif text-2xl mt-1 opacity-50">Sin datos</p>
          )}
          {delta != null && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${delta < 0 ? 'text-emerald-300' : delta > 0 ? 'text-rose-300' : 'opacity-60'}`}>
              {delta < 0 ? <ArrowDown size={12} /> : delta > 0 ? <ArrowUp size={12} /> : null}
              {Math.abs(delta).toFixed(1)} {METRIC_UNITS[metric]} vs hace 1 mes
            </p>
          )}
          {series.length > 1 && (
            <div className="h-24 mt-4 -mx-2">
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 8, fontSize: 11, color: 'white' }}
                    labelFormatter={(d) => new Date(d as string).toLocaleDateString('es-AR')}
                    formatter={(v) => [`${v} ${METRIC_UNITS[metric]}`, METRIC_LABELS[metric]]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#FBF8F2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="mt-4 space-y-2">
          {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}
          {!loading && items.length === 0 && (
            <p className="text-center text-sm text-[var(--color-ink-muted)] py-8 italic">Sin mediciones aún</p>
          )}
          {items.map(m => (
            <Card key={m.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-base text-[var(--color-ink)] leading-tight">
                    {new Date(m.measured_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </h4>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    {m.weight_kg ? `${Number(m.weight_kg).toFixed(1)} kg` : ''}
                    {m.body_fat_pct ? ` · ${Number(m.body_fat_pct).toFixed(1)}% grasa` : ''}
                    {m.waist_cm ? ` · ${Number(m.waist_cm).toFixed(1)} cm cintura` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="p-2 text-[var(--color-ink-muted)] hover:text-rose-600"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Fab onClick={() => setFormOpen(true)} />

      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Nueva medición">
        <div className="space-y-4 mt-2">
          <Field label="Fecha" type="date" value={form.measured_at} onChange={v => setForm({ ...form, measured_at: v })} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Peso (kg)"  type="number" value={form.weight_kg}    onChange={v => setForm({ ...form, weight_kg: v })} />
            <Field label="% Grasa"    type="number" value={form.body_fat_pct} onChange={v => setForm({ ...form, body_fat_pct: v })} />
            <Field label="Cintura cm" type="number" value={form.waist_cm}     onChange={v => setForm({ ...form, waist_cm: v })} />
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
