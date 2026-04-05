
export type StudentStatus = 'active' | 'inactive' | 'expiring' | 'expired';
export type ScholarshipType = 'none' | 'partial' | 'complete';
export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago';

export type GymType = 'gym' | 'personal_trainer';

export interface Gym {
  id: string;
  name: string;
  owner_email: string;
  owner_phone?: string;
  gym_type: GymType;
  created_at: string;
}

export interface Student {
  id: string;
  gym_id: string;
  name: string;
  lastName: string;
  apellido?: string; // For compatibility
  phone: string;
  planId: string;
  planName: string;
  status: StudentStatus;
  lastPaymentDate: string;
  nextDueDate: string;
  observations?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  debt: number;
  // Billing
  cobra_cuota: boolean;
  recordatorio_automatico: boolean;
  precio_personalizado?: number;
  tipo_beca: ScholarshipType;
  observaciones_cobranza?: string;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: 'completed' | 'pending' | 'cancelled';
  nextDueDate: string;
  created_at: string;
}

export interface ReminderRule {
  id: string;
  gym_id: string;
  name: string;
  code: string;
  triggerType: 'before' | 'on_day' | 'after';
  offsetDays: number;
  active: boolean;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  gym_id: string;
  title: string;
  code: string;
  body: string;
  active: boolean;
  created_at: string;
}

export interface ReminderLog {
  id: string;
  gym_id: string;
  studentId: string;
  ruleCode: string;
  scheduledFor: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel: 'whatsapp' | 'email';
  messagePreview: string;
  error?: string;
  created_at: string;
}

export interface AutomationStatus {
  lastRun: string | null;
  nextRun: string | null;
  lastResult: {
    totalEvaluated: number;
    totalEligible: number;
    totalGenerated: number;
    totalIgnored: number;
  } | null;
}

export interface DashboardStats {
  activeCount: number;
  expiredCount: number;
  expiringCount: number;
  monthlyIncome: number;
  pendingStudents: Student[];
}

export interface GymSettings {
  gym_id: string;
  shifts_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id: string;
  gym_id: string;
  name: string;
  day_of_week: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  capacity: number;
  created_at?: string;
}

export interface ShiftStudent {
  id: string;
  shift_id: string;
  student_id: string;
  created_at?: string;
}

export interface ShiftWithStudents extends Shift {
  enrolledStudents: Array<{
    id: string;
    displayName: string;
    phone: string;
    status: string;
    cobra_cuota: boolean;
    nextDueDate: string | null;
  }>;
}

export interface CheckIn {
  id: string;
  gym_id: string;
  student_id: string;
  checked_in_at: string;
}

// ─── Workout (multi-option, sessions, requests) ───────────────────────────────

/** Una rutina disponible para un alumno (fila de student_workout_assignments + plan info) */
export interface WorkoutOption {
  id: string;             // assignment id
  gym_id: string;
  student_id: string;
  workout_plan_id: string;
  plan_name: string;
  plan_description: string | null;
  /** Fecha de última modificación de la asignación — base para calcular antigüedad */
  updated_at: string;
  created_at: string;
  /** Días habilitados para esta rutina (0=Dom, 1=Lun, ..., 6=Sáb). null = cualquier día */
  days_of_week: number[] | null;
}

/** Sesión diaria de entrenamiento elegida por el alumno */
export interface WorkoutSession {
  id: string;
  gym_id: string;
  student_id: string;
  workout_plan_id: string;
  session_date: string;   // "YYYY-MM-DD"
  completed_at: string | null;
  created_at: string;
  // PT session tracking fields
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number | null;
  total_volume: number | null;
  pt_notes: string | null;
  status: 'in_progress' | 'completed';
}

/** Estado de un ejercicio dentro de una sesión (checklist) */
export interface WorkoutSessionExercise {
  id: string;
  session_id: string;
  workout_exercise_id: string;
  completed: boolean;
  created_at: string;
  // Datos del ejercicio (join de workout_exercises)
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number | null;
  notes: string | null;
  video_url: string | null;
  exercise_order: number;
}

/** Registro de una serie dentro de un ejercicio de sesión */
export interface SessionSet {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps_done: number | null;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
}

