import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, User, Target, Dumbbell, Settings2 } from 'lucide-react';
import { Card } from '../components/UI';
import { PlanProfileService } from '../services/pt/PlanProfileService';
import type {
  StudentPlanProfile, StudentType, ExperienceLevel, SportSeason,
  TrainingObjective, GoalTimeframe, TrainingPhase, PeriodizationModel,
  ProgressionMethod, RepRange, NutritionStrategy, SpecialTechnique,
  Student,
} from '../../shared/types';

// ─── Label maps ──────────────────────────────────────────────────────────────

const STUDENT_TYPE_LABELS: Record<StudentType, string> = {
  general: 'Persona general',
  amateur_athlete: 'Deportista amateur',
  competitive_athlete: 'Deportista competitivo',
  rehab: 'Rehabilitacion / Post-lesion',
  senior: 'Adulto mayor',
  postpartum: 'Post-parto',
};

const SPORT_OPTIONS = [
  'Futbol', 'Rugby', 'Tenis', 'Padel', 'Running', 'Natacion', 'Basketball',
  'Artes marciales/MMA', 'CrossFit', 'Powerlifting', 'Halterofilia', 'Ciclismo',
  'Triatlon', 'Volley', 'Hockey', 'Otro',
];

const SEASON_LABELS: Record<SportSeason, string> = {
  preseason: 'Pretemporada',
  in_season: 'En temporada',
  offseason: 'Post-temporada / Transicion',
  none: 'Sin temporada definida',
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Principiante (< 6 meses)',
  intermediate: 'Intermedio (6m - 2 anos)',
  advanced: 'Avanzado (2+ anos)',
};

const OBJECTIVE_LABELS: Record<TrainingObjective, string> = {
  fat_loss: 'Perder grasa / Bajar de peso',
  hypertrophy: 'Ganar masa muscular / Hipertrofia',
  max_strength: 'Ganar fuerza maxima',
  recomp: 'Recomposicion corporal',
  sport_performance: 'Mejorar rendimiento deportivo',
  power: 'Mejorar potencia / Explosividad',
  endurance: 'Mejorar resistencia cardiovascular',
  rehab: 'Rehabilitacion / Recuperar movilidad',
  general_health: 'Mejorar salud general',
  competition_prep: 'Preparacion para competencia',
};

const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  '1_month': '1 mes',
  '2_months': '2 meses',
  '3_months': '3 meses',
  '6_months': '6 meses',
  '1_year': '1 ano',
  'no_deadline': 'Sin plazo',
};

const PHASE_LABELS: Record<TrainingPhase, string> = {
  anatomical_adaptation: 'Adaptacion anatomica / Base',
  hypertrophy: 'Hipertrofia',
  max_strength: 'Fuerza maxima',
  power: 'Potencia / Pliometria',
  muscular_endurance: 'Resistencia muscular',
  peaking: 'Peaking / Competencia',
  deload: 'Deload / Descarga',
  rehab: 'Rehabilitacion / Correctivo',
  maintenance: 'Mantenimiento',
};

const PERIODIZATION_LABELS: Record<PeriodizationModel, string> = {
  linear: 'Lineal clasica',
  daily_undulating: 'Ondulante diaria (DUP)',
  weekly_undulating: 'Ondulante semanal',
  block: 'Por bloques',
  autoregulated: 'Autoregulada (RPE/RIR)',
  none: 'Sin periodizacion formal',
};

const PROGRESSION_LABELS: Record<ProgressionMethod, string> = {
  linear_weight: 'Progresion lineal de peso',
  double_progression: 'Doble progresion',
  volume: 'Progresion de volumen',
  rpe: 'Autoregulacion por RPE',
  percentage_1rm: 'Porcentajes de 1RM',
  session_by_session: 'Lo decido en el momento',
};

const REP_RANGE_LABELS: Record<RepRange, string> = {
  '1-5': '1-5 (fuerza/potencia)',
  '6-8': '6-8 (fuerza-hipertrofia)',
  '8-12': '8-12 (hipertrofia)',
  '12-15': '12-15 (hipertrofia-resistencia)',
  '15-20': '15-20+ (resistencia muscular)',
  'mixed': 'Mixto',
};

const NUTRITION_LABELS: Record<NutritionStrategy, string> = {
  deficit: 'Deficit calorico',
  surplus: 'Superavit calorico',
  maintenance: 'Mantenimiento',
  specific_diet: 'Dieta especifica',
  not_managed: 'No manejo su nutricion',
};

