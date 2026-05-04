import React from 'react';
import { Plus } from 'lucide-react';

interface Props {
  onClick: () => void;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

export const Fab: React.FC<Props> = ({ onClick, ariaLabel = 'Agregar', icon }) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="absolute right-5 bottom-6 z-30 w-14 h-14 rounded-full bg-[var(--color-ink)] text-white shadow-lg shadow-black/20 flex items-center justify-center active:scale-95 transition-transform"
    >
      {icon ?? <Plus size={24} strokeWidth={2} />}
    </button>
  );
};
