import { supabase } from '../db/supabase';
import { WhatsAppProvider } from './whatsappProvider';

export const NotificationService = {

  /**
   * Notifica al dueño del gym vía WhatsApp cuando un alumno pide una nueva rutina.
   * Best-effort: si no hay teléfono registrado o falla el envío, no lanza error.
   */
  async notifyWorkoutRequest(gymId: string, studentName: string): Promise<void> {
    try {
      const { data: gym } = await supabase
        .from('gym_subscriptions')
        .select('owner_phone, gym_name')
        .eq('gym_id', gymId)
        .single();

      if (!gym?.owner_phone) {
        console.log('[NotificationService] No hay teléfono del profesor registrado para gymId:', gymId);
        return;
      }

      await WhatsAppProvider.sendTemplateMessage({
        to: gym.owner_phone,
        templateCode: 'workout_request_v1',
        variables: {
          student_name: studentName,
          gym_name: gym.gym_name ?? 'tu gimnasio',
        },
      });

      console.log(`[NotificationService] Notificación enviada al profesor (${gym.owner_phone}) sobre solicitud de ${studentName}`);
    } catch (error) {
      // Silenciar errores — la notificación es best-effort y no debe bloquear la UX
      console.warn('[NotificationService] No se pudo enviar notificación WhatsApp:', error);
    }
  },
};