const TECHNIQUE_LABELS: Record<SpecialTechnique, string> = {
  tempo: 'Tempo controlado',
  pauses: 'Pausas isometricas',
  drop_sets: 'Drop sets / Series descendentes',
  rest_pause: 'Rest-pause',
  supersets: 'Superseries / Biseries / Triseries',
  pre_fatigue: 'Pre-fatiga',
  mechanical_sets: 'Series mecanicas',
  cluster_sets: 'Cluster sets',
  amrap: 'AMRAP',
  eccentrics: 'Excentricos lentos / Negativas',
  plyometrics: 'Pliometria',
  speed_work: 'Trabajo de velocidad',
  circuits: 'Circuitos',
};

const DAYS = [
  { key: 'monday', label: 'L' },
  { key: 'tuesday', label: 'M' },
  { key: 'wednesday', label: 'X' },
  { key: 'thursday', label: 'J' },
  { key: 'friday', label: 'V' },
  { key: 'saturday', label: 'S' },
  { key: 'sunday', label: 'D' },
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

const STEP_ICONS = [User, Target, Dumbbell, Settings2];
const STEP_TITLES = ['Tu alumno', 'Objetivos', 'Metodologia', 'Contexto'];

// ─── Form state ──────────────────────────────────────────────────────────────

type FormState = Omit<StudentPlanProfile, 'id' | 'gym_id' | 'student_id' | 'created_at' | 'updated_at'>;

const DEFAULT_FORM: FormState = {
  student_type: 'general',
  sport: null,
  sport_season: null,
  experience_level: 'beginner',
  age: null,
  biological_sex: null,
  injuries_limitations: null,
  available_days: [],
  sessions_per_week: null,
  session_duration_min: null,
  primary_objective: 'general_health',
  secondary_objective: null,
  numeric_goal: null,
  goal_deadline: null,
  goal_timeframe: null,
  current_phase: 'anatomical_adaptation',
  phase_duration_weeks: null,
  phase_start_date: null,
  next_phase: null,
  periodization_model: 'none',
  progression_method: 'session_by_session',
  rep_range: 'mixed',
  special_techniques: [],
  methodology_notes: null,
  nutrition_strategy: 'not_managed',
  nutrition_detail: null,
  lifestyle_factors: null,
  equipment_restrictions: null,
  schedule_considerations: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  options: Record<string, string> | string[];
  placeholder?: string;
}) {
  const entries = Array.isArray(options)
    ? options.map((o) => [o, o])
    : Object.entries(options);

  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {entries.map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, multiline }: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls = "w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors";
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cls + ' resize-none'}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, placeholder, min, max }: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
      />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PlanProfileWizardProps {
  student: Student;
  gymId: string;
  onBack: () => void;
  onSaved: () => void;
}

