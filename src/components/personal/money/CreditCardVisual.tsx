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
    image_url?: string | null;
  };
  holderName?: string | null;
  onClick?: () => void;
  variant?: 'hero' | 'compact';
  className?: string;
  // Etiqueta opcional arriba a la derecha (ej. "ARS" o "USD") — solo cuando
  // queremos identificar la moneda de un statement particular.
  badge?: string | null;
}

const FALLBACK_GRADIENT: [string, string] = ['#6366F1', '#A855F7'];

export const CreditCardVisual: React.FC<Props> = ({
  card,
  holderName,
  onClick,
  variant = 'hero',
  className = '',
  badge,
}) => {
  const grad: [string, string] = [
    card.color_a || FALLBACK_GRADIENT[0],
    card.color_b || FALLBACK_GRADIENT[1],
  ];
  const last4 = formatLast4(card.last_4);
  const closingDay = card.closing_day ?? 0;
  const dueDay = card.due_day ?? 0;

  const hasImage = !!card.image_url;
  const bgStyle: React.CSSProperties = hasImage
    ? { backgroundImage: `url(${card.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: gradientCss(grad) };

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-3xl p-4 text-white shadow-lg overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
        style={{ ...bgStyle, aspectRatio: '16 / 9' }}
      >
        {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />}
        {!hasImage && (
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-25 blur-2xl" style={{ background: '#fff' }} />
        )}
        <div className="relative h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <CreditCard size={18} strokeWidth={1.5} className="opacity-90" />
            {card.bank && <span className="text-[10px] uppercase tracking-[0.18em] opacity-90 font-semibold drop-shadow">{card.bank}</span>}
          </div>
          <div>
            <p className="font-mono tracking-[0.18em] text-base drop-shadow">{last4}</p>
            <p className="text-[10px] uppercase tracking-wider opacity-90 mt-0.5 drop-shadow">{card.name}</p>
          </div>
        </div>
      </div>
    );
  }

  // hero (16/10, full size)
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[1.75rem] p-5 text-white shadow-2xl overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{ ...bgStyle, aspectRatio: '16 / 10' }}
    >
      {/* Si hay imagen real: overlay sutil para legibilidad del texto.
          Si no: blobs decorativos sobre el gradient. */}
      {hasImage ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      ) : (
        <>
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-30 blur-3xl" style={{ background: '#fff' }} />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: grad[0] }} />
        </>
      )}

      <div className={`relative h-full flex flex-col justify-between ${hasImage ? '[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <CreditCard size={17} strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-90 font-semibold bg-white/15 backdrop-blur rounded-full px-2.5 py-1">
                {badge}
              </span>
            )}
            {card.bank && (
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-90 font-semibold bg-white/15 backdrop-blur rounded-full px-2.5 py-1">
                {card.bank}
              </span>
            )}
          </div>
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
