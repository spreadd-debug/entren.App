import { supabase } from '../../db/supabase';
import { SessionNote, NoteCategory } from '../../../shared/types';

export const SessionNotesService = {
  async getByStudent(studentId: string): Promise<SessionNote[]> {
    const { data, error } = await supabase
      .from('session_notes')
      .select('*')
      .eq('student_id', studentId)
      .order('note_date', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async create(entry: {
    gym_id: string;
    student_id: string;
    session_id?: string | null;
    note_date?: string;
    content: string;
    category?: NoteCategory | null;
  }): Promise<SessionNote> {
    const { data, error } = await supabase
      .from('session_notes')
      .insert([entry])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('session_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
