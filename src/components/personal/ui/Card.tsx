import React from 'react';

interface Props {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  // 'plain' = blanco; 'tinted' = tono crema más cálido; 'ink' = negro
  tone?: 'plain' | 'tinted' | 'ink';
  padding?: 'sm' | 'md' | 'lg';
}

const TONES = {
  plain:  'bg-white text-[var(--color-ink)]',
  tinted: 'bg-[var(--color-cream-200)] text-[var(--color-ink)]',
  ink:    'bg-[var(--color-ink)] text-white',
};
const PADS = { sm: 'p-4', md: 'p-5', lg: 'p-6' };

export const Card: React.FC<Props> = ({ className = '', onClick, children, tone = 'plain', padding = 'md' }) => {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`rounded-[1.75rem] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] ${TONES[tone]} ${PADS[padding]} ${interactive ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