/** Solicitud del alumno para que el profe actualice su rutina */
export interface WorkoutUpdateRequest {
  id: string;
  gym_id: string;
  student_id: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

// ─── Personal Trainer ────────────────────────────────────────────────────────

export interface ClientAnthropometry {
  id: string;
  gym_id: string;
  student_id: string;
  measured_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number | null;
  notes: string | null;
  created_at: string;
}

export interface ClientMeasurement {
  id: string;
  gym_id: string;
  student_id: string;
  measured_at: string;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  bicep_l_cm: number | null;
  bicep_r_cm: number | null;
  thigh_l_cm: number | null;
  thigh_r_cm: number | null;
  calf_l_cm: number | null;
  calf_r_cm: number | null;
  shoulders_cm: number | null;
  neck_cm: number | null;
  notes: string | null;
  created_at: string;
}

export type GoalType = 'lose_weight' | 'gain_muscle' | 'rehab' | 'flexibility' | 'endurance' | 'strength' | 'general_fitness' | 'other';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned';

export interface ClientGoal {
  id: string;
  gym_id: string;
  student_id: string;
  goal_type: GoalType;
  description: string | null;
  target_value: string | null;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export type NoteCategory = 'progress' | 'injury' | 'nutrition' | 'motivation' | 'other';

export interface SessionNote {
  id: string;
  gym_id: string;
  student_id: string;
  session_id: string | null;
  note_date: string;
  content: string;
  category: NoteCategory | null;
  created_at: string;
}

// ─── Nutrition Plans ────────────────────────────────────────────────────────

export type NutritionPlanStatus = 'active' | 'archived';
export type MealLabel = 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena' | 'Snack';

export interface NutritionPlan {
  id: string;
  gym_id: string;
  student_id: string;
  title: string;
  description: string | null;
  calories_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  status: NutritionPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface NutritionItem {
  id: string;
  plan_id: string;
  meal_label: MealLabel;
  food_name: string;
  portion: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  item_order: number;
  created_at: string;
}

// ─── Wellness Check-in ──────────────────────────────────────────────────────

export interface WellnessCheckIn {
  id: string;
  gym_id: string;
  student_id: string;
  checkin_date: string;    // "YYYY-MM-DD"
  energy: number;          // 1-5
  sleep_quality: number;   // 1-5
  mood: number;            // 1-5
  soreness: number;        // 1-5
  notes: string | null;
  created_at: string;
}

// ─── Progress Photos ────────────────────────────────────────────────────────

export type PhotoAngle = 'front' | 'side_left' | 'side_right' | 'back';

export interface ProgressPhoto {
  id: string;
  gym_id: string;
  student_id: string;
  photo_date: string;
  storage_path: string;
  photo_url: string;
  angle: PhotoAngle;
  notes: string | null;
  created_at: string;
}

// ─── PT Shift Payments ─────────────────────────────────────────────────────

export type ShiftPaymentStatus = 'paid' | 'unpaid';

export interface PTShiftPayment {
  id: string;
  gym_id: string;
  shift_id: string;
  student_id: string;
  payment_date: string;      // "YYYY-MM-DD" — actual date of the shift
  amount: number;
  payment_method: PaymentMethod;
  status: ShiftPaymentStatus;
  notes: string | null;
  created_at: string;
  // Joined fields (optional)
  student?: { nombre: string; apellido: string };
  shift?: { name: string; start_time: string; end_time: string };
}

// ─── Gym Subscription ────────────────────────────────────────────────────────

export type GymSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type GymPlanTier = 'starter' | 'pro' | 'business';

export interface GymSubscription {
  id: string;
  gym_id: string;
  gym_name: string;
  owner_email: string;
  owner_phone?: string;
  gym_type?: GymType;
  plan_tier: GymPlanTier;
  monthly_price: number | null;
  status: GymSubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_days: number;
  grace_period_ends_at: string | null;
  access_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GymBillingPayment {
  id: string;
  gym_id: string;
  gym_name?: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  payment_method: 'transfer' | 'cash' | 'mercadopago' | 'other';
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

// ─── Smart Planning System ─────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'success';
export type AlertCategory = 'progression' | 'volume' | 'wellness' | 'body' | 'attendance';

export interface StudentAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  message: string;
  detail?: string;
  data: Record<string, any>;
}

export type SemaphoreColor = 'green' | 'yellow' | 'red';

export interface StudentSemaphore {
  color: SemaphoreColor;
  statusText: string;
  alerts: StudentAlert[];
  priorityScore: number;
}

export interface AIAnalysis {
  id: string;
  gym_id: string;
  student_id: string;
  session_id: string | null;
  analysis_type: 'post_session' | 'weekly_review';
  content: string;
  model_used: string;
  tokens_used: number;
  context_json?: any;
  created_at: string;
}

// ─── Student Plan Profiles (PT Planning Wizard) ──────────────────────────────

export type StudentType = 'general' | 'amateur_athlete' | 'competitive_athlete' | 'rehab' | 'senior' | 'postpartum';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type SportSeason = 'preseason' | 'in_season' | 'offseason' | 'none';

export type TrainingObjective = 'fat_loss' | 'hypertrophy' | 'max_strength' | 'recomp' | 'sport_performance' | 'power' | 'endurance' | 'rehab' | 'general_health' | 'competition_prep';
export type GoalTimeframe = '1_month' | '2_months' | '3_months' | '6_months' | '1_year' | 'no_deadline';

export type TrainingPhase = 'anatomical_adaptation' | 'hypertrophy' | 'max_strength' | 'power' | 'muscular_endurance' | 'peaking' | 'deload' | 'rehab' | 'maintenance';
export type PeriodizationModel = 'linear' | 'daily_undulating' | 'weekly_undulating' | 'block' | 'autoregulated' | 'none';
export type ProgressionMethod = 'linear_weight' | 'double_progression' | 'volume' | 'rpe' | 'percentage_1rm' | 'session_by_session';
export type RepRange = '1-5' | '6-8' | '8-12' | '12-15' | '15-20' | 'mixed';
export type NutritionStrategy = 'deficit' | 'surplus' | 'maintenance' | 'specific_diet' | 'not_managed';

export type SpecialTechnique = 'tempo' | 'pauses' | 'drop_sets' | 'rest_pause' | 'supersets' | 'pre_fatigue' | 'mechanical_sets' | 'cluster_sets' | 'amrap' | 'eccentrics' | 'plyometrics' | 'speed_work' | 'circuits';

export interface StudentPlanProfile {
  id: string;
  gym_id: string;
  student_id: string;

