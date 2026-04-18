import React, { useEffect, useState } from 'react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { StudentSummaryService } from '../../services/pt/StudentSummaryService';

interface StudentSummaryCardProps {
  studentId: string;
  gymId: string;
  studentName?: string;
}

export const StudentSummaryCard: React.FC<StudentSummaryCardProps> = ({ studentId, gymId, studentName }) => {
  // Read cache synchronously so re-mounts (tab switch) don't flicker a loader.
  const [summary, setSummary] = useState<string | null>(() => StudentSummaryService.getCached(studentId));
  const [loading, setLoading] = useState(() => StudentSummaryService.getCached(studentId) === null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const cached = StudentSummaryService.getCached(studentId);
    if (cached) {
      setSummary(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    StudentSummaryService.generateSummary(studentId, gymId, studentName)
      .then((text) => { if (!cancelled) setSummary(text); })
      .catch(() => { if (!cancelled) setSummary(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId, gymId, studentName]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const text = await StudentSummaryService.generateSummary(studentId, gymId, studentName, { force: true });
      setSummary(text);
    } catch {
      // keep existing summary on error
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Generando resumen...</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-500" />
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Resumen
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
          title="Actualizar resumen"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {summary}
      </p>
    </div>
  );
};
