import React from 'react';
import { Wallet, Banknote, Landmark, TrendingUp, CircleDollarSign } from 'lucide-react';
import { PersonalAccount } from '../../../../shared/types';
import { accountGradient, gradientCss } from './accountGradient';

interface Props {
  account: PersonalAccount;
  onClick?: () => void;
  // Variantes visuales
  variant?: 'hero' | 'compact' | 'mini';
  className?: string;
}

const KIND_ICONS: Record<string, React.FC<any>> = {
  cash:       Banknote,
  bank:       Landmark,
  wallet:     Wallet,
  investment: TrendingUp,
  other:      CircleDollarSign,
};

const CURRENCY_LABELS: Record<string, string> = {
  ARS: '$',
  USD: 'US$',
  EUR: '€',
};

function fmt(n: number): string {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const AccountCard: React.FC<Props> = ({ account, onClick, variant = 'hero', className = '' }) => {
  const grad = accountGradient(account);
  const Icon = KIND_ICONS[account.kind] ?? CircleDollarSign;
  const currencySymbol = CURRENCY_LABELS[account.currency] ?? account.currency;
  const balance = Number(account.current_balance) || 0;

  if (variant === 'mini') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-white shadow-md active:scale-[0.98] transition-transform ${className}`}
        style={{ background: gradientCss(grad) }}
      >
        <Icon size={14} strokeWidth={2} className="opacity-90 shrink-0" />
        <div className="text-left leading-tight">
          <p className="text-[10px] uppercase tracking-wider opacity-80">{account.name}</p>
          <p className="text-sm font-semibold whitespace-nowrap">
            <span className="opacity-70 mr-0.5 text-[11px]">{account.currency}</span>
            {fmt(balance)}
          </p>
        </div>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-3xl p-4 text-white shadow-lg overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
        style={{ background: gradientCss(grad) }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl" style={{ background: '#fff' }} />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Icon size={18} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider opacity-80 truncate">{account.name}</p>
            <p className="font-serif text-2xl leading-none mt-0.5 truncate">
              <span className="opacity-70 text-base mr-1">{currencySymbol}</span>
              {fmt(balance)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // hero
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[2rem] p-6 text-white shadow-2xl overflow-hidden aspect-[16/10] ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{ background: gradientCss(grad) }}
    >
      {/* Blobs decorativos */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-30 blur-3xl" style={{ background: '#fff' }} />
      <div className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full opacity-20 blur-3xl" style={{ background: grad[0] }} />

      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Icon size={20} strokeWidth={1.75} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-semibold">
            {account.kind}
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">{account.name}</p>
          <p className="font-serif text-[2.4rem] leading-none mt-1">
            <span className="opacity-70 text-lg mr-1.5">{currencySymbol}</span>
            {fmt(balance)}
          </p>
        </div>
      </div>
    </div>
  );
};
