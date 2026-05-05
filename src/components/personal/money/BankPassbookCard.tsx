import React from 'react';
import { PersonalAccount } from '../../../../shared/types';
import { useHideBalances } from '../../../hooks/useHideBalances';

// Card "libreta bancaria" — para cuentas kind='bank'. Estética parchment +
// lomo: papel cremoso con líneas de ledger sutiles, lomo más oscuro a la
// izquierda como si fuera la encuadernación de la libreta, navy/burgundy
// para el texto. Look clásico de banco tradicional.

interface Props {
  account: PersonalAccount;
  variant?: 'hero' | 'compact';
  onClick?: () => void;
  className?: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { ARS: '$', USD: 'US$', EUR: '€' };
function fmt(n: number): string {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const PARCHMENT = '#F5EFE0';
const PARCHMENT_DARK = '#EDE3CC';
const NAVY = '#1F2D4D';
const ACCENT = '#7A2030'; // burgundy para detalles

// Textura papel sutil
const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.15 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const BankPassbookCard: React.FC<Props> = ({ account, variant = 'hero', onClick, className = '' }) => {
  const { mask } = useHideBalances();
  const balance = Number(account.current_balance) || 0;
  const currencySymbol = CURRENCY_SYMBOL[account.currency] ?? account.currency;
  const isCompact = variant === 'compact';
  const radius = isCompact ? 18 : 22;
  const spineWidth = isCompact ? 22 : 32;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{
        background: PARCHMENT,
        borderRadius: radius,
        minHeight: isCompact ? 110 : 200,
        boxShadow:
          '0 14px 32px -10px rgba(31, 45, 77, 0.25), 0 3px 8px -2px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(31, 45, 77, 0.08)',
        color: NAVY,
      }}
    >
      {/* Lomo — banda vertical más oscura a la izquierda con doble línea de stitching */}
      <div
        className="absolute top-0 bottom-0 left-0 pointer-events-none"
        style={{
          width: spineWidth,
          background: `linear-gradient(90deg, ${NAVY} 0%, #2A3A5E 60%, rgba(42, 58, 94, 0) 100%)`,
        }}
      />
      <div
        className="absolute top-2 bottom-2 pointer-events-none"
        style={{
          left: spineWidth - 5,
          width: 1,
          borderLeft: `1px dashed ${ACCENT}`,
          opacity: 0.4,
        }}
      />

      {/* Papel sutil */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: PAPER_TEXTURE, opacity: 0.7 }} />

      {/* Líneas de ledger horizontales sutiles — como hojas rayadas */}
      {!isCompact && (
        <>
          {[0.42, 0.55, 0.68, 0.81].map(t => (
            <div
              key={t}
              className="absolute pointer-events-none"
              style={{
                left: spineWidth + 14,
                right: 16,
                top: `${t * 100}%`,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${NAVY}22 20%, ${NAVY}22 80%, transparent)`,
              }}
            />
          ))}
        </>
      )}

      {/* Sello redondo decorativo arriba-derecha — como el sello del banco */}
      {!isCompact && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 14, right: 14,
            width: 42, height: 42, borderRadius: '50%',
            border: `1.5px solid ${ACCENT}`,
            opacity: 0.55,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: ACCENT,
            fontSize: 7, fontWeight: 800,
            letterSpacing: '0.2em',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          CTA<br/>BCO
        </div>
      )}

      {/* Contenido */}
      <div
        className="relative h-full flex flex-col justify-between"
        style={{
          paddingLeft: spineWidth + 14,
          paddingRight: isCompact ? 14 : 20,
          paddingTop: isCompact ? 14 : 20,
          paddingBottom: isCompact ? 14 : 20,
          minHeight: isCompact ? 'auto' : 160,
        }}
      >
        <div>
          <p
            className="text-[9px] uppercase font-semibold"
            style={{ letterSpacing: '0.28em', color: ACCENT }}
          >
            Libreta · Banco
          </p>
          <p className={`font-serif ${isCompact ? 'text-base' : 'text-xl'} mt-0.5 truncate`} style={{ color: NAVY }}>
            {account.name}
          </p>
        </div>

        <div className={isCompact ? 'mt-2 flex items-end justify-between gap-3' : 'mt-auto flex items-end justify-between gap-3'}>
          <p
            className={`font-serif ${isCompact ? 'text-2xl' : 'text-4xl'} leading-none break-words`}
            style={{ color: NAVY }}
          >
            <span className="opacity-55 text-sm mr-1">{currencySymbol}</span>
            {mask(fmt(balance))}
          </p>
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.2em] px-2 py-0.5 rounded-sm shrink-0"
            style={{ border: `1px solid ${NAVY}`, color: NAVY }}
          >
            {account.currency}
          </span>
        </div>
      </div>
    </div>
  );
};
