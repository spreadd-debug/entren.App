import React from 'react';
import type { SemaphoreColor } from '../../../shared/types';

interface SemaphoreBadgeProps {
  color: SemaphoreColor;
  label?: string;
  size?: 'sm' | 'md';
}

const colorStyles: Record<SemaphoreColor, { dot: string; bg: string; text: string }> = {
  green: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  yellow: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
  },
  red: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
  },
};

export const SemaphoreBadge: React.FC<SemaphoreBadgeProps> = ({ color, label, size = 'sm' }) => {
  const styles = colorStyles[color];
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  if (!label) {
    return (
      <span className={`inline-block ${dotSize} rounded-full ${styles.dot} shrink-0`} />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles.bg} ${styles.text}`}>
      <span className={`inline-block ${dotSize} rounded-full ${styles.dot}`} />
      {label}
    </span>
  );
};