const PlanProfileWizard: React.FC<PlanProfileWizardProps> = ({ student, gymId, onBack, onSaved }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const studentName = (student as any).name ?? (`${(student as any).nombre ?? ''} ${(student as any).apellido ?? ''}`.trim() || 'Alumno');

  // Load existing profile
  useEffect(() => {
    PlanProfileService.get(student.id)
      .then((p) => {
        if (p) {
          setIsEdit(true);
          const { id, gym_id, student_id, created_at, updated_at, ...rest } = p;
          setForm({ ...DEFAULT_FORM, ...rest });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [student.id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await PlanProfileService.save(student.id, gymId, form);
      onSaved();
    } catch (e) {
      console.error('Error saving plan profile:', e);
    } finally {
      setSaving(false);
    }
  };

  const isAthlete = form.student_type === 'amateur_athlete' || form.student_type === 'competitive_athlete';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Cargando perfil...</p>
      </div>
    );
  }

  // ─── Step renderers ──────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-4">
      <SelectField
        label="Tipo de alumno"
        value={form.student_type}
        onChange={(v) => {
          update('student_type', v as StudentType);
          if (v !== 'amateur_athlete' && v !== 'competitive_athlete') {
            update('sport', null);
            update('sport_season', null);
          }
        }}
        options={STUDENT_TYPE_LABELS}
      />

      {isAthlete && (
        <SelectField
          label="Deporte"
          value={form.sport}
          onChange={(v) => update('sport', v || null)}
          options={SPORT_OPTIONS}
          placeholder="Seleccionar deporte..."
        />
      )}

      {form.student_type === 'competitive_athlete' && (
        <SelectField
          label="Temporada deportiva"
          value={form.sport_season}
          onChange={(v) => update('sport_season', (v || null) as SportSeason | null)}
          options={SEASON_LABELS}
          placeholder="Seleccionar..."
        />
      )}

      <SelectField
        label="Nivel de experiencia en el gym"
        value={form.experience_level}
        onChange={(v) => update('experience_level', v as ExperienceLevel)}
        options={EXPERIENCE_LABELS}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Edad"
          value={form.age}
          onChange={(v) => update('age', v)}
          placeholder="Ej: 28"
          min={10}
          max={100}
        />
        <SelectField
          label="Sexo biologico"
          value={form.biological_sex}
          onChange={(v) => update('biological_sex', (v || null) as 'male' | 'female' | null)}
          options={{ male: 'Masculino', female: 'Femenino' }}
          placeholder="Seleccionar..."
        />
      </div>

      <TextField
        label="Lesiones, patologias o limitaciones"
        value={form.injuries_limitations}
        onChange={(v) => update('injuries_limitations', v || null)}
        placeholder="Ej: Hernia de disco L4-L5, dolor de hombro derecho..."
        multiline
      />

      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Dias disponibles</label>
        <div className="flex gap-2">
          {DAYS.map((d) => {
            const selected = form.available_days.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  update('available_days', selected
                    ? form.available_days.filter((x) => x !== d.key)
                    : [...form.available_days, d.key]);
                }}
                className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                  selected
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Sesiones por semana"
          value={form.sessions_per_week}
          onChange={(v) => update('sessions_per_week', v)}
          placeholder="Ej: 4"
          min={1}
          max={7}
        />
        <SelectField
          label="Duracion por sesion"
          value={form.session_duration_min?.toString() ?? null}
          onChange={(v) => update('session_duration_min', v ? Number(v) : null)}
          options={Object.fromEntries(DURATION_OPTIONS.map((d) => [d.toString(), `${d} min`]))}
          placeholder="Seleccionar..."
        />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <SelectField
        label="Objetivo principal"
        value={form.primary_objective}
        onChange={(v) => update('primary_objective', v as TrainingObjective)}
        options={OBJECTIVE_LABELS}
      />

      <SelectField
        label="Objetivo secundario (opcional)"
        value={form.secondary_objective}
        onChange={(v) => update('secondary_objective', (v || null) as TrainingObjective | null)}
        options={Object.fromEntries(
          Object.entries(OBJECTIVE_LABELS).filter(([k]) => k !== form.primary_objective)
        )}
        placeholder="Sin objetivo secundario"
      />

      <TextField
        label="Meta concreta"
        value={form.numeric_goal}
        onChange={(v) => update('numeric_goal', v || null)}
        placeholder={
          form.primary_objective === 'fat_loss' ? 'Ej: Llegar a 75kg, bajar a 15% grasa'
          : form.primary_objective === 'hypertrophy' ? 'Ej: Llegar a 85kg'
          : form.primary_objective === 'max_strength' ? 'Ej: Sentadilla 140kg, Press Banca 100kg'
          : form.primary_objective === 'sport_performance' ? 'Ej: Mejorar sprint 30m, saltar mas alto'
          : form.primary_objective === 'competition_prep' ? 'Ej: Competencia categoria -83kg el 15/06'
          : form.primary_objective === 'rehab' ? 'Ej: Volver a correr sin dolor'
          : 'Ej: Describir meta concreta...'
        }
        multiline
      />

      <SelectField
        label="Plazo estimado"
        value={form.goal_timeframe}
        onChange={(v) => update('goal_timeframe', (v || null) as GoalTimeframe | null)}
        options={TIMEFRAME_LABELS}
        placeholder="Seleccionar plazo..."
      />

      {form.goal_timeframe && form.goal_timeframe !== 'no_deadline' && (
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Fecha limite (opcional)</label>
          <input
            type="date"
            value={form.goal_deadline ?? ''}
            onChange={(e) => update('goal_deadline', e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
          />
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <SelectField
        label="Fase actual de entrenamiento"
        value={form.current_phase}
        onChange={(v) => update('current_phase', v as TrainingPhase)}
        options={PHASE_LABELS}
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Duracion de esta fase"
          value={form.phase_duration_weeks?.toString() ?? null}
          onChange={(v) => update('phase_duration_weeks', v ? Number(v) : null)}
          options={{ '2': '2 sem', '3': '3 sem', '4': '4 sem', '6': '6 sem', '8': '8 sem' }}
          placeholder="Indefinida"
        />
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Inicio de fase</label>
          <input
            type="date"
            value={form.phase_start_date ?? ''}
            onChange={(e) => update('phase_start_date', e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <SelectField
        label="Proxima fase planificada (opcional)"
        value={form.next_phase}
        onChange={(v) => update('next_phase', (v || null) as TrainingPhase | null)}
        options={Object.fromEntries(
          Object.entries(PHASE_LABELS).filter(([k]) => k !== form.current_phase)
        )}
        placeholder="Sin definir"
      />

      <SelectField
        label="Modelo de periodizacion"
        value={form.periodization_model}
        onChange={(v) => update('periodization_model', v as PeriodizationModel)}
        options={PERIODIZATION_LABELS}
      />

      <SelectField
        label="Metodo de progresion"
        value={form.progression_method}
        onChange={(v) => update('progression_method', v as ProgressionMethod)}
        options={PROGRESSION_LABELS}
      />

      <SelectField
        label="Rango de repeticiones principal"
        value={form.rep_range}
        onChange={(v) => update('rep_range', v as RepRange)}
        options={REP_RANGE_LABELS}
      />

      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Tecnicas o metodos especiales</label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(TECHNIQUE_LABELS) as [SpecialTechnique, string][]).map(([key, label]) => {
            const selected = form.special_techniques.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  update('special_techniques', selected
                    ? form.special_techniques.filter((t) => t !== key)
                    : [...form.special_techniques, key]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selected
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <TextField
        label="Notas de metodologia"
        value={form.methodology_notes}
        onChange={(v) => update('methodology_notes', v || null)}
        placeholder="Ej: Semana 3 de 6 del bloque de hipertrofia. Priorizo compuestos. Tiene cifosis, siempre meter espalda alta. No le gustan sentadillas frontales..."
        multiline
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <SelectField
        label="Estrategia nutricional"
        value={form.nutrition_strategy}
        onChange={(v) => update('nutrition_strategy', v as NutritionStrategy)}
        options={NUTRITION_LABELS}
      />

      {form.nutrition_strategy === 'specific_diet' && (
        <TextField
          label="Detalle de dieta"
          value={form.nutrition_detail}
          onChange={(v) => update('nutrition_detail', v || null)}
          placeholder="Ej: Dieta cetogenica, ayuno intermitente 16:8..."
          multiline
        />
      )}

      <TextField
        label="Factores de estilo de vida"
        value={form.lifestyle_factors}
        onChange={(v) => update('lifestyle_factors', v || null)}
        placeholder="Ej: Trabaja de noche. Viaja mucho. Tiene hijos chicos. Se frustra si no ve resultados..."
        multiline
      />

      <TextField
        label="Restricciones de equipamiento"
        value={form.equipment_restrictions}
        onChange={(v) => update('equipment_restrictions', v || null)}
        placeholder="Ej: Gym chico sin rack. Solo mancuernas hasta 30kg. A veces entrena en casa con bandas..."
        multiline
      />

      <TextField
        label="Consideraciones de agenda"
        value={form.schedule_considerations}
        onChange={(v) => update('schedule_considerations', v || null)}
        placeholder="Ej: Sabados tiene partido de rugby. Lunes llega cansado del finde. Miercoles solo puede 45min..."
        multiline
      />
    </div>
  );

  const STEPS = [renderStep0, renderStep1, renderStep2, renderStep3];
  const totalSteps = STEPS.length;
  const canGoNext = step < totalSteps - 1;
  const canGoBack = step > 0;

  return (
    <div className="space-y-4 pb-36">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {isEdit ? 'Editar plan' : 'Plan de entrenamiento'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{studentName}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEP_TITLES.map((title, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/10'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDone ? 'bg-emerald-500 text-white'
                : isActive ? 'bg-indigo-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}>
                {isDone ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span className={`text-[10px] font-bold ${
                isActive ? 'text-indigo-600 dark:text-indigo-400'
                : isDone ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500'
              }`}>
                {title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form content */}
      <Card className="p-4">
        {STEPS[step]()}
      </Card>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex gap-3 z-40">
        {canGoBack && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Anterior
          </button>
        )}

        {canGoNext ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check size={16} />
                {isEdit ? 'Actualizar plan' : 'Guardar plan'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanProfileWizard;
