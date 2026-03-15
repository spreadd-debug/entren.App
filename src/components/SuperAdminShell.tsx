import React from 'react';
import { LayoutDashboard, Building2, DollarSign, Zap, ShieldCheck, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CURRENT_USER } from '../config/currentUser';

export type SAView = 'overview' | 'gyms' | 'billing';

export const SA_NAV_ITEMS: { id: SAView; label: string; icon: React.FC<any> }[] = [
  { id: 'overview', label: 'Overview',   icon: LayoutDashboard },
  { id: 'gyms',     label: 'Gimnasios',  icon: Building2 },
  { id: 'billing',  label: 'Cobros',     icon: DollarSign },
];

export const SA_VIEW_TITLES: Record<SAView, string> = {
  overview: 'Overview',
  gyms:     'Gimnasios',
  billing:  'Cobros',
};

interface Props {
  currentView: SAView;
  onNavigate: (view: SAView) => void;
  children: React.ReactNode;
  onLogout?: () => void;
}

export const SuperAdminShell: React.FC<Props> = ({ currentView, onNavigate, children, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">

      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col sticky top-0 h-screen shrink-0">

        {/* Logo + admin badge */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <Zap size={15} className="text-slate-950" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <span className="text-[15px] font-black tracking-tight text-white block">
                entrenApp
              </span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                Admin
              </span>
            </div>
          </div>
        </div>

        <div className="mx-5 border-t border-slate-800 mb-3" />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {SA_NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all relative pl-3 pr-3
                  ${isActive
                    ? 'bg-cyan-500/15 text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-cyan-500 rounded-full" />
                )}
                <item.icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-cyan-500' : ''}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck size={14} className="text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{CURRENT_USER.id}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                Superadmin
              </p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-all"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Header ────────────────────────────────────────── */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Zap size={13} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="text-[13px] font-black text-white">entrenApp</span>
            <span className="ml-1.5 text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
              Admin
            </span>
          </div>
        </div>
        {onLogout && (
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
          >
            <LogOut size={18} />
          </button>
        )}
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col pb-24 md:pb-0 min-w-0">
        {/* Page header */}
        <div className="px-4 md:px-8 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800/60">
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {SA_VIEW_TITLES[currentView]}
          </h2>
        </div>

        {/* Content */}
        <div className="px-4 md:px-8 pt-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-2 flex items-center">
        {SA_NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1 flex-1 py-1 transition-all"
            >
              <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'
              }`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-500" />
                )}
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-widest ${
                isActive ? 'text-cyan-400' : 'text-slate-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
