import { supabase } from '../db/supabase';
import { Shift, GymSettings, ShiftWithStudents } from '../../shared/types';

export const ShiftService = {
  // ─── GymSettings ──────────────────────────────────────────────────────────

  async getSettings(gymId: string): Promise<GymSettings | null> {
    const { data, error } = await supabase
      .from('gym_settings')
      .select('*')
      .eq('gym_id', gymId)
      .maybeSingle();

    if (error) {
      console.error('ShiftService.getSettings error:', error);
      return null;
    }
    return data ?? null;
  },

  async upsertSettings(gymId: string, updates: Partial<GymSettings>): Promise<void> {
    const { error } = await supabase
      .from('gym_settings')
      .upsert({ gym_id: gymId, ...updates, updated_at: new Date().toISOString() }, {
        onConflict: 'gym_id',
      });

    if (error) throw error;
  },

  // ─── Shifts CRUD ──────────────────────────────────────────────────────────

  async getShifts(gymId: string): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('gym_id', gymId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async createShift(shift: Omit<Shift, 'id' | 'created_at'>): Promise<Shift> {
    const { data, error } = await supabase
      .from('shifts')
      .insert(shift)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateShift(id: string, gymId: string, updates: Partial<Omit<Shift, 'id' | 'gym_id' | 'created_at'>>): Promise<void> {
    const { error } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .eq('gym_id', gymId);

    if (error) throw error;
  },

  async deleteShift(id: string, gymId: string): Promise<void> {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)
      .eq('gym_id', gymId);

    if (error) throw error;
  },

  // ─── Shift Students ───────────────────────────────────────────────────────

  async assignStudent(shiftId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('shift_students')
      .insert({ shift_id: shiftId, student_id: studentId });

    if (error) throw error;
  },

  async removeStudent(shiftId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('shift_students')
      .delete()
      .eq('shift_id', shiftId)
      .eq('student_id', studentId);

    if (error) throw error;
  },

  // ─── Shifts with enrolled students ────────────────────────────────────────

  async getShiftsWithStudents(gymId: string): Promise<ShiftWithStudents[]> {
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('gym_id', gymId)
      .order('day_of_week')
      .order('start_time');

    if (shiftsError) throw shiftsError;
    if (!shifts || shifts.length === 0) return [];

    const shiftIds = shifts.map((s: Shift) => s.id);

    const { data: assignments, error: assignError } = await supabase
      .from('shift_students')
      .select(`
        shift_id,
        student_id,
        students (
          id,
          nombre,
          apellido,
          telefono,
          status,
          cobra_cuota,
          next_due_date
        )
      `)
      .in('shift_id', shiftIds);

    if (assignError) throw assignError;

    const assignmentsByShift: Record<string, any[]> = {};
    for (const a of (assignments ?? [])) {
      if (!assignmentsByShift[a.shift_id]) assignmentsByShift[a.shift_id] = [];
      const s = a.students as any;
      if (s) {
        assignmentsByShift[a.shift_id].push({
          id: s.id,
          displayName: `${s.nombre ?? ''} ${s.apellido ?? ''}`.trim() || 'Sin nombre',
          phone: s.telefono ?? '',
          status: s.status ?? 'active',
          cobra_cuota: s.cobra_cuota ?? true,
          nextDueDate: s.next_due_date ?? null,
        });
      }
    }

    return shifts.map((shift: Shift) => ({
      ...shift,
      enrolledStudents: assignmentsByShift[shift.id] ?? [],
    }));
  },
};
