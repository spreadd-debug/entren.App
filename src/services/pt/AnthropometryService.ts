import { supabase } from '../../db/supabase';
import { ClientAnthropometry } from '../../../shared/types';

export const AnthropometryService = {
  async getByStudent(studentId: string): Promise<ClientAnthropometry[]> {
    const { data, error } = await supabase
      .from('client_anthropometry')
      .select('*')
      .eq('student_id', studentId)
      .order('measured_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async create(entry: {
    gym_id: string;
    student_id: string;
    measured_at?: string;
    height_cm?: number | null;
    weight_kg?: number | null;
    body_fat_pct?: number | null;
    muscle_mass_kg?: number | null;
    bmi?: number | null;
    notes?: string | null;
  }): Promise<ClientAnthropometry> {
    // Auto-calculate BMI if height and weight provided
    let bmi = entry.bmi;
    if (!bmi && entry.height_cm && entry.weight_kg) {
      const heightM = entry.height_cm / 100;
      bmi = Math.round((entry.weight_kg / (heightM * heightM)) * 10) / 10;
    }

    const { data, error } = await supabase
      .from('client_anthropometry')
      .insert([{ ...entry, bmi }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_anthropometry')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
