import React from 'react';
import { Target, Brain, TrendingUp, ArrowRight, X } from 'lucide-react';
import type { Student } from '../../shared/types';

interface PlanProfileIntroProps {
  student: Student;
  onContinue: () => void;
  onSkip: () => void;
}

const PlanProfileIntro: React.FC<PlanProfileIntroProps> = ({ student, onContinue, onSkip }) => {
  const studentName = (student as any).name ?? (`${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim() || 'tu alumno');

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
          <Brain size={36} className="text-white" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            Armemos el plan de {studentName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Completar el perfil de entrenamiento mejora la calidad de los analisis de IA y te ayuda a tener toda la estrategia organizada.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Target size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Objetivos claros</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Defini que quiere lograr y como lo vas a entrenar</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Brain size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">IA mas precisa</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Los analisis se alinean con tu metodologia y fase actual</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Sugerencias accionables</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pesos, reps y ejercicios concretos en vez de consejos genericos</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onContinue}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
          >
            Armar plan ahora
            <ArrowRight size={18} />
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 text-slate-400 dark:text-slate-500 text-sm font-semibold hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            Hacerlo despues
          </button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Toma menos de 2 minutos. Podes editarlo cuando quieras.
        </p>
      </div>
    </div>
  );
};

export default PlanProfileIntro;
