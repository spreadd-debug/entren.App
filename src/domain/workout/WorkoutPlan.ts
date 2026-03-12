export interface WorkoutPlan {
  id: string;
  gymId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}