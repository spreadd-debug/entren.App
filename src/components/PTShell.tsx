import React from 'react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Settings,
  Plus,
  Zap,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PTShellProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  title: string;
  onLogout?: () => void;
}

export const PTShell: React.FC<PTShellProps> = ({
  children,
  currentView,
  onNavigate,
  title,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Inicio',   icon: LayoutDashboard },
    { id: 'students',  label: 'Clientes', icon: Users },
    { id: 'workouts',  label: 'Rutinas',  icon: Dumbbell },
    { id: 'settings',  label: 'Ajustes',  icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">

      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col sticky top-0 h-screen shrink-0">

        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 group w-full"
          >
            <div className="w-8 h-8 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0 group-hover:shadow-violet-500/50 transition-shadow">
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">
              entrenApp <span className="text-violet-400 text-xs font-bold">PT</span>
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-slate-100 dark:border-slate-800 mb-3" />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all relative
                  ${isActive
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold pl-3 pr-3'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium pl-3 pr-3'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-violet-500 rounded-full" />
                )}
                <item.icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-violet-500' : ''}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* CTA Nuevo Cliente + Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            onClick={() => onNavigate('new-student')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 active:scale-[0.97]"
          >
            <Plus size={15} strokeWidth={2.5} />
            Nuevo Cliente
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-all"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Header ────────────────────────────────────────── */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5"
        >
          <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center shadow-sm shadow-violet-500/40">
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">
            entrenApp <span className="text-violet-400 text-xs font-bold">PT</span>
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Ajustes"
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-xl transition-all ${
              currentView === 'settings'
                ? 'bg-violet-500/10 text-violet-500'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Settings size={18} />
          </button>
          {onLogout && (
            <button
              type="button"
              aria-label="Cerrar sesión"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col pb-24 md:pb-0 min-w-0">
        {/* Page header */}
        <div className="px-4 md:px-8 pt-6 pb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <button
            onClick={() => onNavigate('new-student')}
            className="hidden md:flex items-center gap-2 bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 active:scale-[0.97]"
          >
            <Plus size={15} strokeWidth={2.5} />
            Nuevo Cliente
          </button>
        </div>

        {/* Content */}
        <div className="px-4 md:px-8 pt-6 flex-1" data-tour="content-area">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 px-1 py-2 flex items-center">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1 flex-1 py-1 transition-all"
            >
              <div
                className={`
                  relative flex items-center justify-center w-9 h-9 rounded-xl transition-all
                  ${isActive
                    ? 'bg-violet-500/15 text-violet-500 dark:text-violet-400'
                    : 'text-slate-400 dark:text-slate-600'
                  }
                `}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" />
                )}
              </div>
              <span
                className={`text-[8px] font-bold uppercase tracking-widest ${
                  isActive
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {item.label === 'Inicio' ? 'Home' : item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
