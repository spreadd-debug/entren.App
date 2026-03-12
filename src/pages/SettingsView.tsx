
import React from 'react';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  MessageSquare,
  ChevronRight,
  Dumbbell,
  Moon,
  Sun,
} from 'lucide-react';
import { Card } from '../components/UI';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  onNavigate: (view: string) => void;
  canManageSettings: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate, canManageSettings }) => {
  const { theme, toggleTheme } = useTheme();

  const sections = [
    {
      title: 'Gimnasio',
      items: [
        {
          id: 'profile',
          label: 'Perfil del Gimnasio',
          icon: Dumbbell,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
        },
        {
          id: 'plans',
          label: 'Planes y Precios',
          icon: CreditCard,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        },
        {
          id: 'automation',
          label: 'Automatización WA',
          icon: MessageSquare,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          id: 'user',
          label: 'Mi Perfil',
          icon: User,
          color: 'text-slate-600',
          bg: 'bg-slate-100',
        },
        {
          id: 'notifications',
          label: 'Notificaciones',
          icon: Bell,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
        },
        {
          id: 'security',
          label: 'Seguridad',
          icon: Shield,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    if (id === 'plans') {
      onNavigate('plans');
      return;
    }

    if (id === 'automation') {
      onNavigate('automation');
      return;
    }

    alert('Esta sección estará disponible próximamente.');
  };

  return (
    <div className="space-y-6 pb-10">
      <Card className="p-6 bg-slate-900 text-white border-0 overflow-hidden relative">
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl font-black italic mb-4 border border-white/20">
            GP
          </div>
          <h3 className="text-xl font-bold">entrenApp</h3>
          <p className="text-slate-400 text-sm">Buenos Aires, Argentina</p>
          <div className="mt-4 inline-block px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
            Suscripción Active
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -right-5 top-5 w-20 h-20 border-4 border-white/5 rounded-full" />
      </Card>

      {/* Apariencia */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
          Apariencia
        </h4>
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Modo Oscuro</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">{theme === 'dark' ? 'Activado' : 'Desactivado'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-all relative ${
                theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-200'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  theme === 'dark' ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </Card>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            {section.title}
          </h4>

          <Card className="divide-y divide-slate-50 dark:divide-slate-700">
            {section.items.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                onClick={() => handleItemClick(item.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon size={20} />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-slate-300 dark:text-slate-500" />
              </button>
            ))}
          </Card>
        </div>
      ))}

      <div className="text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">entrenApp v1.0.4</p>
      </div>
    </div>
  );
};
