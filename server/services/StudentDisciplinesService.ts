import { supabase } from '../db/supabase';
import { StudentDiscipline, StudentDisciplineRow } from '../../shared/types';

export const StudentDisciplinesService = {
  async listForStudent(studentId: string): Promise<StudentDisciplineRow[]> {
    const { data, error } = await supabase
      .from('student_disciplines')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as StudentDisciplineRow[];
  },

  async add(gymId: string, studentId: string, discipline: StudentDiscipline): Promise<StudentDisciplineRow> {
    const { data, error } = await supabase
      .from('student_disciplines')
      .upsert(
        { gym_id: gymId, student_id: studentId, discipline },
        { onConflict: 'student_id,discipline', ignoreDuplicates: false },
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as StudentDisciplineRow;
  },

  async remove(studentId: string, discipline: StudentDiscipline): Promise<void> {
    const { error } = await supabase
      .from('student_disciplines')
      .delete()
      .eq('student_id', studentId)
      .eq('discipline', discipline);

    if (error) throw error;
  },
};
