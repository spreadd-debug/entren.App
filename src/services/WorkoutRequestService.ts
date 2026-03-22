import { supabase } from '../db/supabase';
import { WorkoutUpdateRequest } from '../../shared/types';

export const WorkoutRequestService = {

  // ─── Crear solicitud (evita duplicados) ──────────────────────────────────────

  /**
   * El alumno pide una nueva rutina.
   * Si ya hay una solicitud 'pending' o 'acknowledged', no crea otra.
   */
  async createRequest(gymId: string, studentId: string): Promise<void> {
    const { data: existing } = await supabase
      .from('workout_update_requests')
      .select('id')
      .eq('student_id', studentId)
      .in('status', ['pending', 'acknowledged'])
      .limit(1);

    if (existing && existing.length > 0) return; // ya hay una pendiente

    const { error } = await supabase
      .from('workout_update_requests')
      .insert({ gym_id: gymId, student_id: studentId });

    if (error) throw error;
  },

  // ─── Consultar solicitud abierta del alumno ───────────────────────────────────

  async getOpenRequest(studentId: string): Promise<WorkoutUpdateRequest | null> {
    const { data } = await supabase
      .from('workout_update_requests')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['pending', 'acknowledged'])
      .order('created_at', { ascending: false })
      .limit(1);

    return (data?.[0] ?? null) as WorkoutUpdateRequest | null;
  },

  // ─── Acciones del profesor ────────────────────────────────────────────────────

  /** Marca la solicitud como "vista" sin haberla resuelta aún */
  async acknowledgeRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('workout_update_requests')
      .update({ status: 'acknowledged' })
      .eq('id', requestId);

    if (error) throw error;
  },

  /** Marca la solicitud como resuelta (el profe actualizó la rutina) */
  async resolveRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('workout_update_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  },

  // ─── Vista profesor: todas las solicitudes abiertas del gym ──────────────────

  async getPendingRequests(gymId: string): Promise<WorkoutUpdateRequest[]> {
    const { data } = await supabase
      .from('workout_update_requests')
      .select('*')
      .eq('gym_id', gymId)
      .in('status', ['pending', 'acknowledged'])
      .order('created_at', { ascending: false });

    return (data ?? []) as WorkoutUpdateRequest[];
  },
};
