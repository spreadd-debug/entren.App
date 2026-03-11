import { supabase } from '../db/supabase';
import { Plan } from '../../shared/types';

const DEFAULT_GYM_ID = '11111111-1111-1111-1111-111111111111';

export const PlanService = {
  async getAll(gymId: string): Promise<Plan[]> {
    const resolvedGymId = gymId || DEFAULT_GYM_ID;

    const { data, error } = await supabase
      .from('plans')
      .select(`
        id,
        gym_id,
        nombre,
        precio,
        duracion_dias,
        clases_por_semana,
        activo,
        created_at
      `)
      .eq('gym_id', resolvedGymId)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return (data || []) as any;
  },

  async create(plan: any): Promise<Plan> {
    const payload = {
      gym_id: plan.gym_id || DEFAULT_GYM_ID,
      nombre: plan.nombre ?? plan.name ?? '',
      precio: Number(plan.precio ?? plan.price ?? 0),
      duracion_dias: Number(plan.duracion_dias ?? plan.durationDays ?? 30),
      clases_por_semana: plan.clases_por_semana ?? plan.classesPerWeek ?? null,
      activo: plan.activo ?? plan.active ?? true,
    };

    const { data, error } = await supabase
      .from('plans')
      .insert([payload])
      .select(`
        id,
        gym_id,
        nombre,
        precio,
        duracion_dias,
        clases_por_semana,
        activo,
        created_at
      `)
      .single();

    if (error) throw error;
    return data as any;
  },

  async update(id: string, updates: any): Promise<Plan> {
    const payload: Record<string, any> = {};

    if (updates.gym_id !== undefined) payload.gym_id = updates.gym_id;
    if (updates.nombre !== undefined || updates.name !== undefined) {
      payload.nombre = updates.nombre ?? updates.name;
    }
    if (updates.precio !== undefined || updates.price !== undefined) {
      payload.precio = Number(updates.precio ?? updates.price ?? 0);
    }
    if (updates.duracion_dias !== undefined || updates.durationDays !== undefined) {
      payload.duracion_dias = Number(updates.duracion_dias ?? updates.durationDays ?? 30);
    }
    if (updates.clases_por_semana !== undefined || updates.classesPerWeek !== undefined) {
      payload.clases_por_semana = updates.clases_por_semana ?? updates.classesPerWeek;
    }
    if (updates.activo !== undefined || updates.active !== undefined) {
      payload.activo = updates.activo ?? updates.active;
    }

    const { data, error } = await supabase
      .from('plans')
      .update(payload)
      .eq('id', id)
      .select(`
        id,
        gym_id,
        nombre,
        precio,
        duracion_dias,
        clases_por_semana,
        activo,
        created_at
      `)
      .single();

    if (error) throw error;
    return data as any;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};