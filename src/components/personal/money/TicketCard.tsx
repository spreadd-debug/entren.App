import React from 'react';
import { PersonalAccount } from '../../../../shared/types';
import { useHideBalances } from '../../../hooks/useHideBalances';

// Card "ticket / recibo digital" — para wallets virtuales (Mercado Pago, Ualá,
// Brubank, etc.). Estética fintech moderna: fondo claro, perforaciones
// laterales como ticket de cine, divisor dasheado horizontal, accent block
// con el color de la marca, micro-grilla tipo QR en una esquina.

interface Props {
  account: PersonalAccount;
  variant?: 'hero' | 'compact';
  onClick?: () => void;
  className?: string;
  // Color principal — si la cuenta no tiene color_a definido, usamos el azul MP.
  brandColor?: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { ARS: '$', USD: 'US$', EUR: '€' };
function fmt(n: number): string {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Mini grilla 5x5 estilo QR — decorativo, no es un QR real.
const QR_GRID = (
  <svg viewBox="0 0 25 25" className="w-full h-full">
    {[
      [1,0,1,1,0],
      [0,1,1,0,1],
      [1,1,0,1,1],
      [1,0,1,0,0],
      [0,1,0,1,1],
    ].map((row, y) =>
      row.map((cell, x) =>
        cell ? <rect key={`${x}-${y}`} x={x*5} y={y*5} width="5" height="5" fill="currentColor" /> : null
      )
    )}
  </svg>
);

export const TicketCard: React.FC<Props> = ({ account, variant = 'hero', onClick, className = '', brandColor }) => {
  const { mask } = useHideBalances();
  const balance = Number(account.current_balance) || 0;
  const currencySymbol = CURRENCY_SYMBOL[account.currency] ?? account.currency;
  const isCompact = variant === 'compact';
  const accent = brandColor || account.color_a || '#009EE3'; // MP blue por default

  return (
    <div
      onClick={onClick}
      className={`relative ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{
        // El fondo del ticket es papel/blanco con un sutil tint del brand color
        background: '#FAFBFD',
        borderRadius: isCompact ? 18 : 22,
        minHeight: isCompact ? 110 : 200,
        // Sombra "papel" suave + ligera definición de borde
        boxShadow:
          '0 12px 28px -10px rgba(0, 50, 120, 0.18), 0 2px 6px -2px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0, 50, 120, 0.06)',
        padding: isCompact ? 14 : 20,
        color: '#0F1F35',
        overflow: 'hidden',
      }}
    >
      {/* Perforaciones laterales — círculos a izquierda y derecha como ticket de cine.
          Posicionados en la línea del divisor horizontal. */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: -6,
          top: isCompact ? '60%' : '58%',
          width: 12, height: 12, borderRadius: '50%',
          background: '#F1F4F9',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          right: -6,
          top: isCompact ? '60%' : '58%',
          width: 12, height: 12, borderRadius: '50%',
          background: '#F1F4F9',
          boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.1)',
        }}
      />

      {/* Divisor dasheado entre las dos perforaciones, estilo línea para arrancar el ticket */}
      <div
        className="absolute left-3 right-3 pointer-events-none"
        style={{
          top: isCompact ? 'calc(60% + 5px)' : 'calc(58% + 5px)',
          height: 1,
          backgroundImage:
            'linear-gradient(to right, rgba(0, 50, 120, 0.25) 50%, transparent 50%)',
          backgroundSize: '8px 1px',
          backgroundRepeat: 'repeat-x',
        }}
      />

      {/* Accent diagonal arriba-izquierda con el color del brand */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0, left: 0,
          width: isCompact ? 60 : 90,
          height: isCompact ? 60 : 90,
          background: accent,
          opacity: 0.92,
          borderBottomRightRadius: '100%',
        }}
      />

      {/* QR mini en esquina inferior-derecha del bloque "stub" */}
      {!isCompact && (
        <div
          className="absolute pointer-events-none"
          style={{ bottom: 14, right: 18, width: 36, height: 36, color: accent, opacity: 0.85 }}
        >
          {QR_GRID}
        </div>
      )}

      <div className="relative h-full flex flex-col justify-between" style={{ minHeight: isCompact ? 'auto' : 160 }}>
        {/* Top: kind chip + currency */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <p
              className="text-[9px] uppercase font-semibold"
              style={{ letterSpacing: '0.22em', color: 'white' }}
            >
              Wallet
            </p>
            <p
              className={`font-serif ${isCompact ? 'text-base' : 'text-xl'} mt-0.5 truncate`}
              style={{ color: '#0F1F35' }}
            >
              {account.name}
            </p>
          </div>
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.18em] px-2 py-0.5 rounded-md"
            style={{
              background: accent,
              color: '#FFF',
            }}
          >
            {account.currency}
          </span>
        </div>

        {/* Balance: abajo del divisor (en la sección "stub" del ticket) */}
        <div className={isCompact ? 'mt-2' : 'mt-auto'}>
          <p
            className={`font-serif ${isCompact ? 'text-2xl' : 'text-4xl'} leading-none break-words`}
            style={{ color: '#0F1F35' }}
          >
            <span className="opacity-50 text-sm mr-1">{currencySymbol}</span>
            {mask(fmt(balance))}
          </p>
        </div>
      </div>
    </div>
  );
};
