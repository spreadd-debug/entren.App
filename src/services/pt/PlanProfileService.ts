import { supabase } from '../../db/supabase';
import type { StudentPlanProfile } from '../../../shared/types';

export const PlanProfileService = {

  /** Fetch all plan profiles for a gym (direct supabase query for batch use). */
  async getAllForGym(gymId: string): Promise<StudentPlanProfile[]> {
    const { data, error } = await supabase
      .from('student_plan_profiles')
      .select('*')
      .eq('gym_id', gymId);
    if (error) throw error;
    return (data as StudentPlanProfile[]) || [];
  },

  async get(studentId: string): Promise<StudentPlanProfile | null> {
    const res = await fetch(`/api/plan-profiles/${studentId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? `Error ${res.status}`);
    }
    return await res.json();
  },

  async save(studentId: string, gymId: string, profile: Partial<StudentPlanProfile>): Promise<StudentPlanProfile> {
    const res = await fetch(`/api/plan-profiles/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, gym_id: gymId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? `Error ${res.status}`);
    }
    return await res.json();
  },

  async remove(studentId: string): Promise<void> {
    const res = await fetch(`/api/plan-profiles/${studentId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? `Error ${res.status}`);
    }
  },
};
