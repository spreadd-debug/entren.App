import { supabase } from '../db/supabase';

const DEVICE_KEY_PREFIX = 'checkin_device_';
const CHECKIN_WINDOW_HOURS = 4;

export interface DeviceStudent {
  id: string;
  name: string;
}

export interface CheckInStudent {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  status: string;
}

export const CheckInService = {

  async findStudentByPhone(gymId: string, phone: string): Promise<CheckInStudent | null> {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 6) return null;

    const { data, error } = await supabase
      .from('students')
      .select('id, nombre, apellido, telefono, status')
      .eq('gym_id', gymId)
      .ilike('telefono', `%${cleaned}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as CheckInStudent;
  },

  async getLastCheckIn(gymId: string, studentId: string) {
    const windowStart = new Date(
      Date.now() - CHECKIN_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data } = await supabase
      .from('checkins')
      .select('id, checked_in_at')
      .eq('gym_id', gymId)
      .eq('student_id', studentId)
      .gte('checked_in_at', windowStart)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ?? null;
  },

  async registerCheckIn(gymId: string, studentId: string) {
    const recent = await this.getLastCheckIn(gymId, studentId);
    if (recent) {
      return { success: false, alreadyCheckedIn: true, checkedInAt: recent.checked_in_at as string };
    }

    const { error } = await supabase
      .from('checkins')
      .insert({ gym_id: gymId, student_id: studentId });

    if (error) throw error;
    return { success: true, alreadyCheckedIn: false, checkedInAt: null };
  },

  saveDeviceStudent(gymId: string, student: DeviceStudent) {
    localStorage.setItem(`${DEVICE_KEY_PREFIX}${gymId}`, JSON.stringify(student));
  },

  getDeviceStudent(gymId: string): DeviceStudent | null {
    try {
      const raw = localStorage.getItem(`${DEVICE_KEY_PREFIX}${gymId}`);
      return raw ? (JSON.parse(raw) as DeviceStudent) : null;
    } catch {
      return null;
    }
  },

  clearDeviceStudent(gymId: string) {
    localStorage.removeItem(`${DEVICE_KEY_PREFIX}${gymId}`);
  },

  async getStudentCheckIns(
    gymId: string,
    studentId: string,
    limit = 50
  ): Promise<Array<{ id: string; checked_in_at: string }>> {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, checked_in_at')
      .eq('gym_id', gymId)
      .eq('student_id', studentId)
      .order('checked_in_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },
};
