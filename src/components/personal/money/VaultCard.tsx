import React from 'react';
import { PersonalAccount } from '../../../../shared/types';
import { useHideBalances } from '../../../hooks/useHideBalances';

// Card "caja fuerte" — para cuentas marcadas is_savings. Estética de caja
// fuerte vintage: verde profundo tipo pintura de safe + accents en bronce,
// remaches en los cuatro vértices, placa central con cerradura y un sello
// "AHORRO" en una esquina.
//
// Independiente del kind: si es ahorro (USD billete intocable, etc.) usa
// SIEMPRE este visual para que se distinga inmediatamente de la billetera
// del día a día.

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

// Verde safe vintage con highlight diagonal sutil
const SAFE_BG =
  'radial-gradient(140% 100% at 30% 15%, #2D5743 0%, #1A3A2E 45%, #0E2418 80%, #061812 100%)';

// Textura noise muy sutil para dar grano de pintura
const PAINT_GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const BRASS = '#C9A04A';
const BRASS_DARK = '#8B6F2A';

// Remaches en las esquinas — círculos con un degrade radial para parecer 3D
const Rivet: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      width: 8, height: 8, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${BRASS} 0%, ${BRASS_DARK} 70%, #4A3C18 100%)`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 230, 160, 0.4)',
      ...style,
    }}
  />
);

export const VaultCard: React.FC<Props> = ({ account, variant = 'hero', onClick, className = '' }) => {
  const { mask } = useHideBalances();
  const balance = Number(account.current_balance) || 0;
  const currencySymbol = CURRENCY_SYMBOL[account.currency] ?? account.currency;
  const isCompact = variant === 'compact';
  const radius = isCompact ? 22 : 28;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{
        background: SAFE_BG,
        borderRadius: radius,
        minHeight: isCompact ? 110 : 200,
        boxShadow:
          '0 18px 40px -12px rgba(10, 30, 20, 0.7), 0 4px 12px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(120, 180, 140, 0.18)',
        padding: isCompact ? 14 : 20,
        color: '#E8DFC4',
      }}
    >
      {/* Grano de pintura */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: PAINT_GRAIN, mixBlendMode: 'overlay', opacity: 0.6 }} />

      {/* Highlight diagonal */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(125deg, rgba(180, 220, 195, 0.10) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* Marco interno bronce — fino doble line para look de caja blindada */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 6,
          borderRadius: radius - 6,
          border: `1px solid ${BRASS}`,
          opacity: 0.55,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 9,
          borderRadius: radius - 9,
          border: `1px solid ${BRASS}`,
          opacity: 0.18,
        }}
      />

      {/* Remaches en los 4 vértices */}
      <Rivet style={{ top: 11, left: 11 }} />
      <Rivet style={{ top: 11, right: 11 }} />
      <Rivet style={{ bottom: 11, left: 11 }} />
      <Rivet style={{ bottom: 11, right: 11 }} />

      {/* Sello "AHORRO" — diagonal, letras spaced, opacity baja para que parezca estampado */}
      {!isCompact && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '38%',
            right: -12,
            transform: 'rotate(-12deg)',
            border: `2px solid ${BRASS}`,
            color: BRASS,
            padding: '4px 14px',
            borderRadius: 4,
            opacity: 0.55,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.35em',
          }}
        >
          AHORRO
        </div>
      )}

      <div className="relative h-full flex flex-col justify-between" style={{ minHeight: isCompact ? 'auto' : 160 }}>
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[9px] uppercase font-semibold"
              style={{ letterSpacing: '0.28em', color: BRASS }}
            >
              Reserva
            </p>
            <p
              className={`font-serif ${isCompact ? 'text-base' : 'text-xl'} mt-0.5 truncate`}
              style={{ color: '#F0E6CB' }}
            >
              {account.name}
            </p>
          </div>
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.2em] px-2 py-0.5 rounded-sm"
            style={{
              background: 'rgba(201, 160, 74, 0.15)',
              border: `1px solid ${BRASS}`,
              color: BRASS,
            }}
          >
            {account.currency}
          </span>
        </div>

        {/* Balance */}
        <div className={isCompact ? 'mt-2' : 'mt-auto'}>
          <p
            className={`font-serif ${isCompact ? 'text-2xl' : 'text-4xl'} leading-none break-words`}
            style={{ color: '#F4EAD0' }}
          >
            <span className="opacity-65 text-sm mr-1">{currencySymbol}</span>
            {mask(fmt(balance))}
          </p>
        </div>
      </div>
    </div>
  );
};
