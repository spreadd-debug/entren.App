import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, PlayCircle, Loader2, HeartPulse, Dumbbell,
  BarChart3, AlertTriangle, Sparkles, RefreshCw, ClipboardList,
} from 'lucide-react';
import { Card, Button } from '../components/UI';
import { WellnessQuickView } from '../components/pt/WellnessQuickView';
import { ExerciseHistoryTable } from '../components/pt/ExerciseHistoryTable';
import { ProgressionMetricsCards } from '../components/pt/ProgressionMetricsCards';
import { AlertsList } from '../components/pt/AlertsList';
import { PlanProfileSummary } from '../components/pt/PlanProfileSummary';
import { TodayRoutinePreview } from '../components/pt/TodayRoutinePreview';
import { AIAnalysisContent } from '../components/pt/AIAnalysisContent';
import { PreSessionService } from '../services/pt/PreSessionService';
import type { PreSessionData } from '../services/pt/PreSessionService';
import { AIAnalysisService } from '../services/pt/AIAnalysisService';
import type { Student, AIAnalysis } from '../../shared/types';

interface PreSessionDashboardViewProps {
  student: Student;
  gymId: string;
  onBack: () => void;
  onStartSession: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays} dias`;
}

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({
  icon: Icon,
  title,
  subtitle,
}) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="p-1.5 rounded-lg bg-indigo-500/10">
      <Icon size={16} className="text-indigo-500" />
    </div>
    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      {subtitle && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
      )}
    </div>
  </div>
);

const PreSessionDashboardView: React.FC<PreSessionDashboardViewProps> = ({
  student,
  gymId,
  onBack,
  onStartSession,
}) => {
  const [data, setData] = useState<PreSessionData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const clientName = String(
    (student as any).name ||
    `${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim() ||
    'Cliente'
  );

  const handleRequestAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await AIAnalysisService.requestAnalysis(gymId, student.id);
      setAiAnalysis(result);
    } catch (err: any) {
      setAiError(err?.message ?? 'Error al generar analisis');
    } finally {
      setAiLoading(false);
    }
  }, [gymId, student.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      PreSessionService.getPreSessionData(student.id, gymId),
      AIAnalysisService.getLatest(student.id).catch(() => null),
    ]).then(([dataRes, aiRes]) => {
      if (cancelled) return;
      if (dataRes.status === 'fulfilled') setData(dataRes.value);
      if (aiRes.status === 'fulfilled') setAiAnalysis(aiRes.value);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [student.id, gymId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Preparando datos de sesion...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No se pudieron cargar los datos.</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>Volver</Button>
      </div>
    );
  }

  const dangerAlerts = data.alerts.filter((a) => a.severity === 'danger');
  const warningAlerts = data.alerts.filter((a) => a.severity === 'warning');
  const otherAlerts = data.alerts.filter((a) => a.severity !== 'danger' && a.severity !== 'warning');

  return (
    <div className="space-y-4 pb-36">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Preparar sesion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{clientName}</p>
        </div>
      </div>

      {/* Plan Profile Summary */}
      <PlanProfileSummary studentId={student.id} />

      {/* Block 1: AI Analysis */}
      {aiAnalysis ? (
        <Card className="p-4 border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader
              icon={Sparkles}
              title="Analisis inteligente"
              subtitle={formatRelativeDate(aiAnalysis.created_at)}
            />
            <button
              onClick={handleRequestAnalysis}
              disabled={aiLoading}
              className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
              title="Reanalizar"
            >
              <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <AIAnalysisContent content={aiAnalysis.content} />
        </Card>
      ) : (
        <Card className="p-4 border-dashed border-indigo-300 dark:border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                {aiLoading ? 'Generando analisis...' : 'Analisis inteligente con IA'}
              </span>
            </div>
            {!aiLoading ? (
              <button
                onClick={handleRequestAnalysis}
                className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
              >
                Generar
              </button>
            ) : (
              <Loader2 size={16} className="animate-spin text-indigo-500" />
            )}
          </div>
          {aiError && (
            <p className="text-xs text-rose-500 mt-2">{aiError}</p>
          )}
        </Card>
      )}

      {/* Urgent alerts (danger) at the top */}
      {dangerAlerts.length > 0 && (
        <Card className="p-4">
          <SectionHeader icon={AlertTriangle} title="Atencion urgente" />
          <AlertsList alerts={dangerAlerts} />
        </Card>
      )}

      {/* Today's Routine */}
      <Card className="p-4">
        <SectionHeader icon={ClipboardList} title="Rutina de hoy" subtitle="Plan de entrenamiento" />
        <TodayRoutinePreview studentId={student.id} gymId={gymId} />
      </Card>

      {/* Block 2: Wellness */}
      <Card className="p-4">
        <SectionHeader
          icon={HeartPulse}
          title="Estado actual"
          subtitle="Check-ins de la ultima semana"
        />
        <WellnessQuickView
          today={data.wellness.today}
          history={data.wellness.history}
          averages={data.wellness.averages}
        />
      </Card>

      {/* Block 3: Exercise History */}
      <Card className="p-4">
        <SectionHeader
          icon={Dumbbell}
          title="Historial de ejercicios"
          subtitle={data.lastSessionDate ? `Ultima sesion: ${formatRelativeDate(data.lastSessionDate)}` : undefined}
        />
        <ExerciseHistoryTable exerciseHistory={data.exerciseHistory} sessions={data.sessions} />
      </Card>

      {/* Block 4: Progression Metrics */}
      <Card className="p-4">
        <SectionHeader
          icon={BarChart3}
          title="Metricas de progresion"
          subtitle="Ultimas 6 semanas"
        />
        <ProgressionMetricsCards metrics={data.progressionMetrics} />
      </Card>

      {/* Block 5: Warnings + Info Alerts */}
      {(warningAlerts.length > 0 || otherAlerts.length > 0) && (
        <Card className="p-4">
          <SectionHeader icon={AlertTriangle} title="Alertas y notas" />
          <AlertsList alerts={[...warningAlerts, ...otherAlerts]} />
        </Card>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 z-40">
        <Button
          fullWidth
          className="gap-2 py-4 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl"
          onClick={onStartSession}
        >
          <PlayCircle size={22} />
          Iniciar Sesion
        </Button>
      </div>
    </div>
  );
};

export default PreSessionDashboardView;
