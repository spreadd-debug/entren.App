import React, { useEffect, useState } from 'react';
import { X, Activity, Loader2 } from 'lucide-react';
import { Button, Input, Select } from '../UI';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import {
  RunningSession,
  RunningSessionType,
  RunningLoggedBy,
} from '../../../shared/types';

interface LogRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (session: RunningSession) => void;
  gymId: string;
  studentId: string;
  loggedBy: RunningLoggedBy;
  /** If provided, the modal opens in edit mode for that session. */
  existing?: RunningSession | null;
}

const SESSION_TYPES: { value: RunningSessionType; label: string }[] = [
  { value: 'easy',      label: 'Suave / Recuperación' },
  { value: 'long',      label: 'Fondo (Long run)' },
  { value: 'tempo',     label: 'Tempo' },
  { value: 'intervals', label: 'Intervalos / Series' },
  { value: 'race',      label: 'Carrera' },
  { value: 'other',     label: 'Otro' },
];

interface FormState {
  session_date: string;
  distance_km: string;
  duration_minutes: string;
  duration_seconds_part: string;
  session_type: RunningSessionType;
  avg_hr_bpm: string;
  perceived_effort: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    session_date: new Date().toISOString().slice(0, 10),
    distance_km: '',
    duration_minutes: '',
    duration_seconds_part: '',
    session_type: 'easy',
    avg_hr_bpm: '',
    perceived_effort: '',
    notes: '',
  };
}

function fromExisting(s: RunningSession): FormState {
  const totalSec = s.duration_seconds || 0;
  return {
    session_date: s.session_date,
    distance_km: String(s.distance_km),
    duration_minutes: String(Math.floor(totalSec / 60)),
    duration_seconds_part: String(totalSec % 60),
    session_type: s.session_type,
    avg_hr_bpm: s.avg_hr_bpm != null ? String(s.avg_hr_bpm) : '',
    perceived_effort: s.perceived_effort != null ? String(s.perceived_effort) : '',
    notes: s.notes ?? '',
  };
}

export const LogRunModal: React.FC<LogRunModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  gymId,
  studentId,
  loggedBy,
  existing,
}) => {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(existing ? fromExisting(existing) : emptyForm());
  }, [isOpen, existing]);

  if (!isOpen) return null;

  const isEditing = !!existing;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    const distance = Number(form.distance_km);
    const minutes = Number(form.duration_minutes || 0);
    const seconds = Number(form.duration_seconds_part || 0);
    const totalSeconds = minutes * 60 + seconds;

    if (!form.session_date) return toast.error('Falta la fecha');
    if (!(distance > 0)) return toast.error('La distancia debe ser mayor a 0');
    if (!(totalSeconds > 0)) return toast.error('La duración debe ser mayor a 0');
    if (form.avg_hr_bpm) {
      const hr = Number(form.avg_hr_bpm);
      if (hr < 30 || hr > 250) return toast.error('FC fuera de rango (30–250)');
    }
    if (form.perceived_effort) {
      const rpe = Number(form.perceived_effort);
      if (rpe < 1 || rpe > 10) return toast.error('RPE debe estar entre 1 y 10');
    }

    const payload = {
      gym_id: gymId,
      student_id: studentId,
      session_date: form.session_date,
      distance_km: distance,
      duration_seconds: totalSeconds,
      session_type: form.session_type,
      avg_hr_bpm: form.avg_hr_bpm ? Number(form.avg_hr_bpm) : null,
      perceived_effort: form.perceived_effort ? Number(form.perceived_effort) : null,
      notes: form.notes.trim() || null,
      logged_by: loggedBy,
    };

    setSaving(true);
    try {
      const saved = isEditing
        ? await api.running.updateSession(existing!.id, payload)
        : await api.running.createSession(payload);
      toast.success(isEditing ? 'Corrida actualizada' : 'Corrida registrada');
      onSaved(saved);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar la corrida');
    } finally {
      setSaving(false);
    }
  };

  const paceText = (() => {
    const distance = Number(form.distance_km);
    const minutes = Number(form.duration_minutes || 0);
    const seconds = Number(form.duration_seconds_part || 0);
    const totalSeconds = minutes * 60 + seconds;
    if (!(distance > 0) || !(totalSeconds > 0)) return null;
    const pacePerKm = Math.round(totalSeconds / distance);
    const pm = Math.floor(pacePerKm / 60);
    const ps = pacePerKm % 60;
    return `${pm}:${String(ps).padStart(2, '0')} /km`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Activity className="text-violet-500" size={20} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Editar corrida' : 'Registrar corrida'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Fecha</label>
              <Input
                type="date"
                value={form.session_date}
                onChange={e => set('session_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Tipo</label>
              <Select value={form.session_type} onChange={e => set('session_type', e.target.value as RunningSessionType)}>
                {SESSION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Distancia (km)</label>
            <Input
              type="number"
              step="0.01"
              min={0}
              inputMode="decimal"
              placeholder="Ej: 8.5"
              value={form.distance_km}
              onChange={e => set('distance_km', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Duración</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Min"
                  value={form.duration_minutes}
                  onChange={e => set('duration_minutes', e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1 ml-1">Minutos</p>
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  placeholder="Seg"
                  value={form.duration_seconds_part}
                  onChange={e => set('duration_seconds_part', e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1 ml-1">Segundos</p>
              </div>
            </div>
            {paceText && (
              <p className="text-xs text-violet-500 font-semibold ml-1">Ritmo: {paceText}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">FC promedio</label>
              <Input
                type="number"
                min={30}
                max={250}
                inputMode="numeric"
                placeholder="Opcional"
                value={form.avg_hr_bpm}
                onChange={e => set('avg_hr_bpm', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">RPE (1–10)</label>
              <Input
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                placeholder="Opcional"
                value={form.perceived_effort}
                onChange={e => set('perceived_effort', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Sensaciones, ruta, clima…"
              className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/60 transition-all duration-150 resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50 dark:bg-slate-900">
          <Button variant="outline" fullWidth onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : isEditing ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
