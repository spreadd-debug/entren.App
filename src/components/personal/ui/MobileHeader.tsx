import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  // si true: título grande serif (estilo dashboard); si false: título sm centrado
  large?: boolean;
}

export const MobileHeader: React.FC<Props> = ({ title, onBack, rightSlot, large = false }) => {
  return (
    <header className="px-5 pt-5 pb-3 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/60 hover:bg-white text-[var(--color-ink)] transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          large
            ? <h1 className="font-serif text-3xl text-[var(--color-ink)] leading-tight tracking-tight">{title}</h1>
            : <h2 className="font-serif text-xl text-[var(--color-ink)] leading-none">{title}</h2>
        )}
      </div>
      {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
    </header>
  );
};
