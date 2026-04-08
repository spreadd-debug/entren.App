import React, { useState, useCallback } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import Model from 'react-body-highlighter';
import { ClientMeasurement } from '../../../shared/types';

// Map muscle IDs from the library to our measurement fields
interface MeasurementZone {
  muscle: string;
  label: string;
  fields: { key: keyof ClientMeasurement; label: string }[];
}

// Anterior (front) muscle → measurement mapping
const ANTERIOR_MAP: MeasurementZone[] = [
  { muscle: 'neck', label: 'Cuello', fields: [{ key: 'neck_cm', label: 'Cuello' }] },
  { muscle: 'trapezius', label: 'Hombros', fields: [{ key: 'shoulders_cm', label: 'Hombros' }] },
  { muscle: 'front-deltoids', label: 'Hombros', fields: [{ key: 'shoulders_cm', label: 'Hombros' }] },
  { muscle: 'chest', label: 'Pecho', fields: [{ key: 'chest_cm', label: 'Pecho' }] },
  { muscle: 'abs', label: 'Cintura', fields: [{ key: 'waist_cm', label: 'Cintura' }] },
  { muscle: 'obliques', label: 'Cintura', fields: [{ key: 'waist_cm', label: 'Cintura' }] },
  { muscle: 'adductor', label: 'Cadera', fields: [{ key: 'hips_cm', label: 'Cadera' }] },
  {
    muscle: 'biceps', label: 'Bíceps',
    fields: [
      { key: 'bicep_l_cm', label: 'Izquierdo' },
      { key: 'bicep_r_cm', label: 'Derecho' },
    ],
  },
  {
    muscle: 'quadriceps', label: 'Muslos',
    fields: [
      { key: 'thigh_l_cm', label: 'Izquierdo' },
      { key: 'thigh_r_cm', label: 'Derecho' },
    ],
  },
  {
    muscle: 'calves', label: 'Gemelos',
    fields: [
      { key: 'calf_l_cm', label: 'Izquierdo' },
      { key: 'calf_r_cm', label: 'Derecho' },
    ],
  },
];

// Posterior (back) muscle → measurement mapping
const POSTERIOR_MAP: MeasurementZone[] = [
  { muscle: 'trapezius', label: 'Hombros', fields: [{ key: 'shoulders_cm', label: 'Hombros' }] },
  { muscle: 'back-deltoids', label: 'Hombros', fields: [{ key: 'shoulders_cm', label: 'Hombros' }] },
  { muscle: 'upper-back', label: 'Pecho', fields: [{ key: 'chest_cm', label: 'Pecho' }] },
  { muscle: 'lower-back', label: 'Cintura', fields: [{ key: 'waist_cm', label: 'Cintura' }] },
  { muscle: 'gluteal', label: 'Cadera', fields: [{ key: 'hips_cm', label: 'Cadera' }] },
  {
    muscle: 'triceps', label: 'Bíceps',
    fields: [
      { key: 'bicep_l_cm', label: 'Izquierdo' },
      { key: 'bicep_r_cm', label: 'Derecho' },
    ],
  },
  {
    muscle: 'hamstring', label: 'Muslos',
    fields: [
      { key: 'thigh_l_cm', label: 'Izquierdo' },
      { key: 'thigh_r_cm', label: 'Derecho' },
    ],
  },
  {
    muscle: 'calves', label: 'Gemelos',
    fields: [
      { key: 'calf_l_cm', label: 'Izquierdo' },
      { key: 'calf_r_cm', label: 'Derecho' },
    ],
  },
];

// All zones combined for lookup
const ALL_ZONES = [...ANTERIOR_MAP, ...POSTERIOR_MAP];

// Unique zones for the summary chips (deduplicated by label)
const UNIQUE_ZONES = ALL_ZONES.filter((z, i, arr) =>
  arr.findIndex(x => x.label === z.label) === i
);

interface InteractiveBodyMapProps {
  latest: ClientMeasurement | null;
  previous: ClientMeasurement | null;
}

export const InteractiveBodyMap: React.FC<InteractiveBodyMapProps> = ({ latest, previous }) => {
  const [activeZone, setActiveZone] = useState<MeasurementZone | null>(null);

  const getValue = (key: keyof ClientMeasurement): number | null => {
    if (!latest) return null;
    return latest[key] as number | null;
  };

  const getDelta = (key: keyof ClientMeasurement): number | null => {
    if (!latest || !previous) return null;
    const curr = latest[key] as number | null;
    const prev = previous[key] as number | null;
    if (curr == null || prev == null) return null;
    return Math.round((curr - prev) * 10) / 10;
  };

  const buildModelData = (zoneMap: MeasurementZone[]) =>
    zoneMap
      .filter(zone => zone.fields.some(f => getValue(f.key) != null))
      .map(zone => ({
        name: zone.label,
        muscles: [zone.muscle] as any[],
        frequency: activeZone?.label === zone.label ? 2 : 1,
      }));

  const handleClick = useCallback(({ muscle }: { muscle: string }) => {
    const zone = ALL_ZONES.find(z => z.muscle === muscle);
    if (!zone) return;
    setActiveZone(prev => prev?.label === zone.label ? null : zone);
  }, []);

  if (!latest) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Sin mediciones para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="relative select-none">
      {/* Top info card */}
      <div className={`mb-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
        activeZone
          ? 'bg-violet-500/10 border-violet-500/30'
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
      }`}>
        {activeZone ? (
          <div>
            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">{activeZone.label}</p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-0.5">
              {activeZone.fields.map(f => {
                const val = getValue(f.key);
                const delta = getDelta(f.key);
                return (
                  <div key={f.key} className="flex items-baseline gap-2">
                    {activeZone.fields.length > 1 && (
                      <span className="text-[10px] text-slate-400">{f.label}</span>
                    )}
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {val ?? '–'}
                    </span>
                    <span className="text-sm text-slate-400">cm</span>
                    {delta != null && delta !== 0 && (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        delta < 0
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        {delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
            Tocá una zona del cuerpo para ver la medida
          </p>
        )}
      </div>

      {/* Body Models — Front & Back side by side */}
      <div className="flex justify-center gap-2">
        <div className="flex-1 text-center">
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Frente</p>
          <Model
            type="anterior"
            data={buildModelData(ANTERIOR_MAP)}
            onClick={handleClick}
            bodyColor="#e2e0f0"
            highlightedColors={['#a78bfa', '#8b5cf6']}
            style={{ width: '100%' }}
          />
        </div>
        <div className="flex-1 text-center">
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Espalda</p>
          <Model
            type="posterior"
            data={buildModelData(POSTERIOR_MAP)}
            onClick={handleClick}
            bodyColor="#e2e0f0"
            highlightedColors={['#a78bfa', '#8b5cf6']}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Quick summary chips */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {UNIQUE_ZONES.filter(z => z.fields.some(f => getValue(f.key) != null)).slice(0, 6).map(zone => {
          const firstVal = getValue(zone.fields[0].key);
          const firstDelta = getDelta(zone.fields[0].key);
          const isActive = activeZone?.label === zone.label;
          return (
            <button
              key={zone.label}
              onClick={() => setActiveZone(isActive ? null : zone)}
              className={`px-2 py-1.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-violet-500/15 border border-violet-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate">{zone.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-black text-slate-900 dark:text-white">{firstVal}</span>
                {firstDelta != null && firstDelta !== 0 && (
                  <span className={`text-[8px] font-bold ${firstDelta < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {firstDelta > 0 ? '+' : ''}{firstDelta}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
