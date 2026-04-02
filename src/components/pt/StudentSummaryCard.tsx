import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { StudentSummaryService } from '../../services/pt/StudentSummaryService';

interface StudentSummaryCardProps {
  studentId: string;
  gymId: string;
  studentName?: string;
}

export const StudentSummaryCard: React.FC<StudentSummaryCardProps> = ({ studentId, gymId, studentName }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    StudentSummaryService.generateSummary(studentId, gymId, studentName)
      .then((text) => {
        if (!cancelled) setSummary(text);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [studentId, gymId, studentName]);

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
      <div className="flex items-center gap-2 mb-2">
        <FileText size={16} className="text-indigo-500" />
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Resumen
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {summary}
      </p>
    </div>
  );
};