  // Step 1: Who
  student_type: StudentType;
  sport: string | null;
  sport_season: SportSeason | null;
  experience_level: ExperienceLevel;
  age: number | null;
  biological_sex: 'male' | 'female' | null;
  injuries_limitations: string | null;
  available_days: string[];
  sessions_per_week: number | null;
  session_duration_min: number | null;

  // Step 2: Goals
  primary_objective: TrainingObjective;
  secondary_objective: TrainingObjective | null;
  numeric_goal: string | null;
  goal_deadline: string | null;
  goal_timeframe: GoalTimeframe | null;

  // Step 3: Methodology
  current_phase: TrainingPhase;
  phase_duration_weeks: number | null;
  phase_start_date: string | null;
  next_phase: TrainingPhase | null;
  periodization_model: PeriodizationModel;
  progression_method: ProgressionMethod;
  rep_range: RepRange;
  special_techniques: SpecialTechnique[];
  methodology_notes: string | null;

  // Step 4: Context
  nutrition_strategy: NutritionStrategy;
  nutrition_detail: string | null;
  lifestyle_factors: string | null;
  equipment_restrictions: string | null;
  schedule_considerations: string | null;

  created_at: string;
  updated_at: string;
}

// ─── Routine Builder v2 ─────────────────────────────────────────────────────

export type BlockType = 'normal' | 'superset' | 'triset' | 'circuit';
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure' | 'backoff';
export type WeightType = 'absolute' | 'bodyweight' | 'rpe_target' | 'percentage_1rm' | 'band' | 'not_specified';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'full_body' | 'forearms' | 'traps' | 'neck' | 'lower_back' | 'mid_back' | 'abductors' | 'adductors';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band' | 'kettlebell' | 'trx' | 'other';

export interface RoutineV2 {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  label: string;
  order: number;
}

export interface RoutineBlock {
  id: string;
  routine_day_id: string;
  block_type: BlockType;
  order: number;
  rest_after_block_sec: number | null;
}

export interface RoutineExercise {
  id: string;
  block_id: string;
  exercise_library_id: string | null;
  exercise_name: string;
  order: number;
  notes: string | null;
  rest_between_sets_sec: number | null;
  tempo: string | null;
}

export interface RoutineSet {
  id: string;
  routine_exercise_id: string;
  set_number: number;
  set_type: SetType;
  reps: number | null;
  reps_max: number | null;
  time_sec: number | null;
  weight_kg: number | null;
  weight_type: WeightType;
  rpe_target: number | null;
  rir_target: number | null;
  notes: string | null;
}

export interface RoutineAssignment {
  id: string;
  routine_id: string;
  student_id: string;
  day_mapping: Record<string, string>;
  assigned_at: string;
  active: boolean;
}

// ─── Routine Builder v2: Editor state (in-memory, not DB) ───────────────────

export interface RoutineSetDraft extends Omit<RoutineSet, 'id' | 'routine_exercise_id'> {
  id: string; // temp UUID for new sets
}

export interface RoutineExerciseDraft extends Omit<RoutineExercise, 'id' | 'block_id'> {
  id: string;
  sets: RoutineSetDraft[];
}

export interface RoutineBlockDraft extends Omit<RoutineBlock, 'id' | 'routine_day_id'> {
  id: string;
  exercises: RoutineExerciseDraft[];
}

export interface RoutineDayDraft extends Omit<RoutineDay, 'id' | 'routine_id'> {
  id: string;
  blocks: RoutineBlockDraft[];
}
