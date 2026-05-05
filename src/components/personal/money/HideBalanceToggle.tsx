import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useHideBalances } from '../../../hooks/useHideBalances';

// Botón "ojito" estilo apps de banco — toggle global del modo privacidad.
// Pensado para usar en el rightSlot del MobileHeader.
export const HideBalanceToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { hidden, toggle } = useHideBalances();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-9 h-9 rounded-full flex items-center justify-center bg-white/60 hover:bg-white text-[var(--color-ink)] transition-colors ${className}`}
      aria-label={hidden ? 'Mostrar balances' : 'Ocultar balances'}
      aria-pressed={hidden}
    >
      {hidden ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
    </button>
  );
};
