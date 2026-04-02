import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ClientMeasurement } from '../../../shared/types';

interface BodyZone {
  id: keyof ClientMeasurement;
  label: string;
  // SVG path for the clickable/highlight zone
  path: string;
  // Position for the tooltip label
  labelX: number;
  labelY: number;
  // Which side to show the line: 'left' | 'right'
  side: 'left' | 'right';
}

// Body zones mapped to measurement fields
// Paths drawn on a 200x440 viewBox (frontal human silhouette)
const BODY_ZONES: BodyZone[] = [
  {
    id: 'neck_cm',
    label: 'Cuello',
    path: 'M 90,68 Q 90,60 95,58 L 105,58 Q 110,60 110,68 L 110,76 Q 105,78 100,78 Q 95,78 90,76 Z',
    labelX: 100, labelY: 68,
    side: 'right',
  },
  {
    id: 'shoulders_cm',
    label: 'Hombros',
    path: 'M 58,82 Q 70,76 90,78 L 110,78 Q 130,76 142,82 L 142,92 Q 130,86 110,88 L 90,88 Q 70,86 58,92 Z',
    labelX: 100, labelY: 85,
    side: 'left',
  },
  {
    id: 'chest_cm',
    label: 'Pecho',
    path: 'M 62,95 Q 70,90 90,90 L 110,90 Q 130,90 138,95 L 138,120 Q 130,118 110,116 L 90,116 Q 70,118 62,120 Z',
    labelX: 100, labelY: 106,
    side: 'right',
  },
  {
    id: 'waist_cm',
    label: 'Cintura',
    path: 'M 68,145 Q 78,140 90,140 L 110,140 Q 122,140 132,145 L 132,162 Q 122,158 110,157 L 90,157 Q 78,158 68,162 Z',
    labelX: 100, labelY: 152,
    side: 'left',
  },
  {
    id: 'hips_cm',
    label: 'Cadera',
    path: 'M 65,168 Q 75,163 90,162 L 110,162 Q 125,163 135,168 L 138,190 Q 125,188 110,187 L 90,187 Q 75,188 62,190 Z',
    labelX: 100, labelY: 178,
    side: 'right',
  },
  {
    id: 'bicep_l_cm',
    label: 'Bíceps Izq',
    path: 'M 48,100 Q 52,96 58,95 L 62,95 L 62,130 L 58,132 Q 50,130 46,125 Z',
    labelX: 54, labelY: 112,
    side: 'left',
  },
  {
    id: 'bicep_r_cm',
    label: 'Bíceps Der',
    path: 'M 138,95 L 142,95 Q 148,96 152,100 L 154,125 Q 150,130 142,132 L 138,130 Z',
    labelX: 146, labelY: 112,
    side: 'right',
  },
  {
    id: 'thigh_l_cm',
    label: 'Muslo Izq',
    path: 'M 68,195 Q 75,190 88,190 L 95,190 L 92,260 L 78,262 Q 70,258 66,245 Z',
    labelX: 80, labelY: 228,
    side: 'left',
  },
  {
    id: 'thigh_r_cm',
    label: 'Muslo Der',
    path: 'M 105,190 L 112,190 Q 125,190 132,195 L 134,245 Q 130,258 122,262 L 108,260 Z',
    labelX: 120, labelY: 228,
    side: 'right',
  },
  {
    id: 'calf_l_cm',
    label: 'Gemelo Izq',
    path: 'M 76,300 Q 78,290 80,285 L 92,283 L 92,310 Q 90,328 88,340 L 80,342 Q 74,330 73,318 Z',
    labelX: 83, labelY: 315,
    side: 'left',
  },
  {
    id: 'calf_r_cm',
    label: 'Gemelo Der',
    path: 'M 108,283 L 120,285 Q 122,290 124,300 L 127,318 Q 126,330 120,342 L 112,340 Q 110,328 108,310 Z',
    labelX: 117, labelY: 315,
    side: 'right',
  },
];

// Full body silhouette outline (non-interactive, just the shape)
const BODY_OUTLINE = `
  M 100,8
  Q 88,8 85,20 Q 82,32 84,44 Q 86,52 92,56
  L 90,58 Q 86,60 86,68 L 86,76 Q 86,80 90,82
  Q 72,78 58,85 Q 44,92 40,102 L 36,130 Q 34,142 38,148
  L 42,154 Q 46,156 48,152 L 52,138 Q 56,130 60,128
  L 62,134 L 64,142 Q 66,150 66,160
  L 62,172 Q 58,185 60,195
  L 64,240 Q 66,256 70,268
  L 74,282 Q 76,288 74,300
  L 72,320 Q 70,338 72,350
  L 74,370 Q 76,388 80,395
  L 84,400 Q 88,404 92,404 Q 96,404 96,398
  L 94,390 Q 90,382 88,370
  L 86,340 Q 84,328 86,310
  L 90,285 L 94,270
  L 100,264
  L 106,270 L 110,285
  L 114,310 Q 116,328 114,340
  L 112,370 Q 110,382 106,390
  L 104,398 Q 104,404 108,404 Q 112,404 116,400
  L 120,395 Q 124,388 126,370
  L 128,350 Q 130,338 128,320
  L 126,300 Q 124,288 126,282
  L 130,268 Q 134,256 136,240
  L 140,195 Q 142,185 138,172
  L 134,160 Q 134,150 136,142
  L 138,134 L 140,128 Q 144,130 148,138
  L 152,152 Q 154,156 158,154
  L 162,148 Q 166,142 164,130
  L 160,102 Q 156,92 142,85
  Q 128,78 110,82
  Q 114,80 114,76 L 114,68 Q 114,60 110,58
  L 108,56 Q 114,52 116,44 Q 118,32 115,20 Q 112,8 100,8
  Z
`;

