import { supabase } from '../../db/supabase';
import { WellnessCheckIn } from '../../../shared/types';

const todayDate = (): string => new Date().toLocaleDateString('sv-SE');

export const WellnessCheckInService = {

  /** Obtener check-in de hoy para un alumno */
  async getToday(studentId: string): Promise<WellnessCheckIn | null> {
    const { data } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('student_id', studentId)
      .eq('checkin_date', todayDate())
      .limit(1)
      .single();

    return (data as WellnessCheckIn) ?? null;
  },

  /** Crear o actualizar check-in de hoy (upsert por unique constraint) */
  async saveToday(params: {
    gym_id: string;
    student_id: string;
    energy: number;
    sleep_quality: number;
    mood: number;
    soreness: number;
    notes?: string;
  }): Promise<WellnessCheckIn> {
    const { data, error } = await supabase
      .from('wellness_checkins')
      .upsert(
        {
          gym_id: params.gym_id,
          student_id: params.student_id,
          checkin_date: todayDate(),
          energy: params.energy,
          sleep_quality: params.sleep_quality,
          mood: params.mood,
          soreness: params.soreness,
          notes: params.notes?.trim() || null,
        },
        { onConflict: 'student_id,checkin_date' },
      )
      .select()
      .single();

    if (error) throw error;
    return data as WellnessCheckIn;
  },

  /** Historial de check-ins de un alumno (más recientes primero) */
  async getHistory(studentId: string, limit = 30): Promise<WellnessCheckIn[]> {
    const { data } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('student_id', studentId)
      .order('checkin_date', { ascending: false })
      .limit(limit);

    return (data ?? []) as WellnessCheckIn[];
  },

  /** Promedios de los últimos N días (para mostrar tendencias) */
  async getAverages(studentId: string, days = 7): Promise<{
    energy: number;
    sleep_quality: number;
    mood: number;
    soreness: number;
    count: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toLocaleDateString('sv-SE');

    const { data } = await supabase
      .from('wellness_checkins')
      .select('energy, sleep_quality, mood, soreness')
      .eq('student_id', studentId)
      .gte('checkin_date', sinceStr);

    const rows = data ?? [];
    if (rows.length === 0) {
      return { energy: 0, sleep_quality: 0, mood: 0, soreness: 0, count: 0 };
    }

    const sum = (key: string) =>
      rows.reduce((acc: number, r: any) => acc + (r[key] ?? 0), 0) / rows.length;

    return {
      energy: Math.round(sum('energy') * 10) / 10,
      sleep_quality: Math.round(sum('sleep_quality') * 10) / 10,
      mood: Math.round(sum('mood') * 10) / 10,
      soreness: Math.round(sum('soreness') * 10) / 10,
      count: rows.length,
    };
  },

  /** Eliminar un check-in */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('wellness_checkins')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
