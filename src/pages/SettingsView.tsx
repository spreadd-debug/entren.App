
import React, { useState, useEffect } from 'react';
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
  Calendar,
  Zap,
  QrCode,
  Copy,
  Check,
  Users,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Card, SectionLabel, Toggle } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface StaffMember { id: string; email: string; name: string; }

interface SettingsViewProps {
  onNavigate: (view: string) => void;
  canManageSettings: boolean;
  shiftsEnabled: boolean;
  onToggleShifts: (enabled: boolean) => void;
  gymId?: string;
  gymName?: string;
  gymType?: 'gym' | 'personal_trainer';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNavigate,
  canManageSettings,
  shiftsEnabled,
  onToggleShifts,
  gymId,
  gymName,
  gymType = 'gym',
}) => {
  const isPT = gymType === 'personal_trainer';
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [pendingDeleteStaffId, setPendingDeleteStaffId] = useState<string | null>(null);

  // ── Staff management state ─────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '' });
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormLoading, setStaffFormLoading] = useState(false);

  const resolvedGymId = gymId ?? '';

  useEffect(() => {
    if (!canManageSettings) return;
    setStaffLoading(true);
    api.staff.getByGym(resolvedGymId)
      .then(setStaff)
      .finally(() => setStaffLoading(false));
  }, [canManageSettings, resolvedGymId]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError('');
    setStaffFormLoading(true);
    try {
      const created = await api.staff.create({ ...staffForm, gym_id: resolvedGymId });
      setStaff(prev => [...prev, created]);
      setStaffForm({ name: '', email: '', password: '' });
      setShowStaffForm(false);
    } catch (err: any) {
      setStaffFormError(err.message ?? 'Error al crear el usuario');
    } finally {
      setStaffFormLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (pendingDeleteStaffId !== id) {
      setPendingDeleteStaffId(id);
      setTimeout(() => setPendingDeleteStaffId(null), 3000);
      return;
    }
    setPendingDeleteStaffId(null);
    try {
      await api.staff.remove(id);
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error(err.message ?? 'Error al eliminar');
    }
  };

  const checkinUrl = `${window.location.origin}${window.location.pathname}?checkin=${resolvedGymId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(checkinUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(checkinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sections = [
    {
      title: isPT ? 'Mi Negocio' : 'Gimnasio',
      items: [
        {
          id: 'plans',
          label: 'Planes y Precios',
          description: isPT ? 'Gestioná tus planes de entrenamiento' : 'Gestioná los planes de membresía',
          icon: CreditCard,
          iconBg: 'bg-cyan-500/10',
          iconColor: 'text-cyan-500',
        },
        ...(!isPT ? [
          {
            id: 'automation',
            label: 'Automatización WA',
            description: 'Recordatorios automáticos por WhatsApp',
            icon: MessageSquare,
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-500',
          },
        ] : []),
        {
          id: 'profile',
          label: isPT ? 'Mi Perfil Profesional' : 'Perfil del Gimnasio',
          description: isPT ? 'Tu información profesional' : 'Nombre, dirección y datos del gimnasio',
          icon: Dumbbell,
          iconBg: 'bg-violet-500/10',
          iconColor: 'text-violet-500',
        },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          id: 'user',
          label: 'Mi Perfil',
          description: 'Tu información personal y foto',
          icon: User,
          iconBg: 'bg-slate-100 dark:bg-slate-800',
          iconColor: 'text-slate-600 dark:text-slate-400',
        },
        {
          id: 'notifications',
          label: 'Notificaciones',
          description: 'Push y alertas en la app',
          icon: Bell,
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-500',
        },
        {
          id: 'security',
          label: 'Seguridad',
          description: 'Contraseña y accesos',
          icon: Shield,
          iconBg: 'bg-rose-500/10',
          iconColor: 'text-rose-500',
        },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    if (id === 'plans') { onNavigate('plans'); return; }
    if (id === 'automation') { onNavigate('automation'); return; }
    toast.warning('Esta sección estará disponible próximamente.');
  };

  return (
    <div className="space-y-6 pb-10 max-w-xl">

      {/* ── Gym profile card ─────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 dark:bg-slate-900 border border-slate-800 p-6">
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-4 -bottom-8 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
            <Zap size={24} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {gymName ?? (isPT ? 'Mi Estudio' : 'Mi Gimnasio')}
            </h3>
            <span className="mt-1.5 inline-block px-2.5 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-full text-[10px] font-black uppercase tracking-wider">
              Plan Activo
            </span>
          </div>
        </div>
      </div>

      {/* ── Módulos (solo gym) ───────────────────────────────────── */}
      {!isPT && (
      <div className="space-y-2">
        <SectionLabel>Módulos</SectionLabel>
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <Calendar size={18} className="text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Sistema de Turnos
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {shiftsEnabled
                    ? 'Activo · visible en navegación'
                    : 'Desactivado'}
                </p>
              </div>
            </div>
            <Toggle
              enabled={shiftsEnabled}
              onToggle={() => onToggleShifts(!shiftsEnabled)}
              colorOn="bg-violet-500"
            />
          </div>
        </Card>
      </div>
      )}

      {/* ── Check-in QR (solo gym) ──────────────────────────────── */}
      {!isPT && <div className="space-y-2" data-tour="qr-section">
        <SectionLabel>Check-in QR</SectionLabel>
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 shrink-0">
                <QrCode size={18} className="text-cyan-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Código QR del Gimnasio
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Imprimilo y pegalo en el gimnasio. Los alumnos escanean para registrar su asistencia.
                </p>
              </div>
            </div>

            {/* QR image */}
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm inline-block">
                <img
                  src={qrImageUrl}
                  alt="QR Check-in"
                  width={160}
                  height={160}
                  className="block rounded-lg"
                />
              </div>
            </div>

            {/* URL + copy */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
              <p className="flex-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {checkinUrl}
              </p>
              <button
                onClick={handleCopyUrl}
                className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Copiar URL"
              >
                {copied
                  ? <Check size={14} className="text-emerald-500" />
                  : <Copy size={14} className="text-slate-400" />
                }
              </button>
            </div>
          </div>
        </Card>
      </div>}

      {/* ── Apariencia ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>Apariencia</SectionLabel>
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'bg-cyan-500/10'
                    : 'bg-amber-500/10'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon size={18} className="text-cyan-400" />
                ) : (
                  <Sun size={18} className="text-amber-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Modo Oscuro
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {theme === 'dark' ? 'Activado' : 'Desactivado'}
                </p>
              </div>
            </div>
            <Toggle
              enabled={theme === 'dark'}
              onToggle={toggleTheme}
              colorOn="bg-cyan-500"
            />
          </div>
        </Card>
      </div>

      {/* ── Sections ─────────────────────────────────────────────── */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <SectionLabel>{section.title}</SectionLabel>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {section.items.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                onClick={() => handleItemClick(item.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${item.iconBg}`}>
                    <item.icon size={18} className={item.iconColor} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-300 dark:text-slate-700 shrink-0"
                />
              </button>
            ))}
          </Card>
        </div>
      ))}

      {/* ── Equipo (solo admin, solo gym) ─────────────────────────── */}
      {canManageSettings && !isPT && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Equipo</SectionLabel>
            {!showStaffForm && (
              <button
                onClick={() => setShowStaffForm(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                Agregar entrenador
              </button>
            )}
          </div>

          {/* Form nueva cuenta */}
          {showStaffForm && (
            <Card>
              <form onSubmit={handleCreateStaff} className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Nuevo entrenador</p>
                  <button type="button" onClick={() => { setShowStaffForm(false); setStaffFormError(''); }}>
                    <X size={16} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                  </button>
                </div>
                {staffFormError && (
                  <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {staffFormError}
                  </p>
                )}
                <input
                  required
                  placeholder="Nombre"
                  value={staffForm.name}
                  onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={staffForm.email}
                  onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60"
                />
                <input
                  required
                  type="password"
                  placeholder="Contraseña"
                  minLength={6}
                  value={staffForm.password}
                  onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60"
                />
                <button
                  type="submit"
                  disabled={staffFormLoading}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all"
                >
                  {staffFormLoading ? 'Creando...' : 'Crear cuenta'}
                </button>
              </form>
            </Card>
          )}

          {/* Lista de staff */}
          <Card>
            {staffLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="w-5 h-5 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            ) : staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                <Users size={28} strokeWidth={1.5} />
                <p className="text-sm font-medium">Sin entrenadores aún</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {staff.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <User size={16} className="text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{member.name || '—'}</p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStaff(member.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        pendingDeleteStaffId === member.id
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                      }`}
                      title="Eliminar"
                    >
                      {pendingDeleteStaffId === member.id ? '¿Eliminar?' : <Trash2 size={15} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="text-center text-[11px] text-slate-300 dark:text-slate-700 font-medium">
        entrenApp v1.0.4
      </p>
    </div>
  );
};
