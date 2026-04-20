import type { TrainingObjective, GoalType, GoalTimeframe } from '../../shared/types';

export const OBJECTIVE_LABELS: Record<TrainingObjective, string> = {
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

export const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  '1_month': '1 mes',
  '2_months': '2 meses',
  '3_months': '3 meses',
  '6_months': '6 meses',
  '1_year': '1 ano',
  'no_deadline': 'Sin plazo',
};

export function mapObjectiveToGoalType(obj: TrainingObjective): GoalType {
  switch (obj) {
    case 'fat_loss': return 'lose_weight';
    case 'hypertrophy': return 'gain_muscle';
    case 'max_strength': return 'strength';
    case 'power': return 'strength';
    case 'endurance': return 'endurance';
    case 'rehab': return 'rehab';
    case 'general_health': return 'general_fitness';
    case 'recomp': return 'other';
    case 'sport_performance': return 'other';
    case 'competition_prep': return 'other';
  }
}

export function buildWizardGoalDescription(
  primary: TrainingObjective,
  numericGoal: string | null,
  timeframe: GoalTimeframe | null,
): string {
  const parts: string[] = [OBJECTIVE_LABELS[primary]];
  const goal = numericGoal?.trim();
  if (goal) parts.push(goal);
  if (timeframe && timeframe !== 'no_deadline') {
    parts.push(`Plazo: ${TIMEFRAME_LABELS[timeframe]}`);
  }
  return parts.join(' · ');
}
