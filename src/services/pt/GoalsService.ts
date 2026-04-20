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

  /**
   * Upsert del goal auto-generado por el PlanProfileWizard.
   * Busca por (student_id, source='plan_wizard') — si existe, actualiza;
   * si no, inserta. Preserva el status manual (achieved/paused/abandoned).
   */
  async upsertWizardGoal(args: {
    gym_id: string;
    student_id: string;
    goal_type: GoalType;
    description: string;
    target_date: string | null;
  }): Promise<ClientGoal> {
    const existing = await supabase
      .from('client_goals')
      .select('id, status')
      .eq('student_id', args.student_id)
      .eq('source', 'plan_wizard')
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (existing.data) {
      const { data, error } = await supabase
        .from('client_goals')
        .update({
          goal_type: args.goal_type,
          description: args.description,
          target_date: args.target_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.data.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('client_goals')
      .insert([{
        gym_id: args.gym_id,
        student_id: args.student_id,
        goal_type: args.goal_type,
        description: args.description,
        target_date: args.target_date,
        source: 'plan_wizard',
      }])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};
