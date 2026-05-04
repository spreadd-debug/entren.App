import React from 'react';

type Variant = 'selected' | 'outline' | 'ghost';

interface Props {
  variant?: Variant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  type?: 'button' | 'submit';
}

export const PillChip: React.FC<Props> = ({
  variant = 'outline',
  onClick,
  disabled,
  className = '',
  children,
  type = 'button',
}) => {
  const base = 'inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium leading-none whitespace-nowrap transition-colors';
  const styles: Record<Variant, string> = {
    selected: 'bg-[var(--color-ink)] text-white',
    outline:  'border border-[var(--color-ink)]/15 text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5',
    ghost:    'text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/5',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};
