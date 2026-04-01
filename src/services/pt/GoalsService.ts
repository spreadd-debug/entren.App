import { supabase } from '../../db/supabase';
import { ClientGoal, GoalType, GoalStatus } from '../../../shared/types';

export const GoalsService = {
  async getByStudent(studentId: string): Promise<ClientGoal[]> {
    const { data, error } = await supabase
      .from('client_goals')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async create(entry: {
    gym_id: string;
    student_id: string;
    goal_type: GoalType;
    description?: string | null;
    target_value?: string | null;
    target_date?: string | null;
  }): Promise<ClientGoal> {
    const { data, error } = await supabase
      .from('client_goals')
      .insert([entry])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: GoalStatus): Promise<ClientGoal> {
    const { data, error } = await supabase
      .from('client_goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
