import React from 'react';
import { AlertTriangle, TrendingUp, Target, Info } from 'lucide-react';

interface AIAnalysisContentProps {
  content: string;
}

interface AnalysisShape {
  resumen: string;
  preocupaciones: string[];
  positivos: string[];
  sugerencias: string[];
  nota: string | null;
}

function parseAnalysis(content: string): AnalysisShape | null {
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') return null;
    const resumen = typeof parsed.resumen === 'string' ? parsed.resumen : '';
    const preocupaciones = Array.isArray(parsed.preocupaciones)
      ? parsed.preocupaciones.filter((x: any): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const positivos = Array.isArray(parsed.positivos)
      ? parsed.positivos.filter((x: any): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const sugerencias = Array.isArray(parsed.sugerencias)
      ? parsed.sugerencias.filter((x: any): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const nota = typeof parsed.nota === 'string' && parsed.nota.trim().length > 0 ? parsed.nota : null;

    if (!resumen && sugerencias.length === 0 && preocupaciones.length === 0 && positivos.length === 0) {
      return null;
    }
    return { resumen, preocupaciones, positivos, sugerencias, nota };
  } catch {
    return null;
  }
}

const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  items: string[];
  theme: 'rose' | 'emerald' | 'indigo';
}> = ({ title, icon: Icon, items, theme }) => {
  if (items.length === 0) return null;

  const themes = {
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      border: 'border-rose-200 dark:border-rose-500/20',
      iconColor: 'text-rose-500',
      titleColor: 'text-rose-700 dark:text-rose-300',
      dotColor: 'bg-rose-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      iconColor: 'text-emerald-500',
      titleColor: 'text-emerald-700 dark:text-emerald-300',
      dotColor: 'bg-emerald-400',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      border: 'border-indigo-200 dark:border-indigo-500/20',
      iconColor: 'text-indigo-500',
      titleColor: 'text-indigo-700 dark:text-indigo-300',
      dotColor: 'bg-indigo-400',
    },
  }[theme];

  return (
    <div className={`rounded-xl border ${themes.bg} ${themes.border} px-3 py-2.5`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={14} className={themes.iconColor} />
        <h4 className={`text-[11px] font-bold uppercase tracking-wider ${themes.titleColor}`}>
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200 leading-snug">
            <span className={`w-1.5 h-1.5 rounded-full ${themes.dotColor} shrink-0 mt-1.5`} />
            <span className="min-w-0 flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const AIAnalysisContent: React.FC<AIAnalysisContentProps> = ({ content }) => {
  const analysis = parseAnalysis(content);

  if (!analysis) {
    return (
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {analysis.resumen && (
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
          {analysis.resumen}
        </p>
      )}

      <Section
        title="Preocupaciones"
        icon={AlertTriangle}
        items={analysis.preocupaciones}
        theme="rose"
      />

      <Section
        title="Positivos"
        icon={TrendingUp}
        items={analysis.positivos}
        theme="emerald"
      />

      <Section
        title="Sugerencias"
        icon={Target}
        items={analysis.sugerencias}
        theme="indigo"
      />

      {analysis.nota && (
        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 italic pt-1">
          <Info size={12} className="shrink-0 mt-0.5" />
          <span>{analysis.nota}</span>
        </div>
      )}
    </div>
  );
};
