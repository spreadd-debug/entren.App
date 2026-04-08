import React from 'react';
import { StudentStatus, ScholarshipType } from '../types';

// ─── Status Badge ─────────────────────────────────────────────────────────────

interface BadgeProps {
  status: StudentStatus;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const styles: Record<StudentStatus, string> = {
    active:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    expiring:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    expired:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    inactive:
      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    pausado:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    baja:
      'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  };

  const labels: Record<StudentStatus, string> = {
    active: 'Al día',
    expiring: 'Por vencer',
    expired: 'Vencido',
    inactive: 'Inactivo',
    pausado: 'Pausado',
    baja: 'Baja',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// ─── Billing Badge ────────────────────────────────────────────────────────────

interface BillingBadgeProps {
  cobra_cuota: boolean;
  recordatorio_automatico: boolean;
  tipo_beca: ScholarshipType;
  whatsapp_opt_in?: boolean;
}

export const BillingBadge: React.FC<BillingBadgeProps> = ({
  cobra_cuota,
  recordatorio_automatico,
  tipo_beca,
  whatsapp_opt_in = false,
}) => {
  const badges: React.ReactNode[] = [];

  if (tipo_beca === 'complete') {
    badges.push(
      <span key="beca" className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20">
        Beca Completa
      </span>
    );
  } else if (tipo_beca === 'partial') {
    badges.push(
      <span key="beca" className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
        Beca Parcial
      </span>
    );
  }

  if (!cobra_cuota) {
    badges.push(
      <span key="exento" className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Exento
      </span>
    );
  } else {
    badges.push(
      <span key="remind" className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
        recordatorio_automatico
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      }`}>
        {recordatorio_automatico ? 'Auto' : 'Manual'}
      </span>
    );
  }

  if (whatsapp_opt_in) {
    badges.push(
      <span key="wa" className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white border border-emerald-600">
        WA ✓
      </span>
    );
  }

  return <div className="flex flex-wrap gap-1">{badges}</div>;
};

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`
      bg-white dark:bg-slate-900
      rounded-2xl border border-slate-200 dark:border-slate-800
      shadow-sm dark:shadow-none
      overflow-hidden
      ${onClick
        ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-slate-950/50 transition-all duration-150 active:scale-[0.985]'
        : ''
      }
      ${className}
    `}
  >
    {children}
  </div>
);

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25',
    secondary:
      'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm',
    outline:
      'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80',
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    danger:
      'bg-rose-500 text-white hover:bg-rose-400 shadow-sm shadow-rose-500/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-7 py-3.5 text-sm rounded-xl gap-2',
    icon: 'p-2 rounded-xl',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────────

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => (
  <input
    className={`
      w-full px-4 py-3 rounded-xl text-sm
      bg-slate-50 dark:bg-slate-900/80
      border border-slate-200 dark:border-slate-800
      text-slate-900 dark:text-white
      placeholder:text-slate-400 dark:placeholder:text-slate-600
      focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/60
      dark:focus:border-cyan-500/40 dark:focus:ring-cyan-500/15
      transition-all duration-150
      ${className}
    `}
    {...props}
  />
);

// ─── Select ───────────────────────────────────────────────────────────────────

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  ...props
}) => (
  <select
    className={`
      w-full px-4 py-3 rounded-xl text-sm
      bg-slate-50 dark:bg-slate-900/80
      border border-slate-200 dark:border-slate-800
      text-slate-900 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/60
      dark:focus:border-cyan-500/40 dark:focus:ring-cyan-500/15
      transition-all duration-150
      ${className}
    `}
    {...props}
  />
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
// Generic KPI used outside of Dashboard

export const KPICard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}> = ({ label, value, icon, color, trend }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 shadow-sm dark:shadow-none">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.12em]">
        {label}
      </p>
      <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
    </div>
    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
      {value}
    </p>
    {trend && (
      <p className="text-xs text-slate-400 dark:text-slate-600">{trend}</p>
    )}
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  colorOn?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onToggle,
  colorOn = 'bg-cyan-500',
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
      enabled ? colorOn : 'bg-slate-200 dark:bg-slate-700'
    }`}
  >
    <div
      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
        enabled ? 'right-1' : 'left-1'
      }`}
    />
  </button>
);

// ─── Section Label ────────────────────────────────────────────────────────────

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-600 px-1">
    {children}
  </h4>
);
