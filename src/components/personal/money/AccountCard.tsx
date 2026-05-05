import React from 'react';
import { Wallet, Banknote, Landmark, TrendingUp, CircleDollarSign } from 'lucide-react';
import { PersonalAccount } from '../../../../shared/types';
import { accountGradient, gradientCss } from './accountGradient';
import { ACCOUNT_KIND_LABELS } from './accountKindLabels';
import { LeatherWalletCard } from './LeatherWalletCard';
import { TicketCard } from './TicketCard';
import { useHideBalances } from '../../../hooks/useHideBalances';

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
  // Hooks SIEMPRE al tope — el dispatch va después.
  const { mask } = useHideBalances();
  const grad = accountGradient(account);
  const Icon = KIND_ICONS[account.kind] ?? CircleDollarSign;
  const currencySymbol = CURRENCY_LABELS[account.currency] ?? account.currency;
  const balance = Number(account.current_balance) || 0;

  // Dispatch skeuomorphic por kind: cash → billetera de cuero,
  // wallet → ticket digital. Las otras (bank/investment/other) caen al
  // diseño gradient genérico de abajo (queda igual que antes).
  if (account.kind === 'cash' && variant !== 'mini') {
    return <LeatherWalletCard account={account} variant={variant} onClick={onClick} className={className} />;
  }
  if (account.kind === 'wallet' && variant !== 'mini') {
    return <TicketCard account={account} variant={variant} onClick={onClick} className={className} />;
  }

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
            {mask(fmt(balance))}
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
              {mask(fmt(balance))}
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
      className={`relative rounded-[2rem] p-5 text-white shadow-2xl overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      style={{ background: gradientCss(grad), minHeight: 200 }}
    >
      {/* Blobs decorativos */}
      <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-30 blur-3xl" style={{ background: '#fff' }} />
      <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: grad[0] }} />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Icon size={17} strokeWidth={1.75} />
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] opacity-80 font-semibold">
              {ACCOUNT_KIND_LABELS[account.kind]}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-semibold bg-white/15 backdrop-blur rounded-full px-2.5 py-1">
            {account.currency}
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider opacity-80 truncate">{account.name}</p>
          <p className="font-serif text-4xl leading-none mt-1.5 break-words">
            <span className="opacity-70 text-base mr-1">{currencySymbol}</span>
            {mask(fmt(balance))}
          </p>
        </div>
      </div>
    </div>
  );
};
