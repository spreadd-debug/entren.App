import React from 'react';
import { PersonalAccount } from '../../../../shared/types';
import { useHideBalances } from '../../../hooks/useHideBalances';

// Card "certificado de acciones" — para cuentas kind='investment'. Estética
// inspirada en certificados clásicos: borde ornamentado doble, fondo cremoso
// con patrón guilloché sutil, accent verde inversor + dorado, sello/medallón
// central con número de serie. Look formal y "documento financiero".

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

const PARCHMENT = '#F2EAD3';
const INK = '#1F3D2A';        // verde inversor profundo
const GOLD = '#9F7A2A';

// Patrón guilloché simplificado — líneas curvas finas que emulan los grabados
// de los certificados antiguos. Implementado como SVG repeatable.
const GUILLOCHE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%231F3D2A' stroke-width='0.4' fill='none' opacity='0.18'%3E%3Cpath d='M0 30 Q 15 5 30 30 T 60 30'/%3E%3Cpath d='M0 30 Q 15 55 30 30 T 60 30'/%3E%3Cpath d='M30 0 Q 5 15 30 30 T 30 60'/%3E%3Cpath d='M30 0 Q 55 15 30 30 T 30 60'/%3E%3C/g%3E%3C/svg%3E")`;

export const StockCertificateCard: React.FC<Props> = ({ account, variant = 'hero', onClick, className = '' }) => {
  const { mask } = useHideBalances();
  const balance = Number(account.current_balance) || 0;
  const currencySymbol = CURRENCY_SYMBOL[account.currency] ?? account.currency;
  const isCompact = variant === 'compact';
  const radius = isCompact ? 16 : 18; // certificados son más cuadrados, esquinas menos redondeadas

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{
        background: PARCHMENT,
        borderRadius: radius,
        minHeight: isCompact ? 110 : 200,
        boxShadow:
          '0 14px 32px -10px rgba(31, 61, 42, 0.25), 0 3px 8px -2px rgba(0,0,0,0.10)',
        padding: isCompact ? 14 : 20,
        color: INK,
      }}
    >
      {/* Patrón guilloché de fondo */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GUILLOCHE, backgroundSize: '60px 60px' }} />

      {/* Marco ornamentado: doble línea exterior + esquinas decorativas */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 6,
          borderRadius: radius - 6,
          border: `1.5px solid ${INK}`,
          opacity: 0.85,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 10,
          borderRadius: radius - 10,
          border: `0.5px solid ${INK}`,
          opacity: 0.5,
        }}
      />

      {/* Adorno corner — pequeños cuadrados rotados en las esquinas */}
      {!isCompact && (
        <>
          {[
            { top: 5, left: 5 }, { top: 5, right: 5 },
            { bottom: 5, left: 5 }, { bottom: 5, right: 5 },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                ...pos,
                width: 7, height: 7,
                background: GOLD,
                transform: 'rotate(45deg)',
                opacity: 0.7,
              }}
            />
          ))}
        </>
      )}

      {/* Medallón central inferior con "SHARES" — sello tipo cuño */}
      {!isCompact && (
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: 22, right: 22,
            width: 50, height: 50, borderRadius: '50%',
            border: `1.5px solid ${GOLD}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: GOLD,
            fontSize: 8, fontWeight: 800,
            letterSpacing: '0.18em',
            textAlign: 'center',
            lineHeight: 1.1,
            opacity: 0.85,
          }}
        >
          INVES<br/>TMENT
        </div>
      )}

      <div className="relative h-full flex flex-col justify-between" style={{ minHeight: isCompact ? 'auto' : 160 }}>
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[9px] uppercase font-semibold"
              style={{ letterSpacing: '0.32em', color: GOLD }}
            >
              Certificado
            </p>
            <p className={`font-serif ${isCompact ? 'text-base' : 'text-xl'} mt-0.5 truncate`} style={{ color: INK }}>
              {account.name}
            </p>
          </div>
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.18em] px-2 py-0.5 rounded-sm"
            style={{ border: `1px solid ${INK}`, color: INK, background: 'rgba(31, 61, 42, 0.05)' }}
          >
            {account.currency}
          </span>
        </div>

        <div className={isCompact ? 'mt-2' : 'mt-auto'}>
          <p
            className={`font-serif ${isCompact ? 'text-2xl' : 'text-4xl'} leading-none break-words`}
            style={{ color: INK }}
          >
            <span className="opacity-55 text-sm mr-1">{currencySymbol}</span>
            {mask(fmt(balance))}
          </p>
        </div>
      </div>
    </div>
  );
};