interface InteractiveBodyMapProps {
  latest: ClientMeasurement | null;
  previous: ClientMeasurement | null;
}

export const InteractiveBodyMap: React.FC<InteractiveBodyMapProps> = ({ latest, previous }) => {
  const [activeZone, setActiveZone] = useState<string | null>(null);

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

  if (!latest) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Sin mediciones para mostrar
        </p>
      </div>
    );
  }

  const activeData = activeZone ? BODY_ZONES.find(z => z.id === activeZone) : null;
  const activeValue = activeData ? getValue(activeData.id) : null;
  const activeDelta = activeData ? getDelta(activeData.id) : null;

  return (
    <div className="relative select-none">
      {/* Top info card */}
      <div className={`mb-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
        activeData
          ? 'bg-violet-500/10 border-violet-500/30'
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
      }`}>
        {activeData ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">{activeData.label}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {activeValue ?? '–'}
                </span>
                <span className="text-sm text-slate-400">cm</span>
                {activeDelta != null && activeDelta !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                    activeDelta < 0
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                  }`}>
                    {activeDelta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {activeDelta > 0 ? '+' : ''}{activeDelta} cm
                  </span>
                )}
              </div>
            </div>
            {activeValue == null && (
              <span className="text-xs text-slate-400 italic">Sin dato</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
            Tocá una zona del cuerpo para ver la medida
          </p>
        )}
      </div>

      {/* SVG Body */}
      <div className="flex justify-center">
        <svg
          viewBox="20 0 160 420"
          className="w-full max-w-[280px] h-auto"
          style={{ filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.15))' }}
        >
          <defs>
            <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="hasDataGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="activeGlow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#8b5cf6" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>
          </defs>

          {/* Body silhouette */}
          <path
            d={BODY_OUTLINE}
            fill="url(#bodyGradient)"
            stroke="#8b5cf6"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            filter="url(#glow)"
          />

          {/* Grid dots for sci-fi effect */}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle
              key={`dot-${i}`}
              cx={70 + (i % 4) * 20}
              cy={100 + Math.floor(i / 4) * 140}
              r="1"
              fill="#8b5cf6"
              opacity="0.3"
            />
          ))}

          {/* Interactive zones */}
          {BODY_ZONES.map((zone) => {
            const isActive = activeZone === zone.id;
            const value = getValue(zone.id);
            const hasData = value != null;

            return (
              <g key={zone.id}>
                <path
                  d={zone.path}
                  fill={
                    isActive ? 'url(#activeGradient)'
                    : hasData ? 'url(#hasDataGradient)'
                    : 'rgba(139, 92, 246, 0.08)'
                  }
                  stroke={isActive ? '#8b5cf6' : hasData ? '#8b5cf6' : '#8b5cf6'}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeOpacity={isActive ? 0.9 : hasData ? 0.5 : 0.2}
                  filter={isActive ? 'url(#activeGlow)' : undefined}
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => setActiveZone(isActive ? null : zone.id as string)}
                  style={{ pointerEvents: 'all' }}
                />

                {/* Value labels on the body for zones with data */}
                {hasData && !isActive && (
                  <text
                    x={zone.labelX}
                    y={zone.labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none"
                    fill="white"
                    fontSize="8"
                    fontWeight="800"
                    opacity="0.9"
                  >
                    {value}
                  </text>
                )}

                {/* Active zone: larger value label */}
                {isActive && (
                  <text
                    x={zone.labelX}
                    y={zone.labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none"
                    fill="white"
                    fontSize="10"
                    fontWeight="900"
                  >
                    {value ?? '–'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Quick summary row below body */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {BODY_ZONES.filter(z => getValue(z.id) != null).slice(0, 6).map(zone => {
          const val = getValue(zone.id);
          const delta = getDelta(zone.id);
          const isActive = activeZone === zone.id;
          return (
            <button
              key={zone.id}
              onClick={() => setActiveZone(isActive ? null : zone.id as string)}
              className={`px-2 py-1.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-violet-500/15 border border-violet-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent'
              }`}
            >
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate">{zone.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-black text-slate-900 dark:text-white">{val}</span>
                {delta != null && delta !== 0 && (
                  <span className={`text-[8px] font-bold ${delta < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {delta > 0 ? '+' : ''}{delta}
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
