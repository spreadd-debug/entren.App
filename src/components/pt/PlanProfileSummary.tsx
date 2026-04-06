import { useState, useEffect } from 'react';
import {
  Target, Calendar, Clock, Shield, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { Card } from '../UI';
import { PlanProfileService } from '../../services/pt/PlanProfileService';
import type {
  StudentPlanProfile, TrainingPhase, TrainingObjective, ExperienceLevel,
} from '../../../shared/types';
import { useNavigate } from 'react-router-dom';

const PHASE_LABELS: Record<TrainingPhase, string> = {
  anatomical_adaptation: 'Adaptacion anatomica',
  hypertrophy: 'Hipertrofia',
  max_strength: 'Fuerza maxima',
  power: 'Potencia',
  muscular_endurance: 'Resistencia muscular',
  peaking: 'Peaking',
  deload: 'Descarga',
  rehab: 'Rehabilitacion',
  maintenance: 'Mantenimiento',
};

const OBJECTIVE_LABELS: Record<TrainingObjective, string> = {
  fat_loss: 'Bajar grasa',
  hypertrophy: 'Hipertrofia',
  max_strength: 'Fuerza maxima',
  recomp: 'Recomposicion',
  sport_performance: 'Rendimiento deportivo',
  power: 'Potencia',
  endurance: 'Resistencia',
  rehab: 'Rehabilitacion',
  general_health: 'Salud general',
  competition_prep: 'Preparacion competitiva',
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

interface PlanProfileSummaryProps {
  studentId: string;
}

export function PlanProfileSummary({ studentId }: PlanProfileSummaryProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentPlanProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PlanProfileService.get(studentId)
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;

  if (!profile) {
    return (
      <button
        onClick={() => navigate(`/clients/${studentId}/plan-intro`)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-violet-300 dark:border-violet-500/30 bg-violet-50/30 dark:bg-violet-500/5 text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Target size={16} />
          Sin perfil de entrenamiento
        </span>
        <ChevronRight size={16} />
      </button>
    );
  }

  const items = [
    {
      icon: Target,
      label: 'Fase',
      value: PHASE_LABELS[profile.current_phase] ?? profile.current_phase,
      sub: profile.phase_duration_weeks ? `${profile.phase_duration_weeks} sem` : null,
    },
    {
      icon: Shield,
      label: 'Objetivo',
      value: OBJECTIVE_LABELS[profile.primary_objective] ?? profile.primary_objective,
      sub: null,
    },
    {
      icon: Calendar,
      label: 'Frecuencia',
      value: profile.sessions_per_week ? `${profile.sessions_per_week}x / semana` : '—',
      sub: null,
    },
    {
      icon: Clock,
      label: 'Duracion',
      value: profile.session_duration_min ? `${profile.session_duration_min} min` : '—',
      sub: EXPERIENCE_LABELS[profile.experience_level] ?? null,
    },
  ];

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10 shrink-0 mt-0.5">
              <item.icon size={13} className="text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {item.value}
              </p>
              {item.sub && (
                <p className="text-[11px] text-slate-400">{item.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {profile.injuries_limitations && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 truncate">
            {profile.injuries_limitations}
          </p>
        </div>
      )}
    </Card>
  );
}
