import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Phone, Edit2, MessageSquare, Trash2, Save, X,
  Dumbbell, PlayCircle, Bell, Plus, CheckCircle2, HeartPulse,
  Ruler, Target, FileText, Activity, KeyRound, Copy, Check, RefreshCw, Share2,
  TrendingUp, Calendar, Clock, Apple, Camera,
} from 'lucide-react';
import { Card, StatusBadge, Button, Input } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { Student, Plan, WorkoutOption, WorkoutUpdateRequest } from '../../shared/types';
import { api } from '../services/api';
import { WorkoutPlanService } from '../services/WorkoutPlanService';
import { WorkoutRequestService } from '../services/WorkoutRequestService';
import { WorkoutSessionService } from '../services/WorkoutSessionService';
import { ExerciseVideoModal } from '../components/ExerciseVideoModal';
import { useToast } from '../context/ToastContext';
import { getWorkoutFreshness } from '../config/workoutConfig';

import { AnthropometryPanel } from '../components/pt/AnthropometryPanel';
import { MeasurementsPanel } from '../components/pt/MeasurementsPanel';
import { GoalsPanel } from '../components/pt/GoalsPanel';
import { SessionNotesPanel } from '../components/pt/SessionNotesPanel';
import { WellnessCheckInPanel } from '../components/pt/WellnessCheckInPanel';
import { NutritionPlanPanel } from '../components/pt/NutritionPlanPanel';
import { ProgressPhotosPanel } from '../components/pt/ProgressPhotosPanel';

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type Tab = 'overview' | 'anthropometry' | 'measurements' | 'goals' | 'notes' | 'nutrition' | 'wellness' | 'photos' | 'workouts';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'General', icon: Activity },
  { id: 'anthropometry', label: 'Cuerpo', icon: Ruler },
  { id: 'measurements', label: 'Medidas', icon: Ruler },
  { id: 'goals', label: 'Objetivos', icon: Target },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'nutrition', label: 'Nutrición', icon: Apple },
  { id: 'wellness', label: 'Bienestar', icon: HeartPulse },
  { id: 'photos', label: 'Fotos', icon: Camera },
  { id: 'workouts', label: 'Rutinas', icon: Dumbbell },
];

