import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Activity, Bike, Footprints, Mountain, Dumbbell, Waves, Flame } from 'lucide-react';
import { Card } from '../ui';
import { PersonalActivity } from '../../../../shared/types';

// Calendario tipo Strava: mes actual con un círculo por día. Si hay actividad
// ese día, aparece el ícono del sport_type. Navegación entre meses con
// chevrones. Streak counter arriba (semanas consecutivas con ≥1 actividad).
// Totales del mes abajo (cantidad, horas, km, kcal).
//
// Recibe TODA la lista de activities — el componente filtra internamente por mes
// y semana. El padre se encarga del fetch.

interface Props {
  activities: PersonalActivity[];
}

const SPORT_ICONS: Record<string, React.FC<any>> = {
  run: Footprints, trail_run: Mountain, virtual_run: Footprints,
  tennis: Activity, cycling: Bike, swimming: Waves,
  strength: Dumbbell, walking: Footprints, hiking: Mountain,
  yoga: Activity, other: Activity,
};

const SPORT_COLORS: Record<string, string> = {
  run: '#FB923C', trail_run: '#84CC16', virtual_run: '#FB923C',
  tennis: '#10B981', cycling: '#06B6D4', swimming: '#3B82F6',
  strength: '#A855F7', walking: '#F59E0B', hiking: '#84CC16',
  yoga: '#EC4899', other: '#64748B',
};

const WEEK_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  const diff = (dow + 6) % 7; // a Lunes
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Cuenta semanas consecutivas con ≥1 actividad terminando en la semana actual.
// Si esta semana no hay actividad todavía, cuenta desde la última semana
// completa hacia atrás — así no rompe el streak el lunes a la mañana.
function computeStreak(activitiesByWeek: Map<string, number>, today: Date): number {
  let streak = 0;
  const start = startOfWeek(today);
  const thisWeekKey = dayKey(start);
  // Si esta semana ya tiene actividad, cuenta. Si no, arrancamos desde la
  // anterior (no romper el streak por días vacíos al inicio de la semana).
  let cursor = (activitiesByWeek.get(thisWeekKey) ?? 0) > 0
    ? new Date(start)
    : (() => { const x = new Date(start); x.setDate(x.getDate() - 7); return x; })();
  while (true) {
    const key = dayKey(cursor);
    if ((activitiesByWeek.get(key) ?? 0) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

export const WorkoutCalendar: React.FC<Props> = ({ activities }) => {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0..11

  // Index de actividades por día — usamos started_at en local time.
  const byDay = useMemo(() => {
    const map = new Map<string, PersonalActivity[]>();
    for (const a of activities) {
      const d = new Date(a.started_at);
      const key = dayKey(d);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [activities]);

  // Index de actividades por semana (para el streak) — key = startOfWeek date.
  const byWeek = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activities) {
      const d = new Date(a.started_at);
      const wk = dayKey(startOfWeek(d));
      map.set(wk, (map.get(wk) ?? 0) + 1);
    }
    return map;
  }, [activities]);

  const streakWeeks = useMemo(() => computeStreak(byWeek, today), [byWeek, today]);

  // Filas del mes — empieza desde el lunes de la semana donde cae el día 1.
  const monthRows = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const start = startOfWeek(firstOfMonth);
    const rows: Date[][] = [];
    let cursor = new Date(start);
    // 6 semanas asegura cubrir cualquier mes (algunos atraviesan 6)
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(week);
    }
    return rows;
  }, [viewYear, viewMonth]);

  // Activities del mes visible — para los totales.
  const monthActivities = useMemo(() => {
    return activities.filter(a => {
      const d = new Date(a.started_at);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
  }, [activities, viewYear, viewMonth]);

  const monthTotals = useMemo(() => {
    const seconds = monthActivities.reduce((s, a) => s + (a.duration_seconds ?? 0), 0);
    const km      = monthActivities.reduce((s, a) => s + Number(a.distance_km ?? 0), 0);
    const kcal    = monthActivities.reduce((s, a) => s + (a.calories_kcal ?? 0), 0);
    return {
      count: monthActivities.length,
      hours: seconds / 3600,
      km,
      kcal,
    };
  }, [monthActivities]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    // No permitimos navegar a meses futuros (no tienen sentido para historia de actividades)
    const today = new Date();
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const isAtCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <Card className="mt-4 overflow-hidden" tone="ink" padding="md">
      {/* Streak header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-semibold">Tu racha</p>
          <p className="font-serif text-3xl mt-0.5 flex items-center gap-2">
            {streakWeeks}
            <span className="text-base opacity-60">{streakWeeks === 1 ? 'semana' : 'semanas'}</span>
            {streakWeeks > 0 && <Flame size={20} className="text-orange-400" />}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-semibold">Actividades</p>
          <p className="font-serif text-3xl mt-0.5">{activities.length}</p>
        </div>
      </div>

      {/* Mes navegación */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4 mb-3">
        <button
          type="button"
          onClick={goPrev}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 active:scale-95 transition-transform"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-serif text-lg capitalize">
          {new Date(viewYear, viewMonth, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={isAtCurrentMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Header de días */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEK_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] uppercase tracking-wider opacity-50 font-semibold">{l}</div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1">
        {monthRows.flat().map((d, idx) => {
          const inMonth = d.getMonth() === viewMonth;
          const isFuture = d > today;
          const acts = byDay.get(dayKey(d)) ?? [];
          const isToday = dayKey(d) === dayKey(today);

          if (!inMonth) {
            // Espacios en blanco para días de meses adyacentes — mantenemos
            // el grid alineado pero sin contenido visible.
            return <div key={idx} className="aspect-square" />;
          }

          if (acts.length === 0) {
            // Día sin actividad: círculo vacío con el número
            return (
              <div
                key={idx}
                className={`aspect-square flex items-center justify-center text-[11px] rounded-full border ${
                  isToday ? 'border-white/40 text-white' : 'border-white/15 text-white/45'
                } ${isFuture ? 'opacity-30' : ''}`}
              >
                {d.getDate()}
              </div>
            );
          }

          // Día con actividad: ícono coloreado del primer sport_type. Si hay
          // varias actividades del mismo día, mostramos badge con el contador.
          const primary = acts[0];
          const Icon = SPORT_ICONS[primary.sport_type] ?? Activity;
          const color = SPORT_COLORS[primary.sport_type] ?? '#FB923C';
          const showCount = acts.length > 1;

          return (
            <div
              key={idx}
              className="aspect-square rounded-full flex items-center justify-center relative"
              style={{ background: color }}
              title={`${acts.length} actividad${acts.length === 1 ? '' : 'es'} · ${d.toLocaleDateString('es-AR')}`}
            >
              {showCount ? (
                <span className="text-white font-semibold text-sm">{acts.length}</span>
              ) : (
                <Icon size={14} strokeWidth={2.25} className="text-white" />
              )}
              {isToday && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </div>
          );
        })}
      </div>

      {/* Totales del mes */}
      <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/10">
        <Stat label="Activs" value={String(monthTotals.count)} />
        <Stat label="Hrs"    value={monthTotals.hours.toFixed(monthTotals.hours >= 10 ? 0 : 1)} />
        <Stat label="Km"     value={monthTotals.km.toFixed(monthTotals.km >= 10 ? 0 : 1)} />
        <Stat label="Kcal"   value={monthTotals.kcal.toLocaleString('es-AR')} />
      </div>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">{label}</p>
    <p className="font-serif text-xl mt-0.5">{value}</p>
  </div>
);
