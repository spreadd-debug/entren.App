import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ClientMeasurement } from '../../../shared/types';

interface BodyZone {
  id: keyof ClientMeasurement;
  label: string;
  path: string;
  labelX: number;
  labelY: number;
}

// ─── Anatomically proportioned body on a 200×500 viewBox ────────────────────
// Proportions: head ~12%, torso ~30%, legs ~38%, neck+shoulders fill the rest
// Center line at x=100, symmetric left-right

const BODY_ZONES: BodyZone[] = [
  {
    id: 'neck_cm',
    label: 'Cuello',
    // Cylindrical neck
    path: `M 91,62 C 91,58 93,56 96,55 L 104,55 C 107,56 109,58 109,62
           L 109,72 C 107,74 104,75 100,75 C 96,75 93,74 91,72 Z`,
    labelX: 100, labelY: 65,
  },
  {
    id: 'shoulders_cm',
    label: 'Hombros',
    // Wide shoulder band with trapezius shape
    path: `M 56,80 C 62,75 75,73 91,75 L 109,75 C 125,73 138,75 144,80
           L 146,90 C 140,86 128,84 113,85 L 87,85 C 72,84 60,86 54,90 Z`,
    labelX: 100, labelY: 82,
  },
  {
    id: 'chest_cm',
    label: 'Pecho',
    // Pectoral area with slight roundness
    path: `M 55,91 C 60,87 72,85 87,86 L 113,86 C 128,85 140,87 145,91
           L 143,115 C 138,120 125,122 113,121 L 87,121 C 75,122 62,120 57,115 Z`,
    labelX: 100, labelY: 103,
  },
  {
    id: 'waist_cm',
    label: 'Cintura',
    // Narrower waist (V-taper)
    path: `M 62,138 C 68,134 80,132 92,132 L 108,132 C 120,132 132,134 138,138
           L 136,155 C 130,152 120,150 108,150 L 92,150 C 80,150 70,152 64,155 Z`,
    labelX: 100, labelY: 144,
  },
  {
    id: 'hips_cm',
    label: 'Cadera',
    // Wider hip area with pelvic curve
    path: `M 63,158 C 68,154 80,152 92,152 L 108,152 C 120,152 132,154 137,158
           L 140,178 C 138,185 132,190 124,192 L 100,194 L 76,192 C 68,190 62,185 60,178 Z`,
    labelX: 100, labelY: 174,
  },
  {
    id: 'bicep_l_cm',
    label: 'Bíceps Izq',
    // Left upper arm with muscle bulge
    path: `M 50,92 C 53,88 55,87 55,90 L 54,91
           L 52,108 C 50,115 48,120 47,124
           L 42,140 C 41,143 43,143 45,140
           L 50,124 C 52,118 54,112 55,106
           L 56,92 Z`,
    labelX: 48, labelY: 110,
  },
  {
    id: 'bicep_r_cm',
    label: 'Bíceps Der',
    // Right upper arm with muscle bulge
    path: `M 150,92 C 147,88 145,87 145,90 L 146,91
           L 148,108 C 150,115 152,120 153,124
           L 158,140 C 159,143 157,143 155,140
           L 150,124 C 148,118 146,112 145,106
           L 144,92 Z`,
    labelX: 152, labelY: 110,
  },
  {
    id: 'thigh_l_cm',
    label: 'Muslo Izq',
    // Left thigh - tapers from hip to knee
    path: `M 72,196 C 68,194 64,188 62,182
           L 66,220 C 68,240 70,255 73,268
           L 78,280 C 80,282 82,282 84,280
           L 88,268 C 90,255 92,240 93,220
           L 96,196 C 92,198 84,199 78,198 Z`,
    labelX: 79, labelY: 235,
  },
  {
    id: 'thigh_r_cm',
    label: 'Muslo Der',
    // Right thigh
    path: `M 128,196 C 132,194 136,188 138,182
           L 134,220 C 132,240 130,255 127,268
           L 122,280 C 120,282 118,282 116,280
           L 112,268 C 110,255 108,240 107,220
           L 104,196 C 108,198 116,199 122,198 Z`,
    labelX: 121, labelY: 235,
  },
  {
    id: 'calf_l_cm',
    label: 'Gemelo Izq',
    // Left calf with gastrocnemius bulge
    path: `M 74,290 C 72,286 72,284 73,282
           L 83,282 C 85,284 86,286 85,290
           L 84,310 C 83,325 82,335 80,348
           L 79,360 C 78,362 77,362 76,360
           L 74,348 C 72,335 71,325 71,310 Z`,
    labelX: 78, labelY: 320,
  },
  {
    id: 'calf_r_cm',
    label: 'Gemelo Der',
    // Right calf
    path: `M 126,290 C 128,286 128,284 127,282
           L 117,282 C 115,284 114,286 115,290
           L 116,310 C 117,325 118,335 120,348
           L 121,360 C 122,362 123,362 124,360
           L 126,348 C 128,335 129,325 129,310 Z`,
    labelX: 122, labelY: 320,
  },
];