interface ClientDetailViewProps {
  student: Student;
  plans: Plan[];
  gymId: string;
  onBack: () => void;
  onUpdateStudent: (id: string, updates: any) => void;
  onDeleteStudent: (id: string) => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  student,
  plans,
  gymId,
  onBack,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Workout state
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [studentWorkoutExercises, setStudentWorkoutExercises] = useState<any[]>([]);
  const [pendingUpdateRequest, setPendingUpdateRequest] = useState<WorkoutUpdateRequest | null>(null);
  const [selectedWorkoutPlanId, setSelectedWorkoutPlanId] = useState('');
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [adherenceStats, setAdherenceStats] = useState<{
    totalSessions: number; completedSessions: number; adherencePercent: number; lastSessionDate: string | null;
  } | null>(null);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; exerciseName: string; videoUrl: string }>({
    isOpen: false, exerciseName: '', videoUrl: '',
  });
  const [accessCode, setAccessCode] = useState<string | null>((student as any).access_code ?? null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const normalizedPlans = useMemo(() => {
    return (Array.isArray(plans) ? plans : []).map((p: any) => ({
      ...p,
      name: p.name ?? p.nombre ?? '',
      price: Number(p.price ?? p.precio ?? 0),
      durationDays: Number(p.durationDays ?? p.duracion_dias ?? 30),
      active: p.active ?? p.activo ?? true,
    }));
  }, [plans]);

  const clientName =
    (student as any).name ??
    `${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim();

  const clientPlan = normalizedPlans.find((p: any) => p.id === ((student as any).plan_id ?? (student as any).planId));

  // Edit state
  const [editData, setEditData] = useState({
    nombre: (student as any).nombre ?? '',
    apellido: (student as any).apellido ?? '',
    telefono: (student as any).telefono ?? '',
    plan_id: (student as any).plan_id ?? (student as any).planId ?? '',
    status: (student as any).status === 'active' ? 'activo' : (student as any).status === 'inactive' ? 'baja' : (student as any).status ?? 'activo',
    observaciones: (student as any).observaciones ?? (student as any).observations ?? '',
    emergency_contact_name: (student as any).emergency_contact_name ?? '',
    emergency_contact_phone: (student as any).emergency_contact_phone ?? '',
  });

  const loadWorkoutData = async () => {
    try {
      setIsLoadingWorkout(true);
      const [plansData, optionsData, exercisesData, requestData, adherenceData] = await Promise.allSettled([
        WorkoutPlanService.getPlans(gymId),
        WorkoutPlanService.getStudentWorkoutOptions(student.id),
        WorkoutPlanService.getStudentWorkout(student.id),
        WorkoutRequestService.getOpenRequest(student.id),
        WorkoutSessionService.getAdherenceStats(student.id, 30),
      ]);
      setWorkoutPlans(plansData.status === 'fulfilled' && Array.isArray(plansData.value) ? plansData.value : []);
      setWorkoutOptions(optionsData.status === 'fulfilled' && Array.isArray(optionsData.value) ? optionsData.value : []);
      setStudentWorkoutExercises(exercisesData.status === 'fulfilled' && Array.isArray(exercisesData.value) ? exercisesData.value : []);
      setPendingUpdateRequest(requestData.status === 'fulfilled' ? requestData.value : null);
      setAdherenceStats(adherenceData.status === 'fulfilled' ? adherenceData.value : null);
    } catch { /* ignore */ }
    setIsLoadingWorkout(false);
  };

  useEffect(() => { loadWorkoutData(); }, [student.id]);

  const handleAddOption = async () => {
    if (!selectedWorkoutPlanId) return;
    try {
      setIsAddingOption(true);
      await WorkoutPlanService.addWorkoutOption(gymId, student.id, selectedWorkoutPlanId);
      await loadWorkoutData();
      setSelectedWorkoutPlanId('');
      toast.success('Rutina agregada');
    } catch {
      toast.error('No se pudo agregar');
    }
    setIsAddingOption(false);
  };

  const handleRemoveOption = async (assignmentId: string) => {
    try {
      await WorkoutPlanService.removeWorkoutOption(assignmentId);
      await loadWorkoutData();
      toast.success('Opcion eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const handleResolveRequest = async () => {
    if (!pendingUpdateRequest) return;
    try {
      await WorkoutRequestService.resolveRequest(pendingUpdateRequest.id);
      setPendingUpdateRequest(null);
      toast.success('Solicitud atendida');
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const handleToggleOptionDay = async (option: WorkoutOption, day: number) => {
    const current = option.days_of_week ?? [];
    const newDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b);
    const updatedDays = newDays.length > 0 ? newDays : null;
    setWorkoutOptions(prev => prev.map(o => o.id === option.id ? { ...o, days_of_week: updatedDays } : o));
    try {
      await WorkoutPlanService.updateWorkoutOptionDays(option.id, updatedDays);
    } catch {
      setWorkoutOptions(prev => prev.map(o => o.id === option.id ? { ...o, days_of_week: option.days_of_week } : o));
      toast.error('No se pudo actualizar');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editData.nombre.trim() || !editData.apellido.trim()) {
      toast.error('Nombre y apellido son obligatorios');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateStudent(student.id, { ...editData, nombre: editData.nombre.trim(), apellido: editData.apellido.trim() });
      setIsEditing(false);
    } catch {
      // error already toasted by parent
    }
    setIsSaving(false);
  };

  const handleDelete = () => {
    if (!pendingDelete) { setPendingDelete(true); setTimeout(() => setPendingDelete(false), 3000); return; }
    onDeleteStudent(student.id);
  };

  const portalUrl = `${window.location.origin}/portal`;

  const handleCopyCode = () => {
    if (!accessCode) return;
    navigator.clipboard.writeText(accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    try {
      const { access_code } = await api.students.regenerateAccessCode(student.id, gymId);
      setAccessCode(access_code);
      toast.success('Codigo regenerado');
    } catch {
      toast.error('No se pudo regenerar el codigo');
    }
    setRegenerating(false);
  };

  const handleShareWhatsApp = () => {
    const phone = ((student as any).telefono ?? '').replace(/\D/g, '');
    const msg = `Hola ${clientName}!\n\nYa podes acceder a tu portal de entrenamiento:\n\n${portalUrl}\n\nTelefono: ${(student as any).telefono ?? ''}\nCodigo: ${accessCode}\n\nAhi vas a poder ver tus rutinas, registrar tus entrenamientos y seguir tu progreso.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatDateShort = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    } catch { return null; }
  };

  const initials = (() => {
    const parts = clientName?.split(' ') ?? [];
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return clientName?.charAt(0)?.toUpperCase() || '?';
  })();

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)} disabled={isSaving}><X size={18} /></Button>
            <Button variant="secondary" size="icon" onClick={handleSave} disabled={isSaving}><Save size={18} /></Button>
          </div>
        </div>
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Editar Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Nombre" value={editData.nombre} onChange={e => setEditData({ ...editData, nombre: e.target.value })} />
            <Input placeholder="Apellido" value={editData.apellido} onChange={e => setEditData({ ...editData, apellido: e.target.value })} />
          </div>
          <Input placeholder="Telefono" value={editData.telefono} onChange={e => setEditData({ ...editData, telefono: e.target.value })} />
          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
            value={editData.plan_id}
            onChange={e => setEditData({ ...editData, plan_id: e.target.value })}
          >
            {normalizedPlans.map((p: any) => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
          </select>
          <select
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
            value={editData.status}
            onChange={e => setEditData({ ...editData, status: e.target.value })}
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="baja">Baja</option>
          </select>
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            rows={3} placeholder="Observaciones" value={editData.observaciones}
            onChange={e => setEditData({ ...editData, observaciones: e.target.value })}
          />
          <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse size={14} className="text-rose-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contacto de Emergencia</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nombre" value={editData.emergency_contact_name} onChange={e => setEditData({ ...editData, emergency_contact_name: e.target.value })} />
              <Input placeholder="Telefono" value={editData.emergency_contact_phone} onChange={e => setEditData({ ...editData, emergency_contact_phone: e.target.value })} />
            </div>
          </div>
          <Button variant="secondary" fullWidth onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Card>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-10">

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-6 -bottom-10 w-36 h-36 bg-indigo-400/20 rounded-full blur-2xl" />

        <div className="relative z-10 px-5 pt-4 pb-5">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <ArrowLeft size={22} />
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => setIsEditing(true)} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <Edit2 size={17} />
              </button>
              <button
                onClick={handleDelete}
                className={`rounded-xl transition-all ${
                  pendingDelete
                    ? 'px-3 py-1.5 bg-white/20 text-white text-xs font-black backdrop-blur-sm'
                    : 'p-2 text-white/40 hover:text-rose-300 hover:bg-white/10'
                }`}
              >
                {pendingDelete ? 'Eliminar?' : <Trash2 size={17} />}
              </button>
            </div>
          </div>

          {/* Avatar + Info */}
          <div className="flex items-center gap-4">
            <div className="w-[72px] h-[72px] rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-black/10 border border-white/20 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white tracking-tight truncate">{clientName}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusBadge status={(student as any).status} />
                {clientPlan && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white/90 border border-white/20 backdrop-blur-sm">
                    {clientPlan.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          {(student as any).telefono ? (
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <a
                href={`tel:${(student as any).telefono}`}
                className="flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/10 transition-all active:scale-[0.97]"
              >
                <Phone size={16} />
                <span className="text-sm font-bold">Llamar</span>
              </a>
              <a
                href={`https://wa.me/${((student as any).telefono).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 backdrop-blur-sm text-white border border-emerald-400/20 transition-all active:scale-[0.97]"
              >
                <MessageSquare size={16} />
                <span className="text-sm font-bold">WhatsApp</span>
              </a>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <Phone size={14} className="text-white/40 shrink-0" />
              <p className="text-xs text-white/50 font-medium">Sin telefono registrado — edita el cliente para agregar uno</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Stats Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Adherence */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <TrendingUp size={14} className={
              adherenceStats && adherenceStats.totalSessions > 0
                ? adherenceStats.adherencePercent >= 80 ? 'text-emerald-500' : adherenceStats.adherencePercent >= 50 ? 'text-amber-500' : 'text-rose-500'
                : 'text-slate-300 dark:text-slate-600'
            } />
          </div>
          <p className={`text-xl font-black leading-none ${
            adherenceStats && adherenceStats.totalSessions > 0
              ? adherenceStats.adherencePercent >= 80 ? 'text-emerald-500' : adherenceStats.adherencePercent >= 50 ? 'text-amber-500' : 'text-rose-500'
              : 'text-slate-300 dark:text-slate-600'
          }`}>
            {adherenceStats && adherenceStats.totalSessions > 0 ? `${adherenceStats.adherencePercent}%` : '--'}
          </p>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Adherencia</p>
        </div>

        {/* Routines */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <Dumbbell size={14} className="text-violet-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white leading-none">
            {workoutOptions.length}
          </p>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Rutinas</p>
        </div>

        {/* Last session */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <Calendar size={14} className="text-indigo-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white leading-none truncate">
            {formatDateShort(adherenceStats?.lastSessionDate) ?? '--'}
          </p>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Ult. sesion</p>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">

          {/* Pending workout request alert */}
          {pendingUpdateRequest && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="p-2 rounded-xl bg-amber-500/15 shrink-0">
                <Bell size={16} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Solicita nueva rutina</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/60">Tu cliente pidio actualizacion de su plan</p>
              </div>
              <button onClick={handleResolveRequest} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition-all shrink-0">
                Atender
              </button>
            </div>
          )}

          {/* Start training session */}
          {workoutOptions.length > 0 && (
            <button
              onClick={() => navigate(`/clients/${student.id}/session`)}
              className="w-full py-4 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white rounded-2xl font-black text-base transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              <PlayCircle size={20} />
              Iniciar Sesión de Entrenamiento
            </button>
          )}

          {/* Info cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            {(student as any).telefono && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 shrink-0">
                    <Phone size={16} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Telefono</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{(student as any).telefono}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Plan */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
                  <Dumbbell size={16} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Plan</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {clientPlan?.name ?? (student as any).planName ?? 'Sin plan'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Emergency contact */}
            {((student as any).emergency_contact_name || (student as any).emergency_contact_phone) && (
              <Card className="p-4 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 shrink-0">
                    <HeartPulse size={16} className="text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Emergencia</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(student as any).emergency_contact_name && (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{(student as any).emergency_contact_name}</p>
                      )}
                      {(student as any).emergency_contact_phone && (
                        <a href={`tel:${(student as any).emergency_contact_phone}`} className="text-sm font-bold text-rose-500 hover:text-rose-400">
                          {(student as any).emergency_contact_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Observations */}
          {(student as any).observaciones && (
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  <FileText size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{(student as any).observaciones}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Portal access */}
          <div className="relative rounded-2xl overflow-hidden border border-violet-200 dark:border-violet-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30" />
            <div className="relative z-10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-500/15">
                  <KeyRound size={14} className="text-violet-500" />
                </div>
                <h4 className="text-sm font-black text-violet-700 dark:text-violet-400">Acceso al Portal</h4>
              </div>

              {!(student as any).telefono ? (
                <div className="flex items-start gap-3 py-2">
                  <Phone size={16} className="text-violet-400/50 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-violet-600/70 dark:text-violet-400/60">Se necesita un telefono</p>
                    <p className="text-xs text-violet-500/50 dark:text-violet-400/40 mt-0.5">Para que tu cliente pueda acceder al portal necesita tener un telefono cargado. Edita el cliente para agregarlo.</p>
                  </div>
                </div>
              ) : accessCode ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 bg-white dark:bg-slate-900/60 border border-violet-200 dark:border-violet-500/20 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[9px] font-bold text-violet-400 dark:text-violet-500 uppercase tracking-wider">Codigo</p>
                        <p className="text-2xl font-black text-violet-600 dark:text-violet-300 tracking-[0.2em] font-mono">{accessCode}</p>
                      </div>
                      <button onClick={handleCopyCode} className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/10 transition-colors">
                        {copiedCode ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-violet-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 border border-violet-200 dark:border-violet-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm">
                    <p className="flex-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{portalUrl}</p>
                    <button onClick={handleCopyLink} className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/10 transition-colors shrink-0">
                      {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-violet-400" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-[0.97]"
                    >
                      <Share2 size={13} /> Enviar por WhatsApp
                    </button>
                    <button
                      onClick={handleRegenerateCode}
                      disabled={regenerating}
                      className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
                      {regenerating ? '' : 'Regenerar'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-violet-500/70 dark:text-violet-400/50 mb-3">Sin codigo de acceso</p>
                  <button
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-500/20 disabled:opacity-50 active:scale-[0.97]"
                  >
                    <KeyRound size={13} /> {regenerating ? 'Generando...' : 'Generar codigo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'anthropometry' && (
        <AnthropometryPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'measurements' && (
        <MeasurementsPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'goals' && (
        <GoalsPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'notes' && (
        <SessionNotesPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'nutrition' && (
        <NutritionPlanPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'wellness' && (
        <WellnessCheckInPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'photos' && (
        <ProgressPhotosPanel studentId={student.id} gymId={gymId} />
      )}

      {activeTab === 'workouts' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Rutinas disponibles</h3>
                {adherenceStats && adherenceStats.totalSessions > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Adherencia 30d:{' '}
                    <span className={`font-bold ${
                      adherenceStats.adherencePercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      adherenceStats.adherencePercent >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>{adherenceStats.adherencePercent}%</span>
                    {' '}({adherenceStats.completedSessions}/{adherenceStats.totalSessions})
                  </p>
                )}
              </div>
              {pendingUpdateRequest && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <Bell size={11} /> Pide nueva rutina
                </span>
              )}
            </div>

            {isLoadingWorkout ? (
              <div className="flex items-center justify-center py-6">
                <span className="w-5 h-5 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : workoutOptions.length > 0 ? (
              <div className="space-y-3">
                {workoutOptions.map(option => {
                  const freshness = getWorkoutFreshness(option.updated_at);
                  return (
                    <div key={option.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${freshness.dotClass}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{option.plan_name}</p>
                          <p className={`text-xs ${freshness.colorClass}`}>
                            {freshness.daysOld !== null ? `Actualizada hace ${freshness.daysOld} dia${freshness.daysOld === 1 ? '' : 's'}` : 'Sin fecha'}
                          </p>
                        </div>
                        <button onClick={() => handleRemoveOption(option.id)} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0" title="Quitar">
                          <X size={14} />
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Dias habilitados</p>
                        <div className="flex gap-1 flex-wrap">
                          {[1, 2, 3, 4, 5, 6, 0].map(day => {
                            const isActive = option.days_of_week?.includes(day) ?? false;
                            return (
                              <button
                                key={day} type="button" onClick={() => handleToggleOptionDay(option, day)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isActive ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                              >
                                {DAY_NAMES_SHORT[day]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Dumbbell size={28} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Sin rutinas asignadas</p>
              </div>
            )}

            {pendingUpdateRequest && (
              <button onClick={handleResolveRequest} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/20 transition-colors">
                <CheckCircle2 size={13} /> Marcar solicitud como atendida
              </button>
            )}

            <div className="pt-1 space-y-2 border-t border-slate-100 dark:border-slate-700">
              <select
                className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
                value={selectedWorkoutPlanId} onChange={e => setSelectedWorkoutPlanId(e.target.value)}
              >
                <option value="">Agregar rutina disponible...</option>
                {workoutPlans.filter((p: any) => !workoutOptions.some(o => o.workout_plan_id === p.id)).map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
              <Button variant="secondary" fullWidth onClick={handleAddOption} disabled={!selectedWorkoutPlanId || isAddingOption}>
                <Plus size={15} className="inline mr-1" />
                {isAddingOption ? 'Agregando...' : 'Agregar como opcion'}
              </Button>
            </div>

            {studentWorkoutExercises.length > 0 && (
              <div className="space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Ejercicios ({workoutOptions[0]?.plan_name ?? 'Rutina'})
                </p>
                {studentWorkoutExercises.map((ex: any, i: number) => (
                  <div key={ex.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-700 last:border-0 gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{i + 1}. {ex.exercise_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{ex.sets || '-'} series · {ex.reps || '-'} reps · {ex.weight || '-'}</p>
                    </div>
                    {ex.video_url ? (
                      <button
                        type="button"
                        onClick={() => setVideoModal({ isOpen: true, exerciseName: ex.exercise_name, videoUrl: ex.video_url })}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-xs font-bold shrink-0"
                      >
                        <PlayCircle size={15} /> Ver video
                      </button>
                    ) : (
                      <Dumbbell size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <ExerciseVideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, exerciseName: '', videoUrl: '' })}
        exerciseName={videoModal.exerciseName}
        videoUrl={videoModal.videoUrl}
      />
    </div>
  );
};
