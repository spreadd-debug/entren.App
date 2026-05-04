import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Bike, Footprints, Mountain, Dumbbell, Waves, Trash2 } from 'lucide-react';
import { MobileHeader, Card, Fab, BottomSheet, PillChip } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import { PersonalActivitiesService } from '../../services/PersonalTrackerService';
import { PersonalActivity, PersonalSportType } from '../../../shared/types';

const SPORT_LABELS: Record<string, string> = {
  run: 'Running',
  trail_run: 'Trail Run',
  virtual_run: 'Virtual Run',
  tennis: 'Tenis',
  cycling: 'Ciclismo',
  swimming: 'Natación',
  strength: 'Fuerza',
  walking: 'Caminata',
  hiking: 'Trekking',
  yoga: 'Yoga',
  other: 'Otro',
};

const SPORT_ICONS: Record<string, React.FC<any>> = {
  run: Footprints,
  trail_run: Mountain,
  virtual_run: Footprints,
  tennis: Activity,
  cycling: Bike,
  swimming: Waves,
  strength: Dumbbell,
  walking: Footprints,
  hiking: Mountain,
  yoga: Activity,
  other: Activity,
};

const SOURCE_LABELS: Record<string, string> = {
  garmin: 'Garmin',
  strava: 'Strava',
  manual: 'Manual',
};

type Range = 'week' | 'month' | 'all';

function rangeStart(r: Range): string | undefined {
  const d = new Date();
  if (r === 'week') {
    const dow = d.getDay();
    const diff = (dow + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (r === 'month') {
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  }
  return undefined;
}

function fmtDuration(sec: number | null | undefined): string {
  const s = sec ?? 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

interface ManualForm {
  sport_type: PersonalSportType;
  date: string;
  time: string;
  duration_min: string;
  distance_km: string;
  calories_kcal: string;
  notes: string;
}

const EMPTY_FORM: ManualForm = {
  sport_type: 'tennis',
  date: new Date().toISOString().slice(0, 10),
  time: '18:00',
  duration_min: '',
  distance_km: '',
  calories_kcal: '',
  notes: '',
};

export const PersonalWorkouts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = usePersonalProfile();
  const [range, setRange] = useState<Range>('week');
  const [items, setItems] = useState<PersonalActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ManualForm>(EMPTY_FORM);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const list = await PersonalActivitiesService.list(profile.id, { from: rangeStart(range) });
      setItems(list);
    } catch (err) {
      console.error('[workouts] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [profile?.id, range]);

  // Open form si vino con ?new=1 desde el dashboard
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const totalKcal = useMemo(
    () => items.reduce((sum, a) => sum + (a.calories_kcal ?? 0), 0),
    [items],
  );

  const handleSubmit = async () => {
    if (!profile) return;
    const durationMin = Number(form.duration_min) || 0;
    if (durationMin <= 0) { alert('Duración requerida'); return; }
    try {
      await PersonalActivitiesService.create({
        profile_id: profile.id,
        source: 'manual',
        sport_type: form.sport_type,
        started_at: new Date(`${form.date}T${form.time}`).toISOString(),
        duration_seconds: durationMin * 60,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        calories_kcal: form.calories_kcal ? Number(form.calories_kcal) : null,
        notes: form.notes || null,
      });
      setForm(EMPTY_FORM);
      setFormOpen(false);
      refresh();
    } catch (err) {
      console.error('[workouts] create failed', err);
      alert('No se pudo guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este entrenamiento?')) return;
    await PersonalActivitiesService.delete(id);
    refresh();
  };

  return (
    <>
      <MobileHeader title="Workouts" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        <div className="flex items-center gap-2 mt-2">
          <PillChip variant={range === 'week'  ? 'selected' : 'outline'} onClick={() => setRange('week')}>Semana</PillChip>
          <PillChip variant={range === 'month' ? 'selected' : 'outline'} onClick={() => setRange('month')}>Mes</PillChip>
          <PillChip variant={range === 'all'   ? 'selected' : 'outline'} onClick={() => setRange('all')}>Todo</PillChip>
        </div>

        <Card className="mt-4" tone="ink">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-60">Total</p>
              <p className="font-serif text-3xl mt-0.5">{items.length} entrenos</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider opacity-60">Kcal</p>
              <p className="font-serif text-3xl mt-0.5">{totalKcal}</p>
            </div>
          </div>
        </Card>

        <div className="mt-4 space-y-2">
          {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}
          {!loading && items.length === 0 && (
            <p className="text-center text-sm text-[var(--color-ink-muted)] py-8 italic">Sin entrenamientos en este rango</p>
          )}
          {items.map(a => {
            const Icon = SPORT_ICONS[a.sport_type] ?? Activity;
            return (
              <Card key={a.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-cream-200)] flex items-center justify-center text-[var(--color-ink)] shrink-0">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-lg text-[var(--color-ink)] leading-tight truncate">
                        {SPORT_LABELS[a.sport_type] ?? a.sport_type}
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                        {SOURCE_LABELS[a.source] ?? a.source}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      {fmtDate(a.started_at)} · {fmtDuration(a.duration_seconds)}
                      {a.distance_km ? ` · ${Number(a.distance_km).toFixed(1)}km` : ''}
                      {a.calories_kcal ? ` · ${a.calories_kcal}kcal` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="p-2 text-[var(--color-ink-muted)] hover:text-rose-600"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Fab onClick={() => setFormOpen(true)} />

      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Nuevo entrenamiento">
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Deporte</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['tennis','run','trail_run','virtual_run','other'] as PersonalSportType[]).concat(
                ['cycling','swimming','strength','walking','hiking','yoga'] as any
              ).map((s: any) => (
                <PillChip
                  key={s}
                  variant={form.sport_type === s ? 'selected' : 'outline'}
                  onClick={() => setForm({ ...form, sport_type: s })}
                >
                  {SPORT_LABELS[s] ?? s}
                </PillChip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
            <Field label="Hora"  type="time" value={form.time} onChange={v => setForm({ ...form, time: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (min)" type="number" value={form.duration_min} onChange={v => setForm({ ...form, duration_min: v })} placeholder="60" />
            <Field label="Distancia (km)" type="number" value={form.distance_km} onChange={v => setForm({ ...form, distance_km: v })} placeholder="opcional" />
          </div>
          <Field label="Kcal (opcional)" type="number" value={form.calories_kcal} onChange={v => setForm({ ...form, calories_kcal: v })} placeholder="se calcula auto si está vacío" />
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
