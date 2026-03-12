import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  AlertCircle,
  Settings,
  Bell,
  Plus,
  Dumbbell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AppShellProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  title: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentView,
  onNavigate,
  title,
}) => {
  const mobileNavItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'students', label: 'Alumnos', icon: Users },
    { id: 'payments', label: 'Pagos', icon: CreditCard },
    { id: 'defaulters', label: 'Deudores', icon: AlertCircle },
    { id: 'workouts', label: 'Rutinas', icon: Dumbbell },
  ];

  const desktopNavItems = [
    ...mobileNavItems,
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-slate-900 italic">
              G
            </div>
            entrenApp
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {desktopNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                currentView === item.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-slate-900'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <img
                src="https://picsum.photos/seed/gym-admin/100/100"
                alt="Admin"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Admin Gym</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Plan Premium</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-4 flex items-center justify-between sticky top-0 z-20">
        <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white italic">
          entrenApp
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
          </button>

          <button
            type="button"
            aria-label="Ajustes"
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-lg transition-colors ${
              currentView === 'settings'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col pb-24 md:pb-0">
        <div className="px-4 md:px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
              Gestioná tu gimnasio con eficiencia.
            </p>
          </div>

          <button
            onClick={() => onNavigate('new-student')}
            className="hidden md:flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus size={20} />
            Nuevo Alumno
          </button>
        </div>

        <div className="px-4 md:px-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 px-2 py-3 flex justify-around items-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all min-w-0 flex-1 ${
              currentView === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all ${
                currentView === item.id ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
            >
              <item.icon
                size={20}
                strokeWidth={currentView === item.id ? 2.5 : 2}
              />
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider truncate ${
                currentView === item.id ? 'opacity-100' : 'opacity-60'
              }`}
            >
              {item.label === 'Inicio' ? 'Home' : item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};
