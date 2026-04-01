import { supabase } from '../../db/supabase';
import { ClientMeasurement } from '../../../shared/types';

export const MeasurementsService = {
  async getByStudent(studentId: string): Promise<ClientMeasurement[]> {
    const { data, error } = await supabase
      .from('client_measurements')
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
    chest_cm?: number | null;
    waist_cm?: number | null;
    hips_cm?: number | null;
    bicep_l_cm?: number | null;
    bicep_r_cm?: number | null;
    thigh_l_cm?: number | null;
    thigh_r_cm?: number | null;
    calf_l_cm?: number | null;
    calf_r_cm?: number | null;
    shoulders_cm?: number | null;
    neck_cm?: number | null;
    notes?: string | null;
  }): Promise<ClientMeasurement> {
    const { data, error } = await supabase
      .from('client_measurements')
      .insert([entry])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_measurements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
