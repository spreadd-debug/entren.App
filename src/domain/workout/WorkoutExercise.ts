export interface WorkoutExercise {
  id: string;
  workoutPlanId: string;
  exerciseName: string;
  exerciseOrder: number;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string;
}