// Full body silhouette — anatomically proportioned
const BODY_OUTLINE = `
  M 100,4
  C 88,4 82,12 82,24
  C 82,36 86,46 92,52
  L 92,55
  C 88,56 86,60 86,65
  L 86,72
  C 86,76 88,78 92,80
  C 80,78 68,76 58,80
  C 46,85 42,92 40,100
  L 36,125
  C 34,135 34,142 36,148
  L 38,152
  C 40,156 42,158 44,156
  L 48,144
  C 50,138 52,130 54,124
  L 56,116
  L 58,122
  C 60,130 61,136 62,142
  L 62,155
  C 62,162 60,170 60,178
  C 60,186 62,192 66,196
  L 66,220
  C 68,242 70,258 74,272
  L 74,280
  C 72,284 70,290 70,298
  L 70,312
  C 70,328 72,340 74,352
  L 76,368
  C 77,378 78,386 80,392
  L 82,398
  C 84,404 86,410 88,412
  C 90,414 92,414 94,412
  C 96,410 96,406 94,402
  L 90,390
  C 86,380 84,370 82,358
  L 80,340
  C 78,328 78,316 78,304
  L 78,292
  C 80,286 82,284 84,282
  L 88,272
  C 90,264 93,248 94,232
  L 96,200
  L 100,198
  L 104,200
  L 106,232
  C 107,248 110,264 112,272
  L 116,282
  C 118,284 120,286 122,292
  L 122,304
  C 122,316 122,328 120,340
  L 118,358
  C 116,370 114,380 110,390
  L 106,402
  C 104,406 104,410 106,412
  C 108,414 110,414 112,412
  C 114,410 116,404 118,398
  L 120,392
  C 122,386 123,378 124,368
  L 126,352
  C 128,340 130,328 130,312
  L 130,298
  C 130,290 128,284 126,280
  L 126,272
  C 130,258 132,242 134,220
  L 134,196
  C 138,192 140,186 140,178
  C 140,170 138,162 138,155
  L 138,142
  C 139,136 140,130 142,122
  L 144,116
  L 146,124
  C 148,130 150,138 152,144
  L 156,156
  C 158,158 160,156 162,152
  L 164,148
  C 166,142 166,135 164,125
  L 160,100
  C 158,92 154,85 142,80
  C 132,76 120,78 108,80
  C 112,78 114,76 114,72
  L 114,65
  C 114,60 112,56 108,55
  L 108,52
  C 114,46 118,36 118,24
  C 118,12 112,4 100,4
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
          viewBox="25 0 150 420"
          className="w-full max-w-[300px] h-auto"
          style={{ filter: 'drop-shadow(0 0 24px rgba(139, 92, 246, 0.12))' }}
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="zoneActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="zoneData" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.32" />
            </linearGradient>
            <filter id="bodyGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="zoneGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#8b5cf6" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>
          </defs>

          {/* Body silhouette */}
          <path
            d={BODY_OUTLINE}
            fill="url(#bodyGrad)"
            stroke="#8b5cf6"
            strokeWidth="1"
            strokeOpacity="0.35"
            strokeLinejoin="round"
            filter="url(#bodyGlow)"
          />

          {/* Center line hint */}
          <line x1="100" y1="80" x2="100" y2="195" stroke="#8b5cf6" strokeOpacity="0.08" strokeWidth="0.5" strokeDasharray="4 4" />

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
                    isActive ? 'url(#zoneActive)'
                    : hasData ? 'url(#zoneData)'
                    : 'rgba(139, 92, 246, 0.06)'
                  }
                  stroke="#8b5cf6"
                  strokeWidth={isActive ? 1.2 : 0.6}
                  strokeOpacity={isActive ? 0.9 : hasData ? 0.4 : 0.15}
                  strokeLinejoin="round"
                  filter={isActive ? 'url(#zoneGlow)' : undefined}
                  className="cursor-pointer"
                  onClick={() => setActiveZone(isActive ? null : zone.id as string)}
                  style={{ pointerEvents: 'all' }}
                />

                {/* Value label */}
                {hasData && (
                  <text
                    x={zone.labelX}
                    y={zone.labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none"
                    fill="white"
                    fontSize={isActive ? '9' : '7'}
                    fontWeight="800"
                    opacity={isActive ? 1 : 0.85}
                  >
                    {value}
                  </text>
                )}
                {!hasData && isActive && (
                  <text
                    x={zone.labelX}
                    y={zone.labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none"
                    fill="white"
                    fontSize="7"
                    fontWeight="700"
                    opacity="0.6"
                  >
                    –
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Quick summary chips */}
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
                  : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
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
