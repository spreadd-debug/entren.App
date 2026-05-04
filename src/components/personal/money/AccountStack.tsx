import React, { useRef, useState, useEffect } from 'react';
import { PersonalAccount } from '../../../../shared/types';
import { AccountCard } from './AccountCard';

interface Props {
  accounts: PersonalAccount[];
  onSelect?: (account: PersonalAccount) => void;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}

// Carrusel horizontal con snap. Cada card ocupa ~85% del ancho del container,
// dejando un peek a la derecha de la próxima — patrón mobile estándar y nativo
// (no agrega lib). Dot indicators abajo. Track scroll para activeIndex.
export const AccountStack: React.FC<Props> = ({ accounts, onSelect, activeIndex, onActiveChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [internalActive, setInternalActive] = useState(0);
  const active = activeIndex ?? internalActive;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handler = () => {
      // El index activo es el card más cercano al centro del viewport.
      const rects = Array.from(el.children).map(c => (c as HTMLElement).getBoundingClientRect());
      const trackRect = el.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      let nearest = 0;
      let nearestDist = Infinity;
      rects.forEach((r, i) => {
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - trackCenter);
        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
      });
      if (nearest !== active) {
        setInternalActive(nearest);
        onActiveChange?.(nearest);
      }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [active, onActiveChange]);

  if (accounts.length === 0) return null;

  return (
    <div>
      <div
        ref={trackRef}
        className="overflow-x-auto -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory flex gap-3"
        style={{ scrollPaddingInline: '20px' }}
      >
        {accounts.map(a => (
          <div key={a.id} className="snap-center shrink-0 w-[85%] first:ml-0 last:mr-5">
            <AccountCard account={a} variant="hero" onClick={() => onSelect?.(a)} />
          </div>
        ))}
      </div>

      {accounts.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {accounts.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-[var(--color-ink)]' : 'w-1.5 bg-[var(--color-ink)]/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
