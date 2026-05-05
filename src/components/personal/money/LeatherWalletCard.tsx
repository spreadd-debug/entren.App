import React from 'react';
import { PersonalAccount } from '../../../../shared/types';
import { useHideBalances } from '../../../hooks/useHideBalances';

// Card "billetera de cuero" — para cuentas de efectivo. Estética skeuomorphic
// premium tipo billetera Louis Vuitton: tonos camel/marrón, costuras visibles,
// línea de doblez sutil, textura granulada, sombras profundas.
//
// Sin gradients fintech genéricos — la idea es que parezca un objeto físico real.

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

// Paleta de cuero — rich camel/cognac con highlight diagonal
const LEATHER_BG =
  'radial-gradient(120% 90% at 25% 15%, #C18B5E 0%, #9A6B45 35%, #6E4828 70%, #3F2A18 100%)';

// Textura granulada via SVG noise embebido como data URI — sin pedidos extra al server
const GRAIN_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.13 0 0 0 0 0.07 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const LeatherWalletCard: React.FC<Props> = ({ account, variant = 'hero', onClick, className = '' }) => {
  const { mask } = useHideBalances();
  const balance = Number(account.current_balance) || 0;
  const currencySymbol = CURRENCY_SYMBOL[account.currency] ?? account.currency;
  const isCompact = variant === 'compact';

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{
        background: LEATHER_BG,
        borderRadius: isCompact ? 22 : 28,
        minHeight: isCompact ? 110 : 200,
        // Sombra externa profunda + borde sutil para dar edge físico
        boxShadow:
          '0 18px 40px -12px rgba(80, 40, 10, 0.55), 0 4px 12px -4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255, 220, 180, 0.18)',
        padding: isCompact ? 14 : 20,
        color: '#F5E6D3',
      }}
    >
      {/* Capa de textura granulada de cuero, suave (mix-blend-mode multiply para integrar) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: GRAIN_TEXTURE,
          mixBlendMode: 'overlay',
          opacity: 0.85,
        }}
      />

      {/* Highlight diagonal sutil para dar el reflejo del cuero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,235,200,0.18) 0%, rgba(255,235,200,0) 35%, rgba(0,0,0,0.12) 100%)',
        }}
      />

      {/* Costura — borde dasheado inset que parece la puntada del cuero */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 8,
          borderRadius: isCompact ? 16 : 22,
          border: '1px dashed rgba(245, 230, 211, 0.35)',
        }}
      />

      {/* Línea de doblez horizontal — sólo en hero, da la sensación de billetera plegada */}
      {!isCompact && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '52%',
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(60, 30, 15, 0.55) 20%, rgba(60, 30, 15, 0.55) 80%, transparent)',
            boxShadow: '0 1px 0 rgba(255, 220, 180, 0.12)',
          }}
        />
      )}

      <div className="relative h-full flex flex-col justify-between" style={{ minHeight: isCompact ? 'auto' : 160 }}>
        {/* Top: kind label + currency */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[9px] uppercase font-semibold opacity-80"
              style={{ letterSpacing: '0.25em' }}
            >
              {account.is_savings ? 'Ahorro' : 'Efectivo'}
            </p>
            <p className={`font-serif ${isCompact ? 'text-base' : 'text-xl'} mt-0.5 truncate`} style={{ color: '#F8EBD5' }}>
              {account.name}
            </p>
          </div>
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.2em] px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(245, 230, 211, 0.12)',
              border: '1px solid rgba(245, 230, 211, 0.25)',
              color: '#F8EBD5',
            }}
          >
            {account.currency}
          </span>
        </div>

        {/* Balance — abajo del fold para que parezca el dinero "guardado adentro" */}
        <div className={isCompact ? 'mt-2' : 'mt-auto'}>
          <p
            className={`font-serif ${isCompact ? 'text-2xl' : 'text-4xl'} leading-none break-words`}
            style={{ color: '#FAF1DD' }}
          >
            <span className="opacity-70 text-sm mr-1">{currencySymbol}</span>
            {mask(fmt(balance))}
          </p>
        </div>
      </div>
    </div>
  );
};
