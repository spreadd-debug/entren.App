import React from 'react';
import { CreditCard } from 'lucide-react';
import { PersonalCreditCard } from '../../../../shared/types';
import { gradientCss } from './accountGradient';
import { formatLast4 } from './cardStatement';

interface Props {
  card: Partial<PersonalCreditCard> & {
    name: string;
    color_a?: string | null;
    color_b?: string | null;
    last_4?: string | null;
    bank?: string | null;
    closing_day?: number;
    due_day?: number;
  };
  holderName?: string | null;
  onClick?: () => void;
  variant?: 'hero' | 'compact';
  className?: string;
}

const FALLBACK_GRADIENT: [string, string] = ['#6366F1', '#A855F7'];

export const CreditCardVisual: React.FC<Props> = ({
  card,
  holderName,
  onClick,
  variant = 'hero',
  className = '',
}) => {
  const grad: [string, string] = [
    card.color_a || FALLBACK_GRADIENT[0],
    card.color_b || FALLBACK_GRADIENT[1],
  ];
  const last4 = formatLast4(card.last_4);
  const closingDay = card.closing_day ?? 0;
  const dueDay = card.due_day ?? 0;

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-3xl p-4 text-white shadow-lg overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
        style={{ background: gradientCss(grad), aspectRatio: '16 / 9' }}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-25 blur-2xl" style={{ background: '#fff' }} />
        <div className="relative h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <CreditCard size={18} strokeWidth={1.5} className="opacity-90" />
            {card.bank && <span className="text-[10px] uppercase tracking-[0.18em] opacity-80 font-semibold">{card.bank}</span>}
          </div>
          <div>
            <p className="font-mono tracking-[0.18em] text-base">{last4}</p>
            <p className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">{card.name}</p>
          </div>
        </div>
      </div>
    );
  }

  // hero (16/9, full size)
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[1.75rem] p-5 text-white shadow-2xl overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{ background: gradientCss(grad), aspectRatio: '16 / 10' }}
    >
      {/* Blobs decorativos */}
      <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-30 blur-3xl" style={{ background: '#fff' }} />
      <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: grad[0] }} />

      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <CreditCard size={17} strokeWidth={1.75} />
          </div>
          {card.bank && (
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-90 font-semibold bg-white/15 backdrop-blur rounded-full px-2.5 py-1">
              {card.bank}
            </span>
          )}
        </div>

        <div className="font-mono tracking-[0.22em] text-xl">{last4}</div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider opacity-70">Holder</p>
            <p className="text-sm font-medium truncate">{holderName || card.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider opacity-70">Cierre / Venc</p>
            <p className="text-sm font-medium tabular-nums">
              {String(closingDay).padStart(2, '0')} / {String(dueDay).padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
