import type { StudentPlanProfile } from '../../../shared/types';

export const PlanProfileService = {

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
