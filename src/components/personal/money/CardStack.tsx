import React, { useState } from 'react';
import { PersonalCreditCard } from '../../../../shared/types';
import { CreditCardVisual } from './CreditCardVisual';

interface Props {
  cards: PersonalCreditCard[];
  holderName?: string | null;
  onSelect?: (card: PersonalCreditCard) => void;
}

// Stack 3D: la card activa al frente, las otras detrás con offset vertical y
// scale, rotadas levemente. Tap en una card de atrás la trae al frente.
// Si solo hay 1 card, se muestra plana.
export const CardStack: React.FC<Props> = ({ cards, holderName, onSelect }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (cards.length === 0) return null;

  // Reordenar: activa al final del array (renderea encima por z-index natural).
  const reordered = cards.map((c, i) => ({
    card: c,
    relativeIdx: (i - activeIdx + cards.length) % cards.length,
  })).sort((a, b) => b.relativeIdx - a.relativeIdx);

  // El stack ocupa altura del card hero (~aspect 16/10) + un margen extra para
  // las cards de atrás peeking debajo.
  const cardCount = Math.min(cards.length, 3);
  const stackPaddingBottom = (cardCount - 1) * 18;

  return (
    <div className="relative" style={{ paddingBottom: stackPaddingBottom }}>
      {reordered.map(({ card, relativeIdx }) => {
        const isActive = relativeIdx === 0;
        // relativeIdx 0 = activa (frente, sin offset).
        // relativeIdx 1, 2 = detrás (offset abajo + scale + opacity).
        const offsetY = relativeIdx * 18;
        const scale = 1 - relativeIdx * 0.04;
        const opacity = relativeIdx === 0 ? 1 : 0.85 - relativeIdx * 0.1;

        return (
          <div
            key={card.id}
            onClick={() => {
              if (isActive) onSelect?.(card);
              else setActiveIdx(cards.findIndex(c => c.id === card.id));
            }}
            className="absolute inset-x-0 top-0 transition-all duration-300 ease-out cursor-pointer"
            style={{
              transform: `translateY(${offsetY}px) scale(${scale})`,
              opacity,
              zIndex: 10 - relativeIdx,
            }}
          >
            <CreditCardVisual card={card} holderName={holderName} variant="hero" />
          </div>
        );
      })}

      {/* Spacer para mantener la altura del container — el primer hijo es absolute */}
      <div className="invisible">
        <CreditCardVisual card={cards[0]} variant="hero" />
      </div>

      {cards.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 flex gap-1.5">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-5 bg-[var(--color-ink)]' : 'w-1.5 bg-[var(--color-ink)]/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
