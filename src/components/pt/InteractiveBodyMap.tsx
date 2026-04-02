import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ClientMeasurement } from '../../../shared/types';

interface BodyZone {
  id: keyof ClientMeasurement;
  label: string;
  // Simple rect bands that get clipped to body shape
  y: number;
  height: number;
  // For L/R zones, specify side
  side?: 'left' | 'right';
  labelX: number;
  labelY: number;
}

// ─── Body silhouette path (200×420 viewBox, centered at x=100) ──────────────
const BODY_OUTLINE = `
  M 100,8
  C 89,8 84,16 84,26
  C 84,36 88,44 93,50
  L 93,54
  C 90,55 88,58 88,63
  L 88,70
  C 86,74 90,77 94,78

  C 82,78 68,78 58,82
  C 46,88 42,96 40,106
  L 36,130
  C 34,138 35,144 38,148
  C 40,152 43,150 46,146
  L 52,132
  C 54,126 56,118 58,110

  L 60,118
  C 61,128 62,138 62,148
  L 62,162
  C 60,172 60,180 62,190
  L 64,198

  L 66,220
  C 68,242 70,260 74,278
  C 72,284 70,292 70,300
  L 70,320
  C 70,334 72,346 76,362
  C 78,374 80,386 82,396

  L 86,408
  C 88,412 92,412 94,408
  C 96,404 94,400 92,396
  L 86,380
  C 82,366 80,352 80,338
  L 80,310
  C 80,298 82,290 84,284
  L 88,274
  C 92,258 94,242 96,220
  L 98,200

  L 100,198

  L 102,200
  L 104,220
  C 106,242 108,258 112,274
  L 116,284
  C 118,290 120,298 120,310
  L 120,338
  C 120,352 118,366 114,380
  L 108,396
  C 106,400 104,404 106,408
  C 108,412 112,412 114,408

  L 118,396
  C 120,386 122,374 124,362
  C 128,346 130,334 130,320
  L 130,300
  C 130,292 128,284 126,278
  C 130,260 132,242 134,220

  L 136,198
  C 138,190 140,180 138,162
  L 138,148
  C 139,138 140,128 142,118
  L 142,110

  C 144,118 146,126 148,132
  L 154,146
  C 157,150 160,152 162,148
  C 165,144 166,138 164,130
  L 160,106
  C 158,96 154,88 142,82
  C 132,78 118,78 106,78

  C 110,77 114,74 112,70
  L 112,63
  C 112,58 110,55 107,54
  L 107,50
  C 112,44 116,36 116,26
  C 116,16 111,8 100,8
  Z
`;

// Zone definitions using horizontal bands (clipped to body)
const BODY_ZONES: BodyZone[] = [
  { id: 'neck_cm', label: 'Cuello', y: 54, height: 24, labelX: 100, labelY: 66 },
  { id: 'shoulders_cm', label: 'Hombros', y: 78, height: 16, labelX: 100, labelY: 86 },
  { id: 'chest_cm', label: 'Pecho', y: 94, height: 30, labelX: 100, labelY: 109 },
  { id: 'waist_cm', label: 'Cintura', y: 124, height: 28, labelX: 100, labelY: 138 },
  { id: 'hips_cm', label: 'Cadera', y: 152, height: 46, labelX: 100, labelY: 175 },

  // Arms — use side-limited rects
  { id: 'bicep_l_cm', label: 'Bíc. Izq', y: 88, height: 52, side: 'left', labelX: 48, labelY: 114 },
  { id: 'bicep_r_cm', label: 'Bíc. Der', y: 88, height: 52, side: 'right', labelX: 152, labelY: 114 },

  // Legs — left
  { id: 'thigh_l_cm', label: 'Muslo Izq', y: 198, height: 82, side: 'left', labelX: 82, labelY: 240 },
  { id: 'thigh_r_cm', label: 'Muslo Der', y: 198, height: 82, side: 'right', labelX: 118, labelY: 240 },

  // Calves
  { id: 'calf_l_cm', label: 'Gem. Izq', y: 290, height: 72, side: 'left', labelX: 76, labelY: 326 },
  { id: 'calf_r_cm', label: 'Gem. Der', y: 290, height: 72, side: 'right', labelX: 124, labelY: 326 },
];

function getZoneRect(zone: BodyZone): { x: number; y: number; width: number; height: number } {
  if (zone.side === 'left') return { x: 0, y: zone.y, width: 100, height: zone.height };
  if (zone.side === 'right') return { x: 100, y: zone.y, width: 100, height: zone.height };
  // For torso zones, exclude arm area
  return { x: 55, y: zone.y, width: 90, height: zone.height };
}

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
          style={{ filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.1))' }}
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="zoneActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="zoneData" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.25" />
            </linearGradient>

            {/* Clip to body silhouette */}
            <clipPath id="bodyClip">
              <path d={BODY_OUTLINE} />
            </clipPath>

            <filter id="zoneGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#8b5cf6" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>
          </defs>

          {/* Body silhouette background */}
          <path
            d={BODY_OUTLINE}
            fill="url(#bodyGrad)"
            stroke="#8b5cf6"
            strokeWidth="1.2"
            strokeOpacity="0.3"
            strokeLinejoin="round"
          />

          {/* Zones clipped to body */}
          <g clipPath="url(#bodyClip)">
            {BODY_ZONES.map((zone) => {
              const isActive = activeZone === zone.id;
              const value = getValue(zone.id);
              const hasData = value != null;
              const rect = getZoneRect(zone);

              return (
                <rect
                  key={zone.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={
                    isActive ? 'url(#zoneActive)'
                    : hasData ? 'url(#zoneData)'
                    : 'rgba(139, 92, 246, 0.04)'
                  }
                  stroke="#8b5cf6"
                  strokeWidth={isActive ? 1 : 0.4}
                  strokeOpacity={isActive ? 0.8 : hasData ? 0.3 : 0.1}
                  filter={isActive ? 'url(#zoneGlow)' : undefined}
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => setActiveZone(isActive ? null : zone.id as string)}
                  style={{ pointerEvents: 'all' }}
                />
              );
            })}
          </g>

          {/* Value labels (on top, not clipped) */}
          {BODY_ZONES.map((zone) => {
            const isActive = activeZone === zone.id;
            const value = getValue(zone.id);

            if (value == null) return null;
            return (
              <text
                key={`label-${zone.id}`}
                x={zone.labelX}
                y={zone.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none"
                fill="white"
                fontSize={isActive ? '10' : '8'}
                fontWeight="800"
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  opacity: isActive ? 1 : 0.9,
                }}
              >
                {value}
              </text>
            );
          })}

          {/* Body outline on top for clean edge */}
          <path
            d={BODY_OUTLINE}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="1"
            strokeOpacity="0.25"
            strokeLinejoin="round"
          />
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
