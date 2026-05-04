import React, { useMemo } from 'react';
import { PillChip } from './PillChip';

interface Props {
  // ISO YYYY-MM-DD
  selected: string;
  onSelect: (date: string) => void;
  // cuántos días hacia atrás incluir (default 14)
  daysBack?: number;
  // mostrar etiquetas tipo "Today" / "Yesterday"
  withRelativeLabels?: boolean;
}

const MONTHS_SHORT_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DateStrip: React.FC<Props> = ({ selected, onSelect, daysBack = 14, withRelativeLabels = true }) => {
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list: { iso: string; label: string; sub?: string }[] = [];
    for (let i = daysBack; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toIsoDate(d);
      let label = String(d.getDate());
      let sub: string | undefined;
      if (withRelativeLabels && i === 0)      { label = 'Hoy'; }
      else if (withRelativeLabels && i === 1) { label = 'Ayer'; }
      else { sub = MONTHS_SHORT_ES[d.getMonth()]; }
      list.push({ iso, label, sub });
    }
    return list;
  }, [daysBack, withRelativeLabels]);

  return (
    <div className="overflow-x-auto px-5 -mx-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-2 px-5 w-max">
        {days.map(d => {
          const isSelected = d.iso === selected;
          return (
            <PillChip
              key={d.iso}
              variant={isSelected ? 'selected' : 'outline'}
              onClick={() => onSelect(d.iso)}
            >
              {d.sub ? <span className="opacity-60 mr-1 text-[11px]">{d.sub}</span> : null}
              {d.label}
            </PillChip>
          );
        })}
      </div>
    </div>
  );
};